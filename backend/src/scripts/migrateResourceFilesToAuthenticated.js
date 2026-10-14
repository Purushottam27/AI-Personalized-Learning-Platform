import "dotenv/config";
import path from "node:path";
import cloudinary from "../config/cloudinary.js";
import { connectDB, disconnectDB } from "../config/database.js";
import { Resource } from "../modules/resource/models/resource.model.js";

const APPLY_CHANGES = process.argv.includes("--apply");
const TARGET_FOLDER = "resource-migrations";
const RESOURCE_TYPES = ["raw", "image", "video"];

function isNotFound(error) {
    return error?.http_code === 404 || error?.error?.http_code === 404;
}

async function findAsset(publicId, resourceType, deliveryType) {
    try {
        return await cloudinary.api.resource(publicId, {
            resource_type: resourceType,
            type: deliveryType
        });
    } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
    }
}

async function findLegacyAsset(publicId) {
    const matches = [];
    for (const resourceType of RESOURCE_TYPES) {
        const asset = await findAsset(publicId, resourceType, "upload");
        if (asset) matches.push({ resourceType, asset });
    }

    if (matches.length > 1) {
        throw new Error(
            `Ambiguous Cloudinary asset "${publicId}": found under multiple resource types. No changes made for this resource.`
        );
    }

    return matches[0] ?? null;
}

async function findMigratedAsset(publicId, resourceType) {
    return findAsset(publicId, resourceType, "authenticated");
}

function getTargetPublicId(resource, resourceType) {
    // Raw assets commonly require their extension in the public ID.
    const extension = resourceType === "raw"
        ? path.extname(resource.storageReference ?? "")
        : "";

    return `${TARGET_FOLDER}/${resource._id}${extension}`;
}

async function migrateResource(resource) {
    const originalPublicId = resource.storageReference;

    if (!originalPublicId || typeof originalPublicId !== "string") {
        console.warn(`[SKIPPED] ${resource._id}: no usable storageReference.`);
        return;
    }

    // A resource may already have been renamed by an earlier run that failed
    // before MongoDB was updated. Check every supported resource type first.
    for (const resourceType of RESOURCE_TYPES) {
        const targetPublicId = getTargetPublicId(resource, resourceType);
        const migratedAsset = await findMigratedAsset(targetPublicId, resourceType);

        if (migratedAsset) {
            if (!APPLY_CHANGES) {
                console.log(`[DRY RUN] ${resource._id}: authenticated asset already exists; would repair MongoDB reference to ${targetPublicId}.`);
                return;
            }

            resource.storageReference = targetPublicId;
            resource.storageAccess = "AUTHENTICATED";
            resource.storageResourceType = resourceType;
            await resource.save();
            console.log(`[REPAIRED] ${resource._id}: MongoDB reference updated to authenticated asset.`);
            return;
        }
    }

    const legacy = await findLegacyAsset(originalPublicId);
    if (!legacy) {
        console.warn(`[SKIPPED] ${resource._id}: no matching upload asset found for "${originalPublicId}".`);
        return;
    }

    const { resourceType } = legacy;
    const targetPublicId = getTargetPublicId(resource, resourceType);

    // Do not overwrite an existing target asset. A collision must be reviewed.
    const targetExists = await findMigratedAsset(targetPublicId, resourceType);
    if (targetExists) {
        throw new Error(`Target collision for resource ${resource._id}: ${targetPublicId}`);
    }

    if (!APPLY_CHANGES) {
        console.log(`[DRY RUN] ${resource._id}: ${resourceType}/upload -> ${resourceType}/authenticated; "${originalPublicId}" -> "${targetPublicId}".`);
        return;
    }

    // Cloudinary changes delivery type and public ID in one rename operation.
    // MongoDB is updated only after Cloudinary confirms success.
    await cloudinary.uploader.rename(originalPublicId, targetPublicId, {
        resource_type: resourceType,
        type: "upload",
        to_type: "authenticated",
        invalidate: true
    });

    resource.storageReference = targetPublicId;
    resource.storageAccess = "AUTHENTICATED";
    resource.storageResourceType = resourceType;

    try {
        await resource.save();
        console.log(`[MIGRATED] ${resource._id}: moved to authenticated ${resourceType} delivery.`);
    } catch (error) {
        // Do not automatically rename the asset back: a rollback can itself
        // fail and create a second inconsistent state. Report exact recovery data.
        console.error(
            `[CRITICAL] Cloudinary migration succeeded but MongoDB save failed for resource ${resource._id}. ` +
            `Cloudinary asset is ${resourceType}/authenticated "${targetPublicId}". ` +
            `Repair this resource's storageReference/storageAccess/storageResourceType before retrying.`,
            error?.message
        );
        throw error;
    }
}

async function main() {
    const requiredEnv = [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET"
    ];
    const missing = requiredEnv.filter((name) => !process.env[name]);

    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    await connectDB();

    try {
        const resources = await Resource.find({
            source: "UPLOAD",
            storageReference: { $type: "string", $ne: "" },
            storageAccess: { $ne: "AUTHENTICATED" }
        }).select("+storageReference +storageAccess +storageResourceType");

        console.log(
            `${APPLY_CHANGES ? "APPLY MODE" : "DRY-RUN MODE"}: ${resources.length} resource file(s) to inspect.`
        );

        if (!APPLY_CHANGES) {
            console.log("Dry run only: no Cloudinary or MongoDB changes will be made.");
            console.log("Review every result and back up MongoDB before using --apply.");
        }

        let failures = 0;
        for (const resource of resources) {
            try {
                await migrateResource(resource);
            } catch (error) {
                failures += 1;
                console.error(`[FAILED] Resource ${resource._id}: ${error?.message ?? error}`);
            }
        }

        if (failures > 0) {
            throw new Error(`${failures} resource(s) failed migration. Review logs before retrying.`);
        }
    } finally {
        await disconnectDB();
    }
}

main().catch((error) => {
    console.error("Resource file migration failed:", error?.message ?? error);
    process.exitCode = 1;
});

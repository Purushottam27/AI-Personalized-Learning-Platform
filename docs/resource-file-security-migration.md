# Resource file delivery security migration

Resource documents are now uploaded to Cloudinary as `raw/authenticated` assets. Resource API responses use an allowlisted serializer and do not expose `storageReference` or the internal delivery metadata. The instructor-only endpoint `GET /api/v1/resources/:resourceId/file` creates a signed download URL that expires after five minutes.

## Existing uploads

Files uploaded before this change may still use Cloudinary's public `upload` delivery type. They are deliberately not treated as private automatically. The download endpoint returns `RESOURCE_FILE_MIGRATION_REQUIRED` for those records until their Cloudinary asset and MongoDB metadata are migrated.

After configuring the backend's existing MongoDB and Cloudinary environment variables, run a dry run first:

```bash
npm run migrate:resource-files
```

Review every listed resource and its detected Cloudinary resource type. The dry run does not rename Cloudinary assets or update MongoDB.

Only after reviewing the output and taking a database backup, apply the migration:

```bash
npm run migrate:resource-files -- --apply
```

The script renames each legacy asset to a unique `resource-migrations/<resourceId>` public ID, changes its delivery type to `authenticated`, and updates the corresponding MongoDB storage metadata. It attempts a Cloudinary rollback if the database update fails after a rename. Do not interrupt an apply run. Review skipped assets and investigate any `[CRITICAL]` output before enabling file access for those resources.

Cloudinary CDN invalidation may not be instantaneous. Previously public URLs could remain cached briefly after migration; review Cloudinary's invalidation behavior for the account before treating migration as a guarantee that all old links are immediately revoked.

## Verify one migrated resource

In Cloudinary Media Library, confirm the asset's delivery type is `authenticated` and resource type matches the stored `storageResourceType`. Then call the instructor-authenticated file endpoint and verify that it returns a signed URL with an expiry approximately five minutes in the future. Confirm the raw Cloudinary URL is not present in normal resource list/detail/create/update/archive/restore responses.

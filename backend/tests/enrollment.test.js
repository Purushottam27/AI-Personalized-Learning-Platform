import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Course } from "../src/modules/course/models/course.model.js";
import { Enrollment } from "../src/modules/enrollment/models/enrollment.model.js";
import { createEnrollmentService, withdrawEnrollmentService } from "../src/modules/enrollment/services/enrollment.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("active enrollment uniqueness is enforced and withdrawal permits re-enrollment", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be configured in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, process.env.DB_NAME, "TEST_DB_NAME must differ from DB_NAME");

    const learnerId = new mongoose.Types.ObjectId();
    const instructorId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    let connected = false;
    t.after(async () => {
        if (!connected) return;
        try {
            await Enrollment.deleteMany({ learnerId });
            await Course.deleteOne({ _id: courseId });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME, "Refusing to write to unexpected database");
    await Promise.all([Enrollment.init(), Course.init()]);

    await Course.create({
        _id: courseId,
        title: "Enrollment Concurrency Test",
        description: "A sufficiently long course description for the enrollment integration test.",
        createdBy: instructorId,
        domain: "Computer Science",
        category: "Testing",
        difficulty: "BEGINNER",
        objectives: ["Verify enrollment uniqueness"],
        status: "PUBLISHED",
        diagnosticPolicy: { enabled: false },
    });

    const results = await Promise.allSettled([
        createEnrollmentService(learnerId, courseId),
        createEnrollmentService(learnerId, courseId),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.equal(rejected.reason?.code, "ALREADY_ENROLLED");
    assert.equal(await Enrollment.countDocuments({ learnerId, courseId, status: "ACTIVE" }), 1);

    const firstEnrollment = results.find((result) => result.status === "fulfilled").value;
    await withdrawEnrollmentService(learnerId, firstEnrollment._id);
    const secondEnrollment = await createEnrollmentService(learnerId, courseId);
    assert.notEqual(secondEnrollment._id.toString(), firstEnrollment._id.toString());
    assert.equal(await Enrollment.countDocuments({ learnerId, courseId, status: "ACTIVE" }), 1);
});

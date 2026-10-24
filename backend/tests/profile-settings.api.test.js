import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";

import app from "../src/app.js";
import { User } from "../src/modules/identity/models/user.model.js";
import { LearnerProfile } from "../src/modules/learner/models/learnerProfile.model.js";
import { InstructorProfile } from "../src/modules/instructor/models/instructorProfile.model.js";
import { RefreshSession } from "../src/modules/identity/models/refreshSession.model.js";
import { hashToken } from "../src/shared/utils/hashToken.js";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

test("Profile and Settings HTTP API Integration", async (t) => {
    const { MONGODB_URI, TEST_DB_NAME, DB_NAME, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = process.env;
    assert.ok(MONGODB_URI, "MONGODB_URI must be set in backend/.env");
    assert.ok(TEST_DB_NAME && TEST_DB_NAME.endsWith("_test"), "TEST_DB_NAME must end with _test");
    assert.notEqual(TEST_DB_NAME, DB_NAME, "Tests must not use the application database");
    assert.ok(JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET must be set in backend/.env");
    assert.ok(JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET must be set in backend/.env");

    const learnerId = new mongoose.Types.ObjectId();
    const instructorId = new mongoose.Types.ObjectId();

    let connected = false;
    let server;
    let baseUrl;

    const initialPassword = "oldPassword123!";
    const newPassword = "newPassword456!";

    t.after(async () => {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (!connected) return;
        try {
            await LearnerProfile.deleteMany({ userId: learnerId });
            await InstructorProfile.deleteMany({ userId: instructorId });
            await RefreshSession.deleteMany({ userId: { $in: [learnerId, instructorId] } });
            await User.deleteMany({ _id: { $in: [learnerId, instructorId] } });
        } finally {
            await mongoose.disconnect();
        }
    });

    await mongoose.connect(MONGODB_URI, { dbName: TEST_DB_NAME });
    connected = true;
    assert.equal(mongoose.connection.name, TEST_DB_NAME);

    await Promise.all([
        User.init(),
        LearnerProfile.init(),
        InstructorProfile.init(),
        RefreshSession.init(),
    ]);

    await User.create([
        {
            _id: learnerId,
            name: "Initial Learner Name",
            email: `learner-${learnerId}@example.test`,
            password: initialPassword,
            role: "LEARNER",
            status: "ACTIVE",
        },
        {
            _id: instructorId,
            name: "Initial Instructor Name",
            email: `instructor-${instructorId}@example.test`,
            password: initialPassword,
            role: "INSTRUCTOR",
            status: "ACTIVE",
        },
    ]);

    // Create initial profiles for testing
    await LearnerProfile.create({
        userId: learnerId,
        interests: ["JavaScript"],
        goals: ["Learn Node.js"],
        experienceLevel: "I have a basic understanding",
        studyPreferences: {
            dailyStudyTime: "1-2 hours",
            preferredLearningFormat: ["Reading", "Interactive Learning"],
        },
        onboardingState: "COMPLETED",
    });

    await InstructorProfile.create({
        userId: instructorId,
        professionalTitle: "Assistant Professor",
        expertiseAreas: ["Computer Science"],
        bio: "Passionate educator.",
        experienceYears: 5,
        organization: "Tech Institute",
        socialLinks: {},
        onboardingState: "COMPLETED",
    });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const makeAuthHeader = (id, role) => {
        const token = jwt.sign({ sub: id.toString(), role }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    };

    await t.test("1. PATCH /api/v1/users/me updates account name", async () => {
        const res = await fetch(`${baseUrl}/api/v1/users/me`, {
            method: "PATCH",
            headers: makeAuthHeader(learnerId, "LEARNER"),
            body: JSON.stringify({ name: "Updated Learner Name" }),
        });
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.name, "Updated Learner Name");

        // Verify in database
        const dbUser = await User.findById(learnerId).lean();
        assert.equal(dbUser.name, "Updated Learner Name");
    });

    await t.test("2. PATCH /api/v1/users/me rejects empty name", async () => {
        const res = await fetch(`${baseUrl}/api/v1/users/me`, {
            method: "PATCH",
            headers: makeAuthHeader(learnerId, "LEARNER"),
            body: JSON.stringify({ name: "   " }),
        });
        const body = await res.json();
        assert.equal(res.status, 400);
        assert.equal(body.success, false);
    });

    await t.test("3. POST /api/v1/auth/change-password validates old password", async () => {
        const jti = randomUUID();
        const refreshToken = jwt.sign(
            { sub: learnerId.toString(), role: "LEARNER", jti },
            JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );
        const tokenFamily = randomUUID();
        await RefreshSession.create({
            userId: learnerId,
            tokenHash: hashToken(refreshToken),
            jti,
            tokenFamily,
            expiresAt: new Date(Date.now() + 7 * 86400000),
            revokedAt: null,
        });

        const authHeadersWithCookie = {
            ...makeAuthHeader(learnerId, "LEARNER"),
            Cookie: `refreshToken=${refreshToken}`,
        };

        // Wrong old password
        const wrongRes = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
            method: "POST",
            headers: authHeadersWithCookie,
            body: JSON.stringify({ oldPassword: "wrongPassword999", newPassword }),
        });
        const wrongBody = await wrongRes.json();
        assert.equal(wrongRes.status, 400);
        assert.equal(wrongBody.success, false);

        // Correct old password
        const correctRes = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
            method: "POST",
            headers: authHeadersWithCookie,
            body: JSON.stringify({ oldPassword: initialPassword, newPassword }),
        });
        const correctBody = await correctRes.json();
        assert.equal(correctRes.status, 200);
        assert.equal(correctBody.success, true);

        // Verify password hash changed in DB
        const dbUser = await User.findById(learnerId);
        const matchesNew = await bcrypt.compare(newPassword, dbUser.password);
        assert.equal(matchesNew, true);
    });

    await t.test("4. GET & PATCH /api/v1/learner-profile/me updates learner preferences", async () => {
        // GET profile
        const getRes = await fetch(`${baseUrl}/api/v1/learner-profile/me`, {
            method: "GET",
            headers: makeAuthHeader(learnerId, "LEARNER"),
        });
        const getBody = await getRes.json();
        assert.equal(getRes.status, 200);
        assert.equal(getBody.success, true);
        assert.equal(getBody.data.experienceLevel, "I have a basic understanding");

        // PATCH profile
        const patchRes = await fetch(`${baseUrl}/api/v1/learner-profile/me`, {
            method: "PATCH",
            headers: makeAuthHeader(learnerId, "LEARNER"),
            body: JSON.stringify({
                interests: ["TypeScript", "Distributed Systems"],
                goals: ["Become a Senior Architect"],
                experienceLevel: "I have substantial experience",
                studyPreferences: {
                    dailyStudyTime: "3-4 hours",
                    preferredLearningFormat: ["Videos", "Projects"],
                },
            }),
        });
        const patchBody = await patchRes.json();
        assert.equal(patchRes.status, 200);
        assert.equal(patchBody.success, true);
        assert.equal(patchBody.data.experienceLevel, "I have substantial experience");
        assert.deepEqual(patchBody.data.interests, ["TypeScript", "Distributed Systems"]);
        assert.equal(patchBody.data.studyPreferences.dailyStudyTime, "3-4 hours");
    });

    await t.test("5. GET & PATCH /api/v1/instructor-profile/me updates instructor details", async () => {
        // GET profile
        const getRes = await fetch(`${baseUrl}/api/v1/instructor-profile/me`, {
            method: "GET",
            headers: makeAuthHeader(instructorId, "INSTRUCTOR"),
        });
        const getBody = await getRes.json();
        assert.equal(getRes.status, 200);
        assert.equal(getBody.success, true);
        assert.equal(getBody.data.professionalTitle, "Assistant Professor");

        // PATCH profile
        const patchRes = await fetch(`${baseUrl}/api/v1/instructor-profile/me`, {
            method: "PATCH",
            headers: makeAuthHeader(instructorId, "INSTRUCTOR"),
            body: JSON.stringify({
                professionalTitle: "Principal Systems Engineer",
                organization: "Acme Cloud Corp",
                experienceYears: 12,
                expertiseAreas: ["Cloud Infrastructure", "Kubernetes"],
                bio: "Experienced cloud architect and instructor.",
                socialLinks: {
                    github: "https://github.com/cloudinstructor",
                    linkedin: "https://linkedin.com/in/cloudinstructor",
                },
            }),
        });
        const patchBody = await patchRes.json();
        assert.equal(patchRes.status, 200);
        assert.equal(patchBody.success, true);
        assert.equal(patchBody.data.professionalTitle, "Principal Systems Engineer");
        assert.equal(patchBody.data.experienceYears, 12);
        assert.equal(patchBody.data.socialLinks.github, "https://github.com/cloudinstructor");
    });

    await t.test("6. DELETE /api/v1/users/me deactivates user and revokes sessions", async () => {
        // Create an active refresh session
        const tokenFamily = randomUUID();
        const jti = randomUUID();
        await RefreshSession.create({
            userId: learnerId,
            tokenHash: hashToken("dummy-refresh-token"),
            jti,
            tokenFamily,
            expiresAt: new Date(Date.now() + 86400000),
        });

        const deleteRes = await fetch(`${baseUrl}/api/v1/users/me`, {
            method: "DELETE",
            headers: makeAuthHeader(learnerId, "LEARNER"),
        });
        const deleteBody = await deleteRes.json();
        assert.equal(deleteRes.status, 200);
        assert.equal(deleteBody.success, true);

        // Check user status in database
        const dbUser = await User.findById(learnerId).lean();
        assert.equal(dbUser.status, "DEACTIVATED");

        // Check refresh session revoked
        const activeSessions = await RefreshSession.find({
            userId: learnerId,
            revokedAt: null,
        }).lean();
        assert.equal(activeSessions.length, 0);
    });
});

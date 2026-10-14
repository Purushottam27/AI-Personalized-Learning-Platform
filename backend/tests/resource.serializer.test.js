import test from "node:test";
import assert from "node:assert/strict";
import {
    toResourceResponse,
    toResourceResponseList
} from "../src/modules/resource/serializers/resource.serializer.js";

const internalResource = {
    _id: "resource-1",
    topicId: "topic-1",
    lessonId: null,
    title: "Lecture notes",
    description: "PDF notes",
    type: "DOCUMENT",
    source: "UPLOAD",
    provider: null,
    url: null,
    storageReference: "private-folder/notes.pdf",
    storageAccess: "AUTHENTICATED",
    storageResourceType: "raw",
    fileFormat: "PDF",
    fileSize: 1024,
    order: 1,
    status: "ACTIVE",
    createdAt: new Date("2026-10-14T00:00:00.000Z"),
    updatedAt: new Date("2026-10-14T00:00:00.000Z")
};

const INTERNAL_FIELDS = [
    "storageReference",
    "storageAccess",
    "storageResourceType"
];

test("serializes only explicitly allowlisted public fields", () => {
    const response = toResourceResponse(internalResource);

    assert.equal(response.title, "Lecture notes");
    assert.equal(response.source, "UPLOAD");
    assert.equal(response._id, "resource-1");

    for (const field of INTERNAL_FIELDS) {
        assert.equal(Object.hasOwn(response, field), false, `${field} must not be exposed`);
    }

    assert.equal(Object.hasOwn(response, "unexpectedInternalField"), false);
});

test("supports Mongoose-like documents without exposing internal fields", () => {
    const response = toResourceResponse({
        toObject: () => ({ ...internalResource })
    });

    assert.equal(response._id, "resource-1");
    for (const field of INTERNAL_FIELDS) {
        assert.equal(Object.hasOwn(response, field), false, `${field} must not be exposed`);
    }
});

test("serializes every item in a resource list", () => {
    const secondResource = {
        ...internalResource,
        _id: "resource-2",
        storageReference: "another/private.pdf"
    };

    const response = toResourceResponseList([internalResource, secondResource]);

    assert.equal(response.length, 2);
    assert.equal(response[0]._id, "resource-1");
    assert.equal(response[1]._id, "resource-2");

    for (const item of response) {
        for (const field of INTERNAL_FIELDS) {
            assert.equal(Object.hasOwn(item, field), false, `${field} must not be exposed`);
        }
    }
});

test("returns nullish values unchanged", () => {
    assert.equal(toResourceResponse(null), null);
    assert.equal(toResourceResponse(undefined), undefined);
});

test("does not mutate the original resource object", () => {
    const original = { ...internalResource };
    toResourceResponse(original);

    assert.equal(original.storageReference, internalResource.storageReference);
    assert.equal(original.storageAccess, internalResource.storageAccess);
});

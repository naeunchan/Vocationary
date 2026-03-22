import {
    assignWordsToCollection,
    createCollection,
    deleteCollection,
    getCollectionMembershipMap,
    removeWordsFromCollections,
    renameCollection,
} from "@/services/collections";

describe("collections domain", () => {
    it("creates, renames, and deletes collections", () => {
        const created = createCollection(" TOEIC ", {
            id: "toeic",
            createdAt: "2026-03-23T00:00:00.000Z",
        });

        expect(created).toEqual({
            id: "toeic",
            name: "TOEIC",
            createdAt: "2026-03-23T00:00:00.000Z",
            updatedAt: "2026-03-23T00:00:00.000Z",
            wordKeys: [],
        });

        const renamed = renameCollection([created], "toeic", "  Business English  ", "2026-03-24T00:00:00.000Z");
        expect(renamed[0]).toMatchObject({
            id: "toeic",
            name: "Business English",
            updatedAt: "2026-03-24T00:00:00.000Z",
        });

        expect(deleteCollection(renamed, "toeic")).toEqual([]);
    });

    it("keeps membership single across collections", () => {
        const first = createCollection("A", { id: "a", createdAt: "2026-03-23T00:00:00.000Z" });
        const second = createCollection("B", { id: "b", createdAt: "2026-03-23T00:00:00.000Z" });

        const assignedToFirst = assignWordsToCollection([first, second], "a", ["Apple", "Berry"]);
        const movedToSecond = assignWordsToCollection(assignedToFirst, "b", [" apple "], "2026-03-24T00:00:00.000Z");

        expect(getCollectionMembershipMap(movedToSecond)).toEqual({
            apple: "b",
            berry: "a",
        });
    });

    it("removes words from collections without deleting the collections", () => {
        const collection = {
            ...createCollection("A", { id: "a", createdAt: "2026-03-23T00:00:00.000Z" }),
            wordKeys: ["apple", "berry"],
        };

        const updated = removeWordsFromCollections([collection], ["berry"], "2026-03-24T00:00:00.000Z");

        expect(updated).toEqual([
            expect.objectContaining({
                id: "a",
                wordKeys: ["apple"],
                updatedAt: "2026-03-24T00:00:00.000Z",
            }),
        ]);
    });
});

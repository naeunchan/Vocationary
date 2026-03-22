import type { CollectionMembershipMap, CollectionRecord } from "@/services/collections/types";

function normalizeWordKey(word: string): string {
    return word.trim().toLowerCase();
}

function normalizeCollectionName(name: string): string {
    return name.trim();
}

function normalizeWordKeys(wordKeys: string[]): string[] {
    return Array.from(new Set(wordKeys.map(normalizeWordKey).filter(Boolean)));
}

function createCollectionId() {
    return `collection_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneCollection(record: CollectionRecord): CollectionRecord {
    return {
        ...record,
        wordKeys: [...record.wordKeys],
    };
}

export function createCollection(
    name: string,
    options?: { id?: string; createdAt?: string; updatedAt?: string },
): CollectionRecord {
    const now = options?.createdAt ?? new Date().toISOString();
    return {
        id: options?.id ?? createCollectionId(),
        name: normalizeCollectionName(name),
        createdAt: now,
        updatedAt: options?.updatedAt ?? now,
        wordKeys: [],
    };
}

export function renameCollection(
    collections: CollectionRecord[],
    collectionId: string,
    name: string,
    updatedAt: string = new Date().toISOString(),
): CollectionRecord[] {
    const nextName = normalizeCollectionName(name);
    return collections.map((collection) =>
        collection.id === collectionId ? { ...collection, name: nextName, updatedAt } : cloneCollection(collection),
    );
}

export function deleteCollection(collections: CollectionRecord[], collectionId: string): CollectionRecord[] {
    return collections.filter((collection) => collection.id !== collectionId).map(cloneCollection);
}

export function getCollectionMembershipMap(collections: CollectionRecord[]): CollectionMembershipMap {
    const memberships: CollectionMembershipMap = {};
    for (const collection of collections) {
        for (const wordKey of normalizeWordKeys(collection.wordKeys)) {
            memberships[wordKey] = collection.id;
        }
    }
    return memberships;
}

export function assignWordsToCollection(
    collections: CollectionRecord[],
    collectionId: string,
    wordKeys: string[],
    updatedAt: string = new Date().toISOString(),
): CollectionRecord[] {
    const normalizedWordKeys = normalizeWordKeys(wordKeys);
    if (normalizedWordKeys.length === 0) {
        return collections.map(cloneCollection);
    }

    return collections.map((collection) => {
        const nextWordKeys = collection.wordKeys.filter(
            (wordKey) => !normalizedWordKeys.includes(normalizeWordKey(wordKey)),
        );
        if (collection.id !== collectionId) {
            return {
                ...collection,
                wordKeys: normalizeWordKeys(nextWordKeys),
                updatedAt: nextWordKeys.length !== collection.wordKeys.length ? updatedAt : collection.updatedAt,
            };
        }

        return {
            ...collection,
            wordKeys: normalizeWordKeys([...nextWordKeys, ...normalizedWordKeys]),
            updatedAt,
        };
    });
}

export function removeWordsFromCollections(
    collections: CollectionRecord[],
    wordKeys: string[],
    updatedAt: string = new Date().toISOString(),
): CollectionRecord[] {
    const normalizedWordKeys = normalizeWordKeys(wordKeys);
    return collections.map((collection) => {
        const nextWordKeys = collection.wordKeys.filter(
            (wordKey) => !normalizedWordKeys.includes(normalizeWordKey(wordKey)),
        );
        return {
            ...collection,
            wordKeys: normalizeWordKeys(nextWordKeys),
            updatedAt: nextWordKeys.length !== collection.wordKeys.length ? updatedAt : collection.updatedAt,
        };
    });
}

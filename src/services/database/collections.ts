import { cloneCollections } from "@/services/collections";
import type { CollectionRecord } from "@/services/collections/types";
import { ensureStateLoaded, memoryState, persistState } from "@/services/database/state";

export async function getCollectionsByUser(userId: number): Promise<CollectionRecord[]> {
    await ensureStateLoaded();
    return cloneCollections(memoryState.collectionsByUser[userId] ?? []);
}

export async function setCollectionsForUser(userId: number, collections: CollectionRecord[]) {
    await ensureStateLoaded();
    memoryState.collectionsByUser[userId] = cloneCollections(collections);
    await persistState();
}

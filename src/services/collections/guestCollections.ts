import { cloneCollections, mergeCollectionsByName } from "@/services/collections/collections";
import type { CollectionRecord } from "@/services/collections/types";

function isCollectionRecord(value: unknown): value is CollectionRecord {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const candidate = value as Partial<CollectionRecord>;
    return Boolean(
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.createdAt === "string" &&
        typeof candidate.updatedAt === "string" &&
        Array.isArray(candidate.wordKeys),
    );
}

export function parseGuestCollections(raw: string | null): CollectionRecord[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return cloneCollections(parsed.filter(isCollectionRecord));
    } catch {
        return [];
    }
}

export function mergeGuestCollections(base: CollectionRecord[], incoming: CollectionRecord[]): CollectionRecord[] {
    return mergeCollectionsByName(base, incoming);
}

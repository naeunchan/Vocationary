export { applyCollectionBatchAction } from "@/services/collections/batchActions";
export {
    assignWordsToCollection,
    cloneCollections,
    createCollection,
    deleteCollection,
    getCollectionMembershipMap,
    mergeCollectionsByName,
    removeWordsFromCollections,
    renameCollection,
} from "@/services/collections/collections";
export type {
    CollectionBatchAction,
    CollectionBatchActionInput,
    CollectionBatchActionResult,
    CollectionMembershipMap,
    CollectionRecord,
} from "@/services/collections/types";

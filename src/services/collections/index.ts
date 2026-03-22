export { applyCollectionBatchAction } from "@/services/collections/batchActions";
export {
    assignWordsToCollection,
    createCollection,
    deleteCollection,
    getCollectionMembershipMap,
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

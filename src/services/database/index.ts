export type { BackupPayload } from "@/services/database/backup";
export { exportBackup, importBackup } from "@/services/database/backup";
export { getCollectionsByUser, setCollectionsForUser } from "@/services/database/collections";
export { getFavoritesByUser, removeFavoriteForUser, upsertFavoriteForUser } from "@/services/database/favorites";
export { getPreferenceValue, setPreferenceValue } from "@/services/database/preferences";
export {
    getReviewProgressByUser,
    removeReviewProgressForUser,
    setReviewProgressForUser,
    upsertReviewProgressForUser,
} from "@/services/database/review";
export {
    clearSearchHistoryEntries,
    getSearchHistoryEntries,
    saveSearchHistoryEntries,
} from "@/services/database/searchHistory";
export {
    clearAutoLoginCredentials,
    clearSession,
    getActiveSession,
    getAutoLoginCredentials,
    saveAutoLoginCredentials,
    setGuestSession,
    setUserSession,
} from "@/services/database/session";
export type {
    EmailVerificationConsumeStatus,
    OAuthProfilePayload,
    OAuthProvider,
    PasswordResetByEmailStatus,
    UserRecord,
    UserWithPasswordRecord,
} from "@/services/database/state";
export { initializeDatabase } from "@/services/database/state";
export { hashPassword, verifyPasswordHash } from "@/services/database/users";
export {
    clearEmailVerification,
    consumeEmailVerificationCode,
    createUser,
    deleteUserAccount,
    findUserByUsername,
    isDisplayNameTaken,
    isEmailVerificationVerified,
    resetPasswordWithEmailCode,
    sendEmailVerificationCode,
    updateUserDisplayName,
    updateUserPassword,
    upsertOAuthUser,
    verifyEmailVerificationCode,
} from "@/services/database/users";

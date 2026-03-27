import { MemorizationStatus } from "@/services/favorites/types";

export type SummaryCardProps = {
    userName: string;
    counts: Record<MemorizationStatus, number>;
    reviewDashboard?: {
        dueCount: number;
        canStartReview: boolean;
        onStartReview: () => void;
    };
};

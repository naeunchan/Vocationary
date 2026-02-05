import { MemorizationStatus } from "@/services/favorites/types";

export type SummaryCardProps = {
    userName: string;
    counts: Record<MemorizationStatus, number>;
};

import type { AppError } from "@/errors/AppError";
import { WordResult } from "@/services/dictionary/types";
import type { SearchHistoryEntry } from "@/services/searchHistory/types";

export type SearchScreenProps = {
    searchTerm: string;
    onChangeSearchTerm: (text: string) => void;
    onSubmit: () => void;
    loading: boolean;
    error: AppError | null;
    aiAssistError?: AppError | null;
    result: WordResult | null;
    examplesVisible: boolean;
    onToggleExamples: () => void;
    onToggleFavorite: (word: WordResult) => void;
    isCurrentFavorite: boolean;
    onPlayPronunciation: () => void;
    pronunciationAvailable: boolean;
    recentSearches: SearchHistoryEntry[];
    onSelectRecentSearch: (entry: SearchHistoryEntry) => void;
    onClearRecentSearches: () => void;
    onRetry?: () => void;
    onRetryAiAssist?: () => void;
};

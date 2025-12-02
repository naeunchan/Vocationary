import { DictionaryMode, WordResult } from "@/services/dictionary/types";
import type { SearchHistoryEntry } from "@/services/searchHistory/types";
import type { AppError } from "@/errors/AppError";

export type SearchScreenProps = {
	searchTerm: string;
	onChangeSearchTerm: (text: string) => void;
	onSubmit: () => void;
	loading: boolean;
	error: AppError | null;
	result: WordResult | null;
	examplesVisible: boolean;
	onToggleExamples: () => void;
	onToggleFavorite: (word: WordResult) => void;
	isCurrentFavorite: boolean;
	onPlayPronunciation: () => void;
	pronunciationAvailable: boolean;
	mode: DictionaryMode;
	onModeChange: (mode: DictionaryMode) => void;
	recentSearches: SearchHistoryEntry[];
	onSelectRecentSearch: (entry: SearchHistoryEntry) => void;
	onClearRecentSearches: () => void;
	onRetry?: () => void;
};

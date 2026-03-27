import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAIProxyHealth, isBackgroundAIWarmupAllowed } from "@/api/dictionary/aiHealth";
import { normalizeAIProxyError } from "@/api/dictionary/aiProxyError";
import { generateDefinitionExamples } from "@/api/dictionary/exampleGenerator";
import { prefetchPronunciationAudio } from "@/api/dictionary/getPronunciationAudio";
import { getWordData } from "@/api/dictionary/getWordData";
import { fetchWordSuggestions } from "@/api/dictionary/wordSuggestionClient";
import { type AppError, createAppError, normalizeError } from "@/errors/AppError";
import { captureAppError } from "@/logging/logger";
import { EMPTY_SEARCH_ERROR_MESSAGE, GENERIC_ERROR_MESSAGE } from "@/screens/App/AppScreen.constants";
import { clearSearchHistoryEntries, getSearchHistoryEntries, saveSearchHistoryEntries } from "@/services/database";
import type { WordResult } from "@/services/dictionary/types";
import { applyExampleUpdates, clearPendingFlags } from "@/services/dictionary/utils/mergeExampleUpdates";
import type { FavoriteWordEntry } from "@/services/favorites/types";
import { SEARCH_HISTORY_LIMIT, type SearchHistoryEntry } from "@/services/searchHistory/types";
import { prefetchRemoteAudio } from "@/utils/audio";

const AUTOCOMPLETE_LIMIT = 6;
const AUTOCOMPLETE_MIN_QUERY_LENGTH = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 180;
const PRONUNCIATION_WARMUP_DELAY_MS = 1200;

function getLevenshteinDistance(source: string, target: string) {
    const rows = source.length + 1;
    const cols = target.length + 1;
    const distances = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

    for (let row = 0; row < rows; row += 1) {
        distances[row][0] = row;
    }
    for (let col = 0; col < cols; col += 1) {
        distances[0][col] = col;
    }

    for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
            const substitutionCost = source[row - 1] === target[col - 1] ? 0 : 1;
            distances[row][col] = Math.min(
                distances[row - 1][col] + 1,
                distances[row][col - 1] + 1,
                distances[row - 1][col - 1] + substitutionCost,
            );
        }
    }

    return distances[source.length][target.length];
}

function compareAutocompleteCandidates(query: string, left: string, right: string) {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedLeft = left.trim().toLowerCase();
    const normalizedRight = right.trim().toLowerCase();

    const leftStartsWithQuery = normalizedLeft.startsWith(normalizedQuery);
    const rightStartsWithQuery = normalizedRight.startsWith(normalizedQuery);

    if (leftStartsWithQuery !== rightStartsWithQuery) {
        return leftStartsWithQuery ? -1 : 1;
    }

    const leftDistance = getLevenshteinDistance(normalizedQuery, normalizedLeft);
    const rightDistance = getLevenshteinDistance(normalizedQuery, normalizedRight);

    if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
    }

    if (normalizedLeft.length !== normalizedRight.length) {
        return normalizedLeft.length - normalizedRight.length;
    }

    return normalizedLeft.localeCompare(normalizedRight);
}

function hasPendingExamples(result: WordResult): boolean {
    return result.meanings.some((meaning) =>
        meaning.definitions.some((definition) => Boolean(definition.pendingExample)),
    );
}

function needsExampleAssist(result: WordResult): boolean {
    return result.meanings.some((meaning) =>
        meaning.definitions.some((definition) => {
            if (definition.pendingExample) {
                return true;
            }

            return !definition.example;
        }),
    );
}

type UseSearchFlowArgs = {
    favorites: FavoriteWordEntry[];
    pronunciationAvailable: boolean;
};

type ResetSearchStateOptions = {
    resetHasSearched?: boolean;
};

type UseSearchFlowResult = {
    searchTerm: string;
    hasSearched: boolean;
    loading: boolean;
    error: AppError | null;
    aiAssistError: AppError | null;
    result: WordResult | null;
    examplesVisible: boolean;
    recentSearches: SearchHistoryEntry[];
    autocompleteSuggestions: string[];
    autocompleteLoading: boolean;
    setErrorMessage: (message: string, kind?: AppError["kind"], extras?: Partial<AppError>) => void;
    clearError: () => void;
    resetSearchState: (options?: ResetSearchStateOptions) => void;
    reloadRecentSearches: () => Promise<void>;
    onChangeSearchTerm: (text: string) => void;
    onSubmitSearch: () => void;
    onSelectRecentSearch: (entry: SearchHistoryEntry) => void;
    onSelectAutocomplete: (term: string) => void;
    onToggleExamples: () => void;
    onClearRecentSearches: () => void;
    onRetrySearch: () => void;
    onRetryAiAssist: () => void;
    onRegenerateExamples: () => void;
};

export function useSearchFlow({ favorites, pronunciationAvailable }: UseSearchFlowArgs): UseSearchFlowResult {
    const [searchTerm, setSearchTerm] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [aiAssistError, setAiAssistError] = useState<AppError | null>(null);
    const [result, setResult] = useState<WordResult | null>(null);
    const [examplesVisible, setExamplesVisible] = useState(false);
    const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>([]);
    const [autocompleteRemoteQuery, setAutocompleteRemoteQuery] = useState("");
    const [autocompleteRemoteSuggestions, setAutocompleteRemoteSuggestions] = useState<string[]>([]);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);

    const activeLookupRef = useRef(0);
    const autocompleteRemoteQueryRef = useRef("");
    const autocompleteRemoteSuggestionsRef = useRef<string[]>([]);
    const autocompleteLoadingRef = useRef(false);
    const pronunciationWarmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setErrorMessage = useCallback(
        (message: string, kind: AppError["kind"] = "UnknownError", extras?: Partial<AppError>) => {
            setError(createAppError(kind, message, extras));
        },
        [],
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const clearPronunciationWarmup = useCallback(() => {
        if (pronunciationWarmupTimeoutRef.current) {
            clearTimeout(pronunciationWarmupTimeoutRef.current);
            pronunciationWarmupTimeoutRef.current = null;
        }
    }, []);

    const persistSearchHistory = useCallback((entries: SearchHistoryEntry[]) => {
        void saveSearchHistoryEntries(entries).catch((nextError) => {
            console.warn("검색 이력을 저장하는 중 문제가 발생했어요.", nextError);
        });
    }, []);

    useEffect(() => {
        autocompleteRemoteQueryRef.current = autocompleteRemoteQuery;
        autocompleteRemoteSuggestionsRef.current = autocompleteRemoteSuggestions;
        autocompleteLoadingRef.current = autocompleteLoading;
    }, [autocompleteLoading, autocompleteRemoteQuery, autocompleteRemoteSuggestions]);

    useEffect(() => {
        return () => {
            clearPronunciationWarmup();
        };
    }, [clearPronunciationWarmup]);

    useEffect(() => {
        if (!pronunciationAvailable) {
            return;
        }

        void getAIProxyHealth();
    }, [pronunciationAvailable]);

    const clearAutocomplete = useCallback(() => {
        if (autocompleteRemoteQueryRef.current) {
            autocompleteRemoteQueryRef.current = "";
            setAutocompleteRemoteQuery("");
        }
        if (autocompleteRemoteSuggestionsRef.current.length > 0) {
            autocompleteRemoteSuggestionsRef.current = [];
            setAutocompleteRemoteSuggestions([]);
        }
        if (autocompleteLoadingRef.current) {
            autocompleteLoadingRef.current = false;
            setAutocompleteLoading(false);
        }
    }, []);

    const collectAutocompleteSuggestions = useCallback(
        (query: string, remoteSuggestions: string[] = []) => {
            const normalizedQuery = query.trim().toLowerCase();
            if (!normalizedQuery) {
                return [];
            }

            const merged: string[] = [];
            const seen = new Set<string>();
            const addSuggestion = (candidate: string) => {
                const trimmed = candidate.trim();
                if (!trimmed) {
                    return;
                }

                const normalizedCandidate = trimmed.toLowerCase();
                if (
                    normalizedCandidate === normalizedQuery ||
                    !normalizedCandidate.startsWith(normalizedQuery) ||
                    seen.has(normalizedCandidate)
                ) {
                    return;
                }

                seen.add(normalizedCandidate);
                merged.push(trimmed);
            };

            recentSearches.forEach((entry) => {
                addSuggestion(entry.term);
            });
            favorites.forEach((entry) => {
                addSuggestion(entry.word.word);
            });
            remoteSuggestions.forEach((entry) => {
                addSuggestion(entry);
            });

            return merged
                .sort((left, right) => compareAutocompleteCandidates(normalizedQuery, left, right))
                .slice(0, AUTOCOMPLETE_LIMIT);
        },
        [favorites, recentSearches],
    );

    const updateSearchHistory = useCallback(
        (term: string) => {
            const normalizedTerm = term.trim();
            if (!normalizedTerm) {
                return;
            }

            setRecentSearches((previous) => {
                const lowerTerm = normalizedTerm.toLowerCase();
                const filtered = previous.filter((entry) => entry.term.toLowerCase() !== lowerTerm);
                const entry: SearchHistoryEntry = {
                    term: normalizedTerm,
                    mode: "en-en",
                    searchedAt: new Date().toISOString(),
                };
                const next = [entry, ...filtered].slice(0, SEARCH_HISTORY_LIMIT);
                persistSearchHistory(next);
                return next;
            });
        },
        [persistSearchHistory],
    );

    const reportAiAssistError = useCallback((nextError: unknown, scope: "examples" | "tts"): AppError => {
        const appError = normalizeAIProxyError(nextError, scope);
        if (appError.kind !== "ValidationError") {
            captureAppError(appError, { scope: `ai.${scope}` });
        }
        return appError;
    }, []);

    const warmUpPronunciationAsync = useCallback(
        async (word: string, lookupId: number) => {
            if (!pronunciationAvailable) {
                return;
            }

            try {
                const uri = await prefetchPronunciationAudio(word);
                if (lookupId !== activeLookupRef.current) {
                    return;
                }
                await prefetchRemoteAudio(uri);
            } catch (nextError) {
                console.warn("발음 오디오를 미리 준비하는 중 문제가 발생했어요.", nextError);
            }
        },
        [pronunciationAvailable],
    );

    const schedulePronunciationWarmup = useCallback(
        (word: string, lookupId: number) => {
            clearPronunciationWarmup();
            if (!pronunciationAvailable) {
                return;
            }

            pronunciationWarmupTimeoutRef.current = setTimeout(() => {
                pronunciationWarmupTimeoutRef.current = null;
                void (async () => {
                    const health = await getAIProxyHealth();
                    if (!isBackgroundAIWarmupAllowed(health) || lookupId !== activeLookupRef.current) {
                        return;
                    }

                    await warmUpPronunciationAsync(word, lookupId);
                })();
            }, PRONUNCIATION_WARMUP_DELAY_MS);
        },
        [clearPronunciationWarmup, pronunciationAvailable, warmUpPronunciationAsync],
    );

    const toPendingExampleState = useCallback((base: WordResult, includeExistingExamples: boolean): WordResult => {
        return {
            ...base,
            meanings: base.meanings.map((meaning) => ({
                ...meaning,
                definitions: meaning.definitions.map((definition) => {
                    if (!includeExistingExamples && definition.example) {
                        return definition;
                    }
                    return {
                        ...definition,
                        pendingExample: true,
                    };
                }),
            })),
        };
    }, []);

    const executeSearch = useCallback(
        async (term: string) => {
            const normalizedTerm = term.trim();
            setAutocompleteEnabled(false);
            clearAutocomplete();
            clearPronunciationWarmup();
            setHasSearched(true);
            if (!normalizedTerm) {
                activeLookupRef.current += 1;
                setErrorMessage(EMPTY_SEARCH_ERROR_MESSAGE, "ValidationError", { retryable: false });
                setAiAssistError(null);
                setResult(null);
                setExamplesVisible(false);
                setLoading(false);
                return;
            }

            const lookupId = activeLookupRef.current + 1;
            activeLookupRef.current = lookupId;

            setError(null);
            setAiAssistError(null);
            setLoading(true);
            setExamplesVisible(false);

            try {
                const { base } = await getWordData(normalizedTerm);
                if (lookupId !== activeLookupRef.current) {
                    return;
                }

                updateSearchHistory(normalizedTerm);
                setResult(base);
                setLoading(false);
                schedulePronunciationWarmup(base.word, lookupId);
            } catch (nextError) {
                if (lookupId !== activeLookupRef.current) {
                    return;
                }
                setResult(null);
                setExamplesVisible(false);
                setAiAssistError(null);
                setLoading(false);
                const appError = normalizeError(nextError, GENERIC_ERROR_MESSAGE);
                setError(appError);
                if (appError.kind !== "ValidationError") {
                    captureAppError(appError, { scope: "search.execute" });
                }
            }
        },
        [
            clearAutocomplete,
            clearPronunciationWarmup,
            schedulePronunciationWarmup,
            setErrorMessage,
            updateSearchHistory,
        ],
    );

    const normalizedAutocompleteTerm = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);

    const autocompleteLocalSuggestions = useMemo(() => {
        if (!autocompleteEnabled || !normalizedAutocompleteTerm) {
            return [];
        }

        return collectAutocompleteSuggestions(normalizedAutocompleteTerm);
    }, [autocompleteEnabled, collectAutocompleteSuggestions, normalizedAutocompleteTerm]);

    const autocompleteSuggestions = useMemo(() => {
        if (!autocompleteEnabled || !normalizedAutocompleteTerm) {
            return [];
        }

        const remoteSuggestions =
            autocompleteRemoteQuery === normalizedAutocompleteTerm ? autocompleteRemoteSuggestions : [];

        return collectAutocompleteSuggestions(normalizedAutocompleteTerm, remoteSuggestions);
    }, [
        autocompleteEnabled,
        autocompleteRemoteQuery,
        autocompleteRemoteSuggestions,
        collectAutocompleteSuggestions,
        normalizedAutocompleteTerm,
    ]);

    const reloadRecentSearches = useCallback(async () => {
        const history = await getSearchHistoryEntries();
        setRecentSearches(history);
    }, []);

    useEffect(() => {
        let isMounted = true;

        getSearchHistoryEntries()
            .then((history) => {
                if (isMounted) {
                    setRecentSearches(history);
                }
            })
            .catch((nextError) => {
                console.warn("검색 이력을 불러오는 중 문제가 발생했어요.", nextError);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!autocompleteEnabled) {
            clearAutocomplete();
            return;
        }

        if (!normalizedAutocompleteTerm) {
            clearAutocomplete();
            return;
        }

        if (
            normalizedAutocompleteTerm.length < AUTOCOMPLETE_MIN_QUERY_LENGTH ||
            autocompleteLocalSuggestions.length >= AUTOCOMPLETE_LIMIT
        ) {
            clearAutocomplete();
            return;
        }

        let active = true;
        autocompleteLoadingRef.current = true;
        setAutocompleteLoading(true);

        const timeoutId = setTimeout(() => {
            void fetchWordSuggestions(normalizedAutocompleteTerm, AUTOCOMPLETE_LIMIT)
                .then((remoteSuggestions) => {
                    if (!active) {
                        return;
                    }
                    autocompleteRemoteQueryRef.current = normalizedAutocompleteTerm;
                    autocompleteRemoteSuggestionsRef.current = remoteSuggestions;
                    autocompleteLoadingRef.current = false;
                    setAutocompleteRemoteQuery(normalizedAutocompleteTerm);
                    setAutocompleteRemoteSuggestions(remoteSuggestions);
                    setAutocompleteLoading(false);
                })
                .catch(() => {
                    if (!active) {
                        return;
                    }
                    autocompleteLoadingRef.current = false;
                    setAutocompleteLoading(false);
                });
        }, AUTOCOMPLETE_DEBOUNCE_MS);

        return () => {
            active = false;
            clearTimeout(timeoutId);
        };
    }, [autocompleteEnabled, autocompleteLocalSuggestions.length, clearAutocomplete, normalizedAutocompleteTerm]);

    const refreshExamplesAsync = useCallback(
        async ({ forceFresh, includeExistingExamples }: { forceFresh: boolean; includeExistingExamples: boolean }) => {
            if (!result) {
                return;
            }

            const lookupId = activeLookupRef.current;
            const retryBase = toPendingExampleState(result, includeExistingExamples);
            setAiAssistError(null);
            setResult((previous) => {
                if (!previous || previous.word !== retryBase.word) {
                    return previous;
                }
                return retryBase;
            });

            try {
                const updates = await generateDefinitionExamples(retryBase.word, retryBase.meanings, {
                    forceFresh,
                });
                if (lookupId !== activeLookupRef.current) {
                    return;
                }
                setAiAssistError(null);
                setResult((previous) => {
                    if (!previous || previous.word !== retryBase.word) {
                        return previous;
                    }
                    if (updates.length === 0) {
                        return clearPendingFlags(previous);
                    }
                    return applyExampleUpdates(previous, updates);
                });
            } catch (nextError) {
                if (lookupId !== activeLookupRef.current) {
                    return;
                }
                const appError = reportAiAssistError(nextError, "examples");
                setAiAssistError(appError);
                setResult((previous) => (previous ? clearPendingFlags(previous) : previous));
            }
        },
        [reportAiAssistError, result, toPendingExampleState],
    );

    const resetSearchState = useCallback(
        (options: ResetSearchStateOptions = {}) => {
            activeLookupRef.current += 1;
            clearAutocomplete();
            clearPronunciationWarmup();
            setSearchTerm("");
            setResult(null);
            setExamplesVisible(false);
            setError(null);
            setAiAssistError(null);
            setLoading(false);
            if (options.resetHasSearched) {
                setHasSearched(false);
            }
        },
        [clearAutocomplete],
    );

    const onClearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        void clearSearchHistoryEntries().catch((nextError) => {
            console.warn("검색 이력을 삭제하는 중 문제가 발생했어요.", nextError);
        });
    }, []);

    const onChangeSearchTerm = useCallback(
        (text: string) => {
            setAutocompleteEnabled(true);
            setSearchTerm(text);

            const trimmed = text.trim();
            if (!trimmed) {
                activeLookupRef.current += 1;
                clearAutocomplete();
                clearPronunciationWarmup();
                setHasSearched(false);
                setError(null);
                setAiAssistError(null);
                setLoading(false);
                setExamplesVisible(false);
                return;
            }

            activeLookupRef.current += 1;
            clearPronunciationWarmup();
            setAiAssistError(null);
            setLoading(false);
        },
        [clearAutocomplete, clearPronunciationWarmup],
    );

    const onSubmitSearch = useCallback(() => {
        void executeSearch(searchTerm);
    }, [executeSearch, searchTerm]);

    const onSelectRecentSearch = useCallback(
        (entry: SearchHistoryEntry) => {
            const normalizedTerm = entry.term.trim();
            if (!normalizedTerm) {
                return;
            }
            setAutocompleteEnabled(false);
            clearAutocomplete();
            setSearchTerm(normalizedTerm);
            void executeSearch(normalizedTerm);
        },
        [clearAutocomplete, executeSearch],
    );

    const onSelectAutocomplete = useCallback(
        (term: string) => {
            const normalizedTerm = term.trim();
            if (!normalizedTerm) {
                return;
            }
            setAutocompleteEnabled(false);
            clearAutocomplete();
            setSearchTerm(normalizedTerm);
            void executeSearch(normalizedTerm);
        },
        [clearAutocomplete, executeSearch],
    );

    const onToggleExamples = useCallback(() => {
        const shouldLoadExamples =
            result !== null && !hasPendingExamples(result) && needsExampleAssist(result) && !aiAssistError;

        setExamplesVisible((previous) => {
            const next = !previous;
            if (next && shouldLoadExamples) {
                void refreshExamplesAsync({
                    forceFresh: false,
                    includeExistingExamples: false,
                });
            }
            return next;
        });
    }, [aiAssistError, refreshExamplesAsync, result]);

    const onRetryAiAssist = useCallback(() => {
        void refreshExamplesAsync({
            forceFresh: false,
            includeExistingExamples: false,
        });
    }, [refreshExamplesAsync]);

    const onRegenerateExamples = useCallback(() => {
        void refreshExamplesAsync({
            forceFresh: true,
            includeExistingExamples: true,
        });
    }, [refreshExamplesAsync]);

    return {
        searchTerm,
        hasSearched,
        loading,
        error,
        aiAssistError,
        result,
        examplesVisible,
        recentSearches,
        autocompleteSuggestions,
        autocompleteLoading,
        setErrorMessage,
        clearError,
        resetSearchState,
        reloadRecentSearches,
        onChangeSearchTerm,
        onSubmitSearch,
        onSelectRecentSearch,
        onSelectAutocomplete,
        onToggleExamples,
        onClearRecentSearches,
        onRetrySearch: onSubmitSearch,
        onRetryAiAssist,
        onRegenerateExamples,
    };
}

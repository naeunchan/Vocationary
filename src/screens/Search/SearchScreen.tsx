import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TextField } from "@/components/TextField";
import { SearchBar } from "@/screens/Search/components/SearchBar";
import { SearchResults } from "@/screens/Search/components/SearchResults";
import { createSearchScreenStyles } from "@/screens/Search/SearchScreen.styles";
import { SearchScreenProps } from "@/screens/Search/SearchScreen.types";
import { t } from "@/shared/i18n";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function SearchScreen({
    searchTerm,
    hasSearched,
    onChangeSearchTerm,
    onSubmit,
    loading,
    error,
    aiAssistError,
    result,
    examplesVisible,
    onToggleExamples,
    onToggleFavorite,
    isCurrentFavorite,
    onPlayPronunciation,
    pronunciationAvailable,
    autocompleteSuggestions,
    autocompleteLoading,
    onSelectAutocomplete,
    recentSearches,
    onSelectRecentSearch,
    onClearRecentSearches,
    onRetry,
    onRetryAiAssist,
    onRegenerateExamples,
    collectionsEnabled,
    collections,
    currentCollectionId,
    onAssignCurrentWordToCollection,
    onCreateCollectionForCurrentWord,
}: SearchScreenProps) {
    const styles = useThemedStyles(createSearchScreenStyles);
    const { theme } = useAppAppearance();
    const [collectionName, setCollectionName] = useState("");
    const showPlaceholder = !hasSearched && !loading && !error && !result;
    const showEmptyState = hasSearched && !loading && !error && !result;
    const showAutocomplete = autocompleteSuggestions.length > 0 || autocompleteLoading;
    const hasRecentSearches = recentSearches.length > 0 && !showAutocomplete;
    const currentCollection = useMemo(
        () => collections.find((collection) => collection.id === currentCollectionId) ?? null,
        [collections, currentCollectionId],
    );
    const showCollectionCard = collectionsEnabled && Boolean(result) && isCurrentFavorite;

    const handleAssignCollection = useCallback(
        (collectionId: string | null) => {
            void onAssignCurrentWordToCollection(collectionId).catch((error: unknown) => {
                const message = error instanceof Error ? error.message : "컬렉션을 저장하지 못했어요.";
                Alert.alert("컬렉션 저장 실패", message);
            });
        },
        [onAssignCurrentWordToCollection],
    );

    const handleCreateCollection = useCallback(() => {
        const nextName = collectionName.trim();
        if (!nextName) {
            return;
        }

        void onCreateCollectionForCurrentWord(nextName)
            .then(() => {
                setCollectionName("");
            })
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : "컬렉션을 만들지 못했어요.";
                Alert.alert("컬렉션 생성 실패", message);
            });
    }, [collectionName, onCreateCollectionForCurrentWord]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {!pronunciationAvailable ? (
                    <View style={styles.aiNotice}>
                        <Text style={styles.aiNoticeTitle}>{t("search.aiNotice.title")}</Text>
                        <Text style={styles.aiNoticeText}>{t("search.aiNotice.body")}</Text>
                    </View>
                ) : null}

                <SearchBar
                    value={searchTerm}
                    onChangeText={onChangeSearchTerm}
                    onSubmit={onSubmit}
                    suggestions={autocompleteSuggestions}
                    suggestionsLoading={autocompleteLoading}
                    onSelectSuggestion={onSelectAutocomplete}
                />

                <View style={styles.resultsWrapper}>
                    {showPlaceholder ? (
                        <View style={styles.placeholderCard}>
                            <Ionicons name="sparkles-outline" size={20} color={theme.accent} />
                            <Text style={styles.placeholderTitle}>{t("search.placeholder.title")}</Text>
                            <Text style={styles.placeholderSubtitle}>{t("search.placeholder.body")}</Text>
                        </View>
                    ) : showEmptyState ? (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorTitle}>{t("search.empty.title")}</Text>
                            <Text style={styles.errorDescription}>{t("search.empty.body")}</Text>
                        </View>
                    ) : (
                        <SearchResults
                            loading={loading}
                            error={error}
                            aiAssistError={aiAssistError}
                            result={result}
                            examplesVisible={examplesVisible}
                            onToggleExamples={onToggleExamples}
                            isFavorite={isCurrentFavorite}
                            onToggleFavorite={onToggleFavorite}
                            onPlayPronunciation={onPlayPronunciation}
                            pronunciationAvailable={pronunciationAvailable}
                            onRetry={onRetry ?? onSubmit}
                            onRetryAiAssist={onRetryAiAssist}
                            onRegenerateExamples={onRegenerateExamples}
                        />
                    )}
                </View>

                {showCollectionCard ? (
                    <View style={styles.collectionCard}>
                        <View style={styles.collectionHeader}>
                            <Text style={styles.sectionLabel}>컬렉션</Text>
                            <Text style={styles.collectionDescription}>
                                {currentCollection
                                    ? `"${currentCollection.name}" 컬렉션에 담겨 있어요.`
                                    : "아직 컬렉션이 지정되지 않았어요."}
                            </Text>
                        </View>

                        <View style={styles.collectionChipRow}>
                            <Pressable
                                style={[
                                    styles.collectionChip,
                                    currentCollectionId == null && styles.collectionChipActive,
                                ]}
                                onPress={() => {
                                    handleAssignCollection(null);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="컬렉션 미지정"
                            >
                                <Text
                                    style={[
                                        styles.collectionChipText,
                                        currentCollectionId == null && styles.collectionChipTextActive,
                                    ]}
                                >
                                    미지정
                                </Text>
                            </Pressable>
                            {collections.map((collection) => {
                                const isSelected = collection.id === currentCollectionId;
                                return (
                                    <Pressable
                                        key={collection.id}
                                        style={[styles.collectionChip, isSelected && styles.collectionChipActive]}
                                        onPress={() => {
                                            handleAssignCollection(collection.id);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${collection.name} 컬렉션 선택`}
                                    >
                                        <Text
                                            style={[
                                                styles.collectionChipText,
                                                isSelected && styles.collectionChipTextActive,
                                            ]}
                                        >
                                            {collection.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <TextField
                            value={collectionName}
                            onChangeText={setCollectionName}
                            placeholder="새 컬렉션 이름"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <TouchableOpacity
                            style={[
                                styles.collectionActionButton,
                                !collectionName.trim() && styles.collectionActionButtonDisabled,
                            ]}
                            onPress={handleCreateCollection}
                            disabled={!collectionName.trim()}
                            accessibilityRole="button"
                            accessibilityLabel="새 컬렉션 만들고 현재 단어에 담기"
                        >
                            <Text style={styles.collectionActionButtonText}>새 컬렉션 만들고 담기</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {hasRecentSearches && (
                    <View style={styles.historyCard}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.sectionLabel}>최근 검색</Text>
                            <TouchableOpacity
                                style={styles.historyClearButton}
                                onPress={onClearRecentSearches}
                                accessibilityRole="button"
                                accessibilityLabel="최근 검색 전체 삭제"
                            >
                                <Text style={styles.historyClearText}>전체 지우기</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.historyList}>
                            {recentSearches.map((entry) => (
                                <TouchableOpacity
                                    key={`${entry.term}-${entry.searchedAt}`}
                                    style={styles.historyItem}
                                    onPress={() => {
                                        onSelectRecentSearch(entry);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${entry.term} 검색어로 이동`}
                                >
                                    <View style={styles.historyIconWrapper}>
                                        <Ionicons name="time-outline" size={16} color={theme.textPrimary} />
                                    </View>
                                    <View style={styles.historyTexts}>
                                        <Text style={styles.historyWord}>{entry.term}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SearchBar } from "@/screens/Search/components/SearchBar";
import { SearchResults } from "@/screens/Search/components/SearchResults";
import { createSearchScreenStyles } from "@/screens/Search/SearchScreen.styles";
import { SearchScreenProps } from "@/screens/Search/SearchScreen.types";
import { t } from "@/shared/i18n";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function SearchScreen({
    searchTerm,
    onChangeSearchTerm,
    onSubmit,
    loading,
    error,
    result,
    examplesVisible,
    onToggleExamples,
    onToggleFavorite,
    isCurrentFavorite,
    onPlayPronunciation,
    pronunciationAvailable,
    recentSearches,
    onSelectRecentSearch,
    onClearRecentSearches,
    onRetry,
}: SearchScreenProps) {
    const styles = useThemedStyles(createSearchScreenStyles);
    const { theme } = useAppAppearance();
    const showPlaceholder = !loading && !error && !result;
    const hasRecentSearches = recentSearches.length > 0;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {!pronunciationAvailable ? (
                    <View style={styles.aiNotice}>
                        <Text style={styles.aiNoticeTitle}>{t("search.aiNotice.title")}</Text>
                        <Text style={styles.aiNoticeText}>{t("search.aiNotice.body")}</Text>
                    </View>
                ) : null}

                <SearchBar value={searchTerm} onChangeText={onChangeSearchTerm} onSubmit={onSubmit} />

                <View style={styles.resultsWrapper}>
                    {showPlaceholder ? (
                        <View style={styles.placeholderCard}>
                            <Ionicons name="sparkles-outline" size={20} color={theme.accent} />
                            <Text style={styles.placeholderTitle}>검색 결과가 여기에 표시됩니다</Text>
                            <Text style={styles.placeholderSubtitle}>
                                검색할 단어를 입력하고 검색 버튼을 눌러주세요.
                            </Text>
                        </View>
                    ) : (
                        <SearchResults
                            loading={loading}
                            error={error}
                            result={result}
                            examplesVisible={examplesVisible}
                            onToggleExamples={onToggleExamples}
                            isFavorite={isCurrentFavorite}
                            onToggleFavorite={onToggleFavorite}
                            onPlayPronunciation={onPlayPronunciation}
                            pronunciationAvailable={pronunciationAvailable}
                            onRetry={onRetry ?? onSubmit}
                        />
                    )}
                </View>

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

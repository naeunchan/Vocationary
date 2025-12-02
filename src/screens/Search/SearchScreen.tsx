import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchBar } from "@/screens/Search/components/SearchBar";
import { SearchResults } from "@/screens/Search/components/SearchResults";
import { SearchScreenProps } from "@/screens/Search/SearchScreen.types";
import { createSearchScreenStyles } from "@/screens/Search/SearchScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { t } from "@/shared/i18n";

const MODE_BUTTONS = [
	{ label: "영영사전", value: "en-en", disabled: false },
	{ label: "영한사전", value: "en-ko", disabled: true },
] as const;

const MODE_LABELS: Record<string, string> = {
	"en-en": "영영사전",
	"en-ko": "영한사전",
};

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
	mode,
	onModeChange,
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
				<View style={styles.modeSection}>
					<Text style={styles.sectionLabel}>사전 모드</Text>
					<View style={styles.modeButtons}>
						{MODE_BUTTONS.map((option) => {
							const isActive = option.value === mode;
							return (
								<TouchableOpacity
									key={option.value}
									style={[styles.modeButton, isActive && styles.modeButtonActive, option.disabled && styles.modeButtonDisabled]}
									activeOpacity={option.disabled ? 1 : 0.85}
									disabled={option.disabled}
									accessibilityRole="button"
									accessibilityState={{ selected: isActive, disabled: option.disabled }}
									accessibilityLabel={`${option.label}${option.disabled ? " (준비중)" : ""}`}
									onPress={() => {
										if (!isActive && !option.disabled) {
											onModeChange(option.value);
										}
									}}
								>
									<Text style={[styles.modeButtonLabel, isActive && styles.modeButtonLabelActive, option.disabled && styles.modeButtonLabelDisabled]}>
										{option.disabled ? `${option.label} (준비중)` : option.label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

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
							<Text style={styles.placeholderSubtitle}>검색할 단어를 입력하고 검색 버튼을 눌러주세요.</Text>
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
									onPress={() => onSelectRecentSearch(entry)}
									accessibilityRole="button"
									accessibilityLabel={`${entry.term} 검색어로 이동`}
								>
									<View style={styles.historyIconWrapper}>
										<Ionicons name="time-outline" size={16} color={theme.textPrimary} />
									</View>
									<View style={styles.historyTexts}>
										<Text style={styles.historyWord}>{entry.term}</Text>
										<Text style={styles.historyMeta}>{MODE_LABELS[entry.mode] ?? "사전"}</Text>
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

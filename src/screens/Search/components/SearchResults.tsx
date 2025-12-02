import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { WordResult } from "@/services/dictionary/types";
import { WordResultCard } from "@/services/dictionary/components/WordResultCard";
import { createSearchScreenStyles } from "@/screens/Search/SearchScreen.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";
import type { AppError } from "@/errors/AppError";
import { shouldRetry } from "@/errors/AppError";

type SearchResultsProps = {
	loading: boolean;
	error: AppError | null;
	result: WordResult | null;
	examplesVisible: boolean;
	onToggleExamples: () => void;
	isFavorite: boolean;
	onToggleFavorite: (word: WordResult) => void;
	onPlayPronunciation: () => void;
	pronunciationAvailable: boolean;
	onRetry?: () => void;
};

export function SearchResults({
	loading,
	error,
	result,
	examplesVisible,
	onToggleExamples,
	isFavorite,
	onToggleFavorite,
	onPlayPronunciation,
	pronunciationAvailable,
	onRetry,
}: SearchResultsProps) {
	const styles = useThemedStyles(createSearchScreenStyles);
	if (loading) {
		return (
			<View style={styles.centered} testID="search-results-loading">
				<ActivityIndicator size="small" color="#2f80ed" />
			</View>
		);
	}

	if (error) {
		const canRetry = shouldRetry(error) && typeof onRetry === "function";
		return (
			<View style={styles.errorCard} testID="search-results-error">
				<Text style={styles.errorTitle}>잠깐 문제가 생겼어요</Text>
				<Text style={styles.errorDescription}>{error.message}</Text>
				{canRetry ? (
					<TouchableOpacity
						style={styles.retryButton}
						onPress={onRetry}
						accessibilityRole="button"
						accessibilityLabel="다시 시도하기"
					>
						<Text style={styles.retryButtonLabel}>다시 시도하기</Text>
					</TouchableOpacity>
				) : null}
			</View>
		);
	}

	if (!result) {
		return null;
	}

	return (
		<WordResultCard
			result={result}
			onToggleFavorite={onToggleFavorite}
			onPlayPronunciation={onPlayPronunciation}
			pronunciationAvailable={pronunciationAvailable}
			examplesVisible={examplesVisible}
			onToggleExamples={onToggleExamples}
			isFavorite={isFavorite}
		/>
	);
}

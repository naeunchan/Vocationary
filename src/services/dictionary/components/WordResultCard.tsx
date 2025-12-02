import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { WordResultCardProps } from "@/services/dictionary/types/WordResultCard";
import { createWordResultCardStyles } from "@/services/dictionary/styles/WordResultCard.styles";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { useAppAppearance } from "@/theme/AppearanceContext";

export function WordResultCard({ result, onToggleFavorite, onPlayPronunciation, isFavorite, examplesVisible, onToggleExamples, pronunciationAvailable }: WordResultCardProps) {
	const styles = useThemedStyles(createWordResultCardStyles);
	const { theme } = useAppAppearance();
	const canPlayAudio = pronunciationAvailable && Boolean(result.word?.trim());
	const hasPendingExamples = result.meanings.some((meaning) => meaning.definitions.some((definition) => Boolean(definition.pendingExample)));
	const hasExamples = result.meanings.some((meaning) => meaning.definitions.some((definition) => Boolean(definition.example)));
	const noExamplesAvailable = !hasPendingExamples && !hasExamples;
	const toggleButtonLabel = hasPendingExamples ? "예문을 불러오는 중..." : examplesVisible ? "예문 숨기기" : "예문 보기";
	return (
		<View style={styles.resultCard}>
			<View style={styles.resultHeader}>
				<View>
					<Text style={styles.cardLabel}>검색 결과</Text>
					<Text style={styles.wordText}>{result.word}</Text>
					{result.phonetic ? <Text style={styles.phoneticText}>{result.phonetic}</Text> : null}
				</View>
				<View style={styles.resultActions}>
					{canPlayAudio ? (
						<TouchableOpacity onPress={onPlayPronunciation} style={styles.iconButton}>
							<Ionicons name="volume-high-outline" size={20} color={theme.textPrimary} />
						</TouchableOpacity>
					) : null}
					<TouchableOpacity onPress={() => onToggleFavorite(result)} style={styles.iconButton}>
						<Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? "#facc15" : theme.textPrimary} />
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView style={styles.meaningScroll} contentContainerStyle={styles.meaningContent}>
				{result.meanings.map((meaning, index) => (
					<View key={`${meaning.partOfSpeech}-${index}`} style={styles.meaningBlock}>
						<View style={styles.meaningHeaderRow}>
							<Text style={styles.partOfSpeech}>{meaning.partOfSpeech ?? `의미 ${index + 1}`}</Text>
							<View style={styles.meaningDivider} />
						</View>
						{meaning.definitions.map((definition, defIndex) => (
							<View key={defIndex} style={styles.definitionRow}>
								<View style={styles.definitionIndex}>
									<Text style={styles.definitionIndexText}>{defIndex + 1}</Text>
								</View>
								<View style={styles.definitionBody}>
									<Text style={styles.definitionText}>{definition.definition}</Text>
									{definition.pendingTranslation && definition.originalDefinition ? <Text style={styles.definitionHint}>({definition.originalDefinition})</Text> : null}
									{!definition.pendingTranslation && definition.originalDefinition && definition.definition !== definition.originalDefinition ? (
										<Text style={styles.definitionHint}>{definition.originalDefinition}</Text>
									) : null}
									{examplesVisible ? (
										definition.pendingExample ? (
											<View style={styles.exampleSkeleton} />
										) : definition.example ? (
											<Text style={styles.exampleText}>ex) {definition.example}</Text>
										) : null
									) : null}
								</View>
							</View>
						))}
					</View>
				))}
				{examplesVisible && noExamplesAvailable ? <Text style={styles.noExampleText}>예문을 찾지 못했어요.</Text> : null}
			</ScrollView>
			<TouchableOpacity
				style={[styles.exampleToggleButton, hasPendingExamples ? styles.exampleToggleButtonDisabled : null]}
				onPress={onToggleExamples}
				disabled={hasPendingExamples}
				activeOpacity={hasPendingExamples ? 1 : 0.9}
			>
				<Ionicons name={examplesVisible ? "chevron-up-outline" : "book-outline"} size={18} color={hasPendingExamples ? theme.textMuted : theme.accentContrast} />
				<Text style={[styles.exampleToggleButtonText, hasPendingExamples ? styles.exampleToggleButtonTextDisabled : null]}>{toggleButtonLabel}</Text>
			</TouchableOpacity>
		</View>
	);
}

import React, { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { HomeScreenProps } from "@/screens/Home/types/HomeScreen.types";
import { createHomeScreenStyles } from "@/screens/Home/styles/HomeScreen.styles";
import { HomeHeader } from "@/screens/Home/components/HomeHeader";
import { SummaryCard } from "@/screens/Home/components/SummaryCard";
import { FavoritesList } from "@/screens/Home/components/FavoritesList";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function HomeScreen({ favorites, mode, onMoveToStatus, userName, onPlayWordAudio, pronunciationAvailable }: HomeScreenProps) {
	const styles = useThemedStyles(createHomeScreenStyles);
	const { toMemorizeEntries, counts } = useMemo(() => {
		const summary = {
			toMemorize: 0,
			review: 0,
			mastered: 0,
		};
		const memorizeList: typeof favorites = [];

		for (const entry of favorites) {
			if (entry.status === "toMemorize") {
				memorizeList.push(entry);
				summary.toMemorize += 1;
			} else if (entry.status === "review") {
				summary.review += 1;
			} else if (entry.status === "mastered") {
				summary.mastered += 1;
			}
		}

		return { toMemorizeEntries: memorizeList, counts: summary };
	}, [favorites]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				<HomeHeader userName={userName} />
				<SummaryCard userName={userName} mode={mode} counts={counts} />
				<FavoritesList
					entries={toMemorizeEntries}
					emptyMessage="외울 단어장에 저장된 단어가 없어요."
					onMoveToReview={(word) => onMoveToStatus(word, "review")}
					onPlayAudio={onPlayWordAudio}
					pronunciationAvailable={pronunciationAvailable}
				/>
			</ScrollView>
		</SafeAreaView>
	);
}

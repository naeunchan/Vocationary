import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FavoritesFlashcard } from "@/screens/Favorites/components/FavoritesFlashcard";
import { createFavoritesScreenStyles } from "@/screens/Favorites/FavoritesScreen.styles";
import { FavoritesScreenProps } from "@/screens/Favorites/FavoritesScreen.types";
import { MEMORIZATION_STATUS_ORDER, MEMORIZATION_STATUSES, MemorizationStatus } from "@/services/favorites/types";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function FavoritesScreen({
    favorites,
    onUpdateStatus,
    onRemoveFavorite,
    onPlayAudio,
    pronunciationAvailable,
}: FavoritesScreenProps) {
    const styles = useThemedStyles(createFavoritesScreenStyles);
    const [activeStatus, setActiveStatus] = useState<MemorizationStatus>("toMemorize");

    const filteredEntries = useMemo(
        () => favorites.filter((entry) => entry.status === activeStatus),
        [favorites, activeStatus],
    );
    const emptyMessage = useMemo(() => `${MEMORIZATION_STATUSES[activeStatus]}에 단어가 없어요.`, [activeStatus]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>내 단어장</Text>
                    <Text style={styles.heroSubtitle}>단어를 단계별로 복습하며 기억을 단단히 다져봐요.</Text>
                </View>

                <View style={styles.segmentCard}>
                    <View style={styles.segmentedControl}>
                        {MEMORIZATION_STATUS_ORDER.map((status) => {
                            const label = MEMORIZATION_STATUSES[status];
                            const isActive = status === activeStatus;
                            return (
                                <Pressable
                                    key={status}
                                    style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                                    onPress={() => {
                                        setActiveStatus(status);
                                    }}
                                >
                                    <Text
                                        style={[styles.segmentButtonText, isActive && styles.segmentButtonTextActive]}
                                    >
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {filteredEntries.length > 0 ? (
                    <FavoritesFlashcard
                        entries={filteredEntries}
                        status={activeStatus}
                        onMoveToStatus={onUpdateStatus}
                        onRemoveFavorite={onRemoveFavorite}
                        onPlayAudio={onPlayAudio}
                        pronunciationAvailable={pronunciationAvailable}
                    />
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>{emptyMessage}</Text>
                        <Text style={styles.emptySubtitle}>
                            검색 화면에서 단어를 저장하면 이곳에서 복습할 수 있어요.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TextField } from "@/components/TextField";
import { FavoritesFlashcard } from "@/screens/Favorites/components/FavoritesFlashcard";
import { createFavoritesScreenStyles } from "@/screens/Favorites/FavoritesScreen.styles";
import { FavoritesScreenProps } from "@/screens/Favorites/FavoritesScreen.types";
import { StudyModeScreen } from "@/screens/StudyMode/StudyModeScreen";
import { MEMORIZATION_STATUS_ORDER, MEMORIZATION_STATUSES, MemorizationStatus } from "@/services/favorites/types";
import { createReviewProgressKey } from "@/services/review";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function FavoritesScreen({
    favorites,
    onUpdateStatus,
    onRemoveFavorite,
    onPlayAudio,
    pronunciationAvailable,
    collectionsEnabled,
    collections,
    collectionMemberships,
    onCreateCollection,
    onRenameCollection,
    onDeleteCollection,
    onAssignWordToCollection,
    studyEnabled,
    studyAvailable,
    studySession,
    onStartStudyMode,
    onRetryStudyMode,
    onRegenerateStudyMode,
    onCloseStudyMode,
    onSelectStudyChoice,
    onAdvanceStudyCard,
}: FavoritesScreenProps) {
    const styles = useThemedStyles(createFavoritesScreenStyles);
    const [activeStatus, setActiveStatus] = useState<MemorizationStatus>("toMemorize");
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
    const [manageCollectionId, setManageCollectionId] = useState<string | null>(null);
    const [collectionName, setCollectionName] = useState("");
    const [visibleWord, setVisibleWord] = useState<string | null>(null);
    const selectedCollection = useMemo(
        () => collections.find((collection) => collection.id === manageCollectionId) ?? null,
        [collections, manageCollectionId],
    );

    const filteredEntries = useMemo(
        () =>
            favorites.filter((entry) => {
                if (entry.status !== activeStatus) {
                    return false;
                }

                if (!collectionsEnabled || activeCollectionId == null) {
                    return true;
                }

                return collectionMemberships[createReviewProgressKey(entry.word.word)] === activeCollectionId;
            }),
        [activeCollectionId, activeStatus, collectionMemberships, collectionsEnabled, favorites],
    );
    const emptyMessage = useMemo(() => {
        if (!collectionsEnabled || activeCollectionId == null) {
            return `${MEMORIZATION_STATUSES[activeStatus]}에 단어가 없어요.`;
        }

        const activeCollection = collections.find((collection) => collection.id === activeCollectionId);
        if (!activeCollection) {
            return `${MEMORIZATION_STATUSES[activeStatus]}에 단어가 없어요.`;
        }

        return `"${activeCollection.name}" 컬렉션에 ${MEMORIZATION_STATUSES[activeStatus]} 단어가 없어요.`;
    }, [activeCollectionId, activeStatus, collections, collectionsEnabled]);
    const visibleWordCollectionId = useMemo(() => {
        if (!visibleWord) {
            return null;
        }
        return collectionMemberships[createReviewProgressKey(visibleWord)] ?? null;
    }, [collectionMemberships, visibleWord]);
    const visibleEntry = useMemo(() => {
        if (!visibleWord) {
            return null;
        }

        const visibleWordKey = createReviewProgressKey(visibleWord);
        return (
            filteredEntries.find((entry) => createReviewProgressKey(entry.word.word) === visibleWordKey) ??
            favorites.find((entry) => createReviewProgressKey(entry.word.word) === visibleWordKey) ??
            null
        );
    }, [favorites, filteredEntries, visibleWord]);
    const favoritesStudySession = useMemo(
        () => (studySession?.source === "favorites" ? studySession : null),
        [studySession],
    );

    useEffect(() => {
        if (activeCollectionId && !collections.some((collection) => collection.id === activeCollectionId)) {
            setActiveCollectionId(null);
        }
    }, [activeCollectionId, collections]);

    useEffect(() => {
        if (manageCollectionId && !selectedCollection) {
            setManageCollectionId(null);
            setCollectionName("");
        }
    }, [manageCollectionId, selectedCollection]);

    useEffect(() => {
        if (filteredEntries.length === 0) {
            setVisibleWord(null);
            return;
        }

        const hasVisibleEntry = visibleWord
            ? filteredEntries.some(
                  (entry) => createReviewProgressKey(entry.word.word) === createReviewProgressKey(visibleWord),
              )
            : false;

        if (!hasVisibleEntry) {
            setVisibleWord(filteredEntries[0].word.word);
        }
    }, [filteredEntries, visibleWord]);

    const showCollectionError = useCallback((title: string, error: unknown) => {
        const message = error instanceof Error ? error.message : "컬렉션 작업을 완료하지 못했어요.";
        Alert.alert(title, message);
    }, []);

    const handleSelectCollectionForEdit = useCallback(
        (collectionId: string) => {
            const collection = collections.find((item) => item.id === collectionId);
            setManageCollectionId(collectionId);
            setCollectionName(collection?.name ?? "");
        },
        [collections],
    );

    const handleResetCollectionEditor = useCallback(() => {
        setManageCollectionId(null);
        setCollectionName("");
    }, []);

    const handleSaveCollection = useCallback(() => {
        const nextName = collectionName.trim();
        if (!nextName) {
            return;
        }

        if (manageCollectionId) {
            void onRenameCollection(manageCollectionId, nextName).catch((error: unknown) => {
                showCollectionError("컬렉션 이름 변경 실패", error);
            });
            return;
        }

        void onCreateCollection(nextName)
            .then((createdId) => {
                setCollectionName(nextName);
                if (createdId) {
                    setManageCollectionId(createdId);
                }
            })
            .catch((error: unknown) => {
                showCollectionError("컬렉션 생성 실패", error);
            });
    }, [collectionName, manageCollectionId, onCreateCollection, onRenameCollection, showCollectionError]);

    const handleDeleteCollectionPress = useCallback(() => {
        if (!manageCollectionId) {
            return;
        }

        void onDeleteCollection(manageCollectionId)
            .then(() => {
                if (activeCollectionId === manageCollectionId) {
                    setActiveCollectionId(null);
                }
                setManageCollectionId(null);
                setCollectionName("");
            })
            .catch((error: unknown) => {
                showCollectionError("컬렉션 삭제 실패", error);
            });
    }, [activeCollectionId, manageCollectionId, onDeleteCollection, showCollectionError]);

    const handleAssignVisibleWord = useCallback(
        (collectionId: string | null) => {
            if (!visibleWord) {
                return;
            }

            void onAssignWordToCollection(visibleWord, collectionId).catch((error: unknown) => {
                showCollectionError("컬렉션 저장 실패", error);
            });
        },
        [onAssignWordToCollection, showCollectionError, visibleWord],
    );

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

                {collectionsEnabled ? (
                    <View style={styles.collectionCard}>
                        <Text style={styles.segmentLabel}>컬렉션 필터</Text>
                        <Text style={styles.collectionDescription}>단어를 묶음별로 골라서 볼 수 있어요.</Text>
                        <View style={styles.collectionChipRow}>
                            <Pressable
                                style={[
                                    styles.collectionChip,
                                    activeCollectionId == null && styles.collectionChipActive,
                                ]}
                                onPress={() => {
                                    setActiveCollectionId(null);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.collectionChipText,
                                        activeCollectionId == null && styles.collectionChipTextActive,
                                    ]}
                                >
                                    전체
                                </Text>
                            </Pressable>
                            {collections.map((collection) => {
                                const isSelected = collection.id === activeCollectionId;
                                return (
                                    <Pressable
                                        key={collection.id}
                                        style={[styles.collectionChip, isSelected && styles.collectionChipActive]}
                                        onPress={() => {
                                            setActiveCollectionId(collection.id);
                                        }}
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
                    </View>
                ) : null}

                {collectionsEnabled ? (
                    <View style={styles.collectionCard}>
                        <View style={styles.collectionHeader}>
                            <Text style={styles.segmentLabel}>컬렉션 관리</Text>
                            {manageCollectionId ? (
                                <TouchableOpacity
                                    onPress={handleResetCollectionEditor}
                                    accessibilityRole="button"
                                    accessibilityLabel="새 컬렉션 편집으로 전환"
                                >
                                    <Text style={styles.collectionResetText}>새 컬렉션</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        <Text style={styles.collectionDescription}>
                            새 컬렉션을 만들거나 기존 컬렉션 이름을 바꿀 수 있어요.
                        </Text>
                        {collections.length > 0 ? (
                            <View style={styles.collectionChipRow}>
                                {collections.map((collection) => {
                                    const isSelected = collection.id === manageCollectionId;
                                    return (
                                        <Pressable
                                            key={collection.id}
                                            style={[styles.collectionChip, isSelected && styles.collectionChipActive]}
                                            onPress={() => {
                                                handleSelectCollectionForEdit(collection.id);
                                            }}
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
                        ) : (
                            <Text style={styles.collectionEmptyText}>
                                아직 컬렉션이 없어요. 첫 컬렉션을 만들어보세요.
                            </Text>
                        )}

                        <TextField
                            value={collectionName}
                            onChangeText={setCollectionName}
                            placeholder={selectedCollection ? "컬렉션 이름 수정" : "새 컬렉션 이름"}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <View style={styles.collectionActionRow}>
                            <TouchableOpacity
                                style={[
                                    styles.collectionActionButton,
                                    !collectionName.trim() && styles.collectionActionButtonDisabled,
                                ]}
                                onPress={handleSaveCollection}
                                disabled={!collectionName.trim()}
                                accessibilityRole="button"
                                accessibilityLabel={selectedCollection ? "컬렉션 이름 변경" : "새 컬렉션 만들기"}
                            >
                                <Text style={styles.collectionActionButtonText}>
                                    {selectedCollection ? "이름 변경" : "새 컬렉션 만들기"}
                                </Text>
                            </TouchableOpacity>

                            {selectedCollection ? (
                                <TouchableOpacity
                                    style={styles.collectionDangerButton}
                                    onPress={handleDeleteCollectionPress}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${selectedCollection.name} 컬렉션 삭제`}
                                >
                                    <Text style={styles.collectionDangerButtonText}>삭제</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                ) : null}

                {filteredEntries.length > 0 ? (
                    <FavoritesFlashcard
                        entries={filteredEntries}
                        status={activeStatus}
                        onMoveToStatus={onUpdateStatus}
                        onRemoveFavorite={onRemoveFavorite}
                        onPlayAudio={onPlayAudio}
                        pronunciationAvailable={pronunciationAvailable}
                        onVisibleWordChange={setVisibleWord}
                    />
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>{emptyMessage}</Text>
                        <Text style={styles.emptySubtitle}>
                            검색 화면에서 단어를 저장하면 이곳에서 복습할 수 있어요.
                        </Text>
                    </View>
                )}

                {studyEnabled && visibleEntry ? (
                    <View style={styles.studyCard}>
                        <Text style={styles.segmentLabel}>학습 모드</Text>
                        <Text style={styles.studyDescription}>
                            {studyAvailable
                                ? `${visibleEntry.word.word} 단어로 짧은 AI 학습을 시작할 수 있어요.`
                                : "백엔드가 준비되면 AI 학습 모드를 사용할 수 있어요. 지금은 일반 복습을 계속 이용해주세요."}
                        </Text>
                        <TouchableOpacity
                            style={[styles.studyButton, !studyAvailable && styles.studyButtonDisabled]}
                            onPress={() => {
                                onStartStudyMode(visibleEntry.word);
                            }}
                            disabled={!studyAvailable}
                            accessibilityRole="button"
                            accessibilityLabel={studyAvailable ? "AI 학습 시작" : "AI 학습 시작 비활성화"}
                        >
                            <Text style={styles.studyButtonText}>
                                {studyAvailable ? "AI 학습 시작" : "백엔드 준비 필요"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {favoritesStudySession ? (
                    <StudyModeScreen
                        viewModel={favoritesStudySession}
                        onClose={onCloseStudyMode}
                        onRetry={onRetryStudyMode}
                        onRegenerate={onRegenerateStudyMode}
                        onSelectChoice={onSelectStudyChoice}
                        onAdvance={onAdvanceStudyCard}
                    />
                ) : null}

                {collectionsEnabled && visibleWord ? (
                    <View style={styles.collectionCard}>
                        <Text style={styles.segmentLabel}>현재 단어 컬렉션</Text>
                        <Text style={styles.collectionDescription}>
                            {visibleWord} 단어를 원하는 컬렉션에 담아두세요.
                        </Text>
                        <View style={styles.collectionChipRow}>
                            <Pressable
                                style={[
                                    styles.collectionChip,
                                    visibleWordCollectionId == null && styles.collectionChipActive,
                                ]}
                                onPress={() => {
                                    handleAssignVisibleWord(null);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.collectionChipText,
                                        visibleWordCollectionId == null && styles.collectionChipTextActive,
                                    ]}
                                >
                                    미지정
                                </Text>
                            </Pressable>
                            {collections.map((collection) => {
                                const isSelected = collection.id === visibleWordCollectionId;
                                return (
                                    <Pressable
                                        key={collection.id}
                                        style={[styles.collectionChip, isSelected && styles.collectionChipActive]}
                                        onPress={() => {
                                            handleAssignVisibleWord(collection.id);
                                        }}
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
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

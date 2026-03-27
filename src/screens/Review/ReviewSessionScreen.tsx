import React from "react";
import { Pressable, Text, View } from "react-native";

import { createReviewSessionScreenStyles } from "@/screens/Review/ReviewSessionScreen.styles";
import type { ReviewSessionScreenProps } from "@/screens/Review/ReviewSessionScreen.types";
import { useThemedStyles } from "@/theme/useThemedStyles";

const REVIEW_ACTIONS = [
    { outcome: "again", label: "아직이에요", primary: false },
    { outcome: "good", label: "다시 볼래요", primary: false },
    { outcome: "easy", label: "외웠어요", primary: true },
] as const;

export function ReviewSessionScreen({ session, onApplyOutcome, onClose }: ReviewSessionScreenProps) {
    const styles = useThemedStyles(createReviewSessionScreenStyles);

    if (session.status === "complete") {
        return (
            <View style={styles.container}>
                <View style={styles.headerCard}>
                    <Text style={styles.eyebrow}>오늘의 리뷰</Text>
                    <Text style={styles.title}>복습을 마쳤어요</Text>
                    <Text style={styles.subtitle}>지금 끝낸 단어 흐름이 바로 다음 복습 일정에 반영됐어요.</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>완료</Text>
                        <Text style={styles.statValue}>{session.completedCount}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>정답 흐름</Text>
                        <Text style={styles.statValue}>{session.correctCount}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>다시 보기</Text>
                        <Text style={styles.statValue}>{session.incorrectCount}</Text>
                    </View>
                </View>

                <Pressable style={[styles.actionButton, styles.primaryAction]} onPress={onClose}>
                    <Text style={styles.primaryActionText}>홈으로 돌아가기</Text>
                </Pressable>
            </View>
        );
    }

    const definition =
        session.currentItem.entry.word.meanings[0]?.definitions[0]?.definition ?? "뜻 정보가 아직 없어요.";
    const phonetic = session.currentItem.entry.word.phonetic;

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <Text style={styles.eyebrow}>집중 복습</Text>
                <Text style={styles.title}>{session.currentIndex + 1}번째 단어</Text>
                <Text style={styles.subtitle}>지금 판단한 결과가 바로 다음 복습 간격으로 이어집니다.</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>진행</Text>
                    <Text style={styles.statValue}>
                        {session.currentIndex + 1} / {session.totalCount}
                    </Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>완료</Text>
                    <Text style={styles.statValue}>{session.completedCount}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>남음</Text>
                    <Text style={styles.statValue}>{session.totalCount - session.completedCount}</Text>
                </View>
            </View>

            <View style={styles.wordCard}>
                <Text style={styles.progressText}>
                    {session.currentItem.entry.status === "review" ? "복습 단어" : "외울 단어"}
                </Text>
                <Text style={styles.word}>{session.currentItem.entry.word.word}</Text>
                {phonetic ? <Text style={styles.phonetic}>{phonetic}</Text> : null}
                <Text style={styles.definition}>{definition}</Text>
            </View>

            <View style={styles.actionList}>
                {REVIEW_ACTIONS.map((action) => (
                    <Pressable
                        key={action.outcome}
                        style={[
                            styles.actionButton,
                            action.primary ? styles.primaryAction : styles.secondaryAction,
                            session.pending && styles.actionButtonDisabled,
                        ]}
                        onPress={() => {
                            onApplyOutcome(action.outcome);
                        }}
                        disabled={session.pending}
                    >
                        <Text style={action.primary ? styles.primaryActionText : styles.secondaryActionText}>
                            {action.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Pressable style={styles.closeButton} onPress={onClose} disabled={session.pending}>
                <Text style={styles.closeButtonText}>나중에 이어서 할게요</Text>
            </Pressable>
        </View>
    );
}

import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { createStudyModeScreenStyles } from "@/screens/StudyMode/StudyModeScreen.styles";
import type { StudyModeActiveViewModel, StudyModeScreenProps } from "@/screens/StudyMode/StudyModeScreen.types";
import { useThemedStyles } from "@/theme/useThemedStyles";

function getStatusCopy(status: StudyModeScreenProps["viewModel"]["status"]) {
    switch (status) {
        case "loading":
            return { label: "불러오는 중", tone: "muted" as const };
        case "error":
            return { label: "제한적", tone: "warning" as const };
        case "complete":
            return { label: "완료", tone: "healthy" as const };
        default:
            return { label: "활성", tone: "healthy" as const };
    }
}

function getChoiceStyle(
    viewModel: StudyModeActiveViewModel,
    choiceValue: string,
    correctAnswer: string,
    styles: ReturnType<typeof createStudyModeScreenStyles>,
) {
    if (!viewModel.answerSubmitted) {
        return viewModel.selectedAnswer === choiceValue
            ? [styles.choiceButton, styles.choiceButtonSelected]
            : styles.choiceButton;
    }

    if (choiceValue === correctAnswer) {
        return [styles.choiceButton, styles.choiceButtonCorrect];
    }

    if (viewModel.selectedAnswer === choiceValue) {
        return [styles.choiceButton, styles.choiceButtonIncorrect];
    }

    return styles.choiceButton;
}

export function StudyModeScreen({
    viewModel,
    onClose,
    onRetry,
    onRegenerate,
    onSelectChoice,
    onAdvance,
}: StudyModeScreenProps) {
    const styles = useThemedStyles(createStudyModeScreenStyles);
    const statusCopy = getStatusCopy(viewModel.status);
    const statusToneStyle =
        statusCopy.tone === "warning"
            ? styles.statusPillWarning
            : statusCopy.tone === "muted"
              ? styles.statusPillMuted
              : styles.statusPillHealthy;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                    <View style={[styles.statusPill, statusToneStyle]}>
                        <Text style={styles.statusPillText}>{statusCopy.label}</Text>
                    </View>
                    <Text style={styles.title}>AI 학습 모드</Text>
                    <Text style={styles.subtitle}>{viewModel.word.word} 단어로 짧은 문제를 풀어보세요.</Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button">
                    <Text style={styles.closeButtonText}>닫기</Text>
                </TouchableOpacity>
            </View>

            {viewModel.status === "loading" ? (
                <View style={styles.loadingBody}>
                    <ActivityIndicator size="small" color="#2f80ed" />
                    <Text style={styles.loadingText}>학습 카드를 만드는 중이에요.</Text>
                </View>
            ) : null}

            {viewModel.status === "error" ? (
                <>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>
                            {viewModel.retryable ? "지금은 일부 기능만 이용 가능해요." : "AI 학습을 시작할 수 없어요."}
                        </Text>
                        <Text style={styles.summaryDescription}>{viewModel.error.message}</Text>
                    </View>
                    <View style={styles.actionRow}>
                        {viewModel.retryable ? (
                            <TouchableOpacity style={styles.primaryButton} onPress={onRetry} accessibilityRole="button">
                                <Text style={styles.primaryButtonText}>다시 시도</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity style={styles.secondaryButton} onPress={onClose} accessibilityRole="button">
                            <Text style={styles.secondaryButtonText}>사전으로 돌아가기</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : null}

            {viewModel.status === "active" ? (
                <>
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Text style={styles.statChipText}>
                                {viewModel.currentIndex + 1} / {viewModel.totalCount}
                            </Text>
                        </View>
                        <View style={styles.statChip}>
                            <Text style={styles.statChipText}>정답 {viewModel.correctCount}</Text>
                        </View>
                        <View style={styles.statChip}>
                            <Text style={styles.statChipText}>완료 {viewModel.completedCount}</Text>
                        </View>
                    </View>

                    <View style={styles.promptCard}>
                        <Text style={styles.promptLabel}>{viewModel.currentCard.type}</Text>
                        <Text style={styles.promptText}>{viewModel.currentCard.prompt}</Text>
                    </View>

                    <View style={styles.choices}>
                        {viewModel.currentCard.choices.map((choice) => (
                            <TouchableOpacity
                                key={choice.id}
                                style={getChoiceStyle(viewModel, choice.value, viewModel.currentCard.answer, styles)}
                                onPress={() => {
                                    onSelectChoice(choice.value);
                                }}
                                disabled={viewModel.answerSubmitted}
                                accessibilityRole="button"
                                accessibilityLabel={`${choice.label} 선택`}
                            >
                                <Text style={styles.choiceLabel}>{choice.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {viewModel.answerSubmitted ? (
                        <View style={styles.feedbackCard}>
                            <Text style={styles.feedbackTitle}>
                                {viewModel.isCurrentAnswerCorrect ? "정답이에요." : "한 번 더 보면 좋아요."}
                            </Text>
                            <Text style={styles.feedbackDescription}>
                                정답: {viewModel.currentCard.answer}
                                {viewModel.currentCard.explanation ? `\n${viewModel.currentCard.explanation}` : ""}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={viewModel.answerSubmitted ? onAdvance : onRegenerate}
                            accessibilityRole="button"
                        >
                            <Text style={styles.primaryButtonText}>
                                {viewModel.answerSubmitted
                                    ? viewModel.currentIndex + 1 === viewModel.totalCount
                                        ? "결과 보기"
                                        : "다음 카드"
                                    : "새 카드 다시 생성"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={viewModel.answerSubmitted ? onRegenerate : onClose}
                            accessibilityRole="button"
                        >
                            <Text style={styles.secondaryButtonText}>
                                {viewModel.answerSubmitted ? "다시 생성" : "사전으로 돌아가기"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : null}

            {viewModel.status === "complete" ? (
                <>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>학습 완료</Text>
                        <Text style={styles.summaryDescription}>
                            {viewModel.totalCount}문제 중 {viewModel.correctCount}문제를 맞혔어요.
                        </Text>
                    </View>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={onRegenerate}
                            accessibilityRole="button"
                        >
                            <Text style={styles.primaryButtonText}>다른 카드 다시 생성</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={onClose} accessibilityRole="button">
                            <Text style={styles.secondaryButtonText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : null}
        </View>
    );
}

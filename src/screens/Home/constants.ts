export const HOME_HEADER_TEXT = {
    badgeLabel: "나의 학습 공간",
    defaultDisplayName: "나만의 영어 단어장",
    titleSuffix: "오늘도 단어를 만나봐요",
};

export const SUMMARY_CARD_TEXT = {
    sectionLabel: "현재 요약",
    defaultGreeting: "내 학습 현황",
    reviewTitle: "오늘의 리뷰",
    reviewEmptyTitle: "오늘 바로 시작할 리뷰가 없어요",
    reviewReadyBody: (count: number) => `지금 복습할 단어 ${count}개가 기다리고 있어요.`,
    reviewEmptyBody: "검색에서 단어를 저장하면 다음 복습이 여기에 표시돼요.",
    reviewAction: "복습 시작",
};

export const SUMMARY_STAT_CONFIG = [
    { key: "total", label: "전체 단어" },
    { key: "toMemorize", label: "외울 단어" },
    { key: "review", label: "복습 단어" },
    { key: "mastered", label: "터득한 단어" },
] as const;

export const FAVORITES_LIST_TEXT = {
    sectionLabel: "외울 단어장",
    subtitle: "오늘 복습할 단어를 여기서 관리하세요.",
    defaultEmpty: "저장된 단어가 없어요.",
};

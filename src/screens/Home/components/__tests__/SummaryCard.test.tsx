import { render } from "@testing-library/react-native";
import React from "react";

import { SummaryCard } from "@/screens/Home/components/SummaryCard";
import { SUMMARY_CARD_TEXT } from "@/screens/Home/constants";

describe("SummaryCard", () => {
    const baseProps = {
        userName: "Mia",
        counts: { toMemorize: 3, review: 2, mastered: 1 },
    };

    it("renders stats and greeting", () => {
        const { getByText } = render(<SummaryCard {...baseProps} />);

        expect(getByText("Mia님의 진행상황")).toBeTruthy();
        expect(getByText("전체 단어")).toBeTruthy();
        expect(getByText("6")).toBeTruthy(); // total
    });

    it("shows fallback greeting when user name missing", () => {
        const { getByText } = render(<SummaryCard {...baseProps} userName="" />);

        expect(getByText(SUMMARY_CARD_TEXT.defaultGreeting)).toBeTruthy();
    });

    it("renders the review dashboard CTA when review data is provided", () => {
        const onStartReview = jest.fn();
        const { getByText } = render(
            <SummaryCard
                {...baseProps}
                reviewDashboard={{
                    dueCount: 4,
                    canStartReview: true,
                    onStartReview,
                }}
            />,
        );

        expect(getByText(SUMMARY_CARD_TEXT.reviewTitle)).toBeTruthy();
        expect(getByText(SUMMARY_CARD_TEXT.reviewReadyBody(4))).toBeTruthy();
        expect(getByText(SUMMARY_CARD_TEXT.reviewAction)).toBeTruthy();
    });
});

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { createPasswordRulesStyles } from "@/components/PasswordRules.styles";
import type { PasswordRuleState } from "@/screens/Auth/signup/signupSchema";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

type PasswordRulesProps = {
    state: PasswordRuleState;
};

const RULES: { key: keyof PasswordRuleState; label: string }[] = [
    { key: "length", label: "8~20자" },
    { key: "letter", label: "영문 포함" },
    { key: "number", label: "숫자 포함" },
    { key: "special", label: "특수문자 포함" },
    { key: "match", label: "비밀번호 일치" },
];

export function PasswordRules({ state }: PasswordRulesProps) {
    const { theme } = useAppAppearance();
    const styles = useThemedStyles(createPasswordRulesStyles);

    return (
        <View style={styles.container}>
            {RULES.map((rule) => {
                const isSatisfied = state[rule.key];
                return (
                    <View key={rule.key} style={styles.row}>
                        <Ionicons
                            name={isSatisfied ? "checkmark-circle" : "ellipse-outline"}
                            size={16}
                            color={isSatisfied ? theme.accent : theme.textMuted}
                        />
                        <Text style={[styles.text, isSatisfied && styles.textActive]}>{rule.label}</Text>
                    </View>
                );
            })}
        </View>
    );
}

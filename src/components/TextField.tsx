import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";

import { createTextFieldStyles } from "@/components/TextField.styles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

type TextFieldProps = TextInputProps & {
    label?: string;
    helperText?: string;
    errorText?: string;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
    clearable?: boolean;
    onClear?: () => void;
};

export function TextField({
    label,
    helperText,
    errorText,
    rightIcon,
    onRightIconPress,
    clearable,
    onClear,
    style,
    ...inputProps
}: TextFieldProps) {
    const { theme } = useAppAppearance();
    const styles = useThemedStyles(createTextFieldStyles);
    const showClear = clearable && Boolean(inputProps.value) && onClear;

    return (
        <View style={styles.fieldWrap}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View style={[styles.inputRow, Boolean(errorText) && styles.inputError]}>
                <TextInput {...inputProps} style={[styles.input, style]} placeholderTextColor={theme.textMuted} />
                {rightIcon ? (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="입력 옵션"
                        style={styles.iconButton}
                    >
                        {rightIcon}
                    </TouchableOpacity>
                ) : null}
                {showClear ? (
                    <TouchableOpacity
                        onPress={onClear}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="입력 지우기"
                        style={styles.iconButton}
                    >
                        <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
            {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
        </View>
    );
}

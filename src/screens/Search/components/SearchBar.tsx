import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

import { createSearchBarStyles } from "@/screens/Search/components/SearchBar.styles";
import { SearchBarProps } from "@/screens/Search/components/SearchBar.types";
import { t } from "@/shared/i18n";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

export function SearchBar({
    value,
    onChangeText,
    onSubmit,
    suggestions,
    suggestionsLoading,
    onSelectSuggestion,
}: SearchBarProps) {
    const styles = useThemedStyles(createSearchBarStyles);
    const { theme } = useAppAppearance();
    const shouldShowSuggestions = suggestions.length > 0 || suggestionsLoading;
    const handleClear = () => {
        if (value) {
            onChangeText("");
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.inputWrapper}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={t("search.bar.placeholder")}
                    returnKeyType="search"
                    onSubmitEditing={onSubmit}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit
                    placeholderTextColor={theme.textMuted}
                />
            </View>
            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.clearButton} onPress={handleClear} disabled={!value}>
                    <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color={value ? theme.textSecondary : theme.textMuted}
                    />
                    <Text style={[styles.clearButtonText, !value && styles.clearButtonTextDisabled]}>
                        {t("search.bar.clear")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
                    <Text style={styles.submitButtonText}>{t("search.bar.submit")}</Text>
                    <Ionicons name="arrow-forward-circle" size={20} color={theme.accentContrast} />
                </TouchableOpacity>
            </View>
            {shouldShowSuggestions ? (
                <View style={styles.suggestionsSection} testID="search-autocomplete">
                    <View style={styles.suggestionsHeader}>
                        <Text style={styles.suggestionsLabel}>{t("search.suggestions.title")}</Text>
                    </View>
                    {suggestions.length > 0 ? (
                        <View style={styles.suggestionsList}>
                            {suggestions.map((suggestion) => (
                                <TouchableOpacity
                                    key={suggestion}
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        onSelectSuggestion(suggestion);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${suggestion} ${t("search.suggestions.title")}`}
                                >
                                    <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
                                    <Text style={styles.suggestionText}>{suggestion}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : null}
                    {suggestionsLoading ? (
                        <View style={styles.suggestionsLoadingRow}>
                            <ActivityIndicator size="small" color={theme.accent} />
                            <Text style={styles.suggestionsLoadingText}>{t("search.suggestions.loading")}</Text>
                        </View>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

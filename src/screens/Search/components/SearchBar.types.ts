export type SearchBarProps = {
    value: string;
    onChangeText: (text: string) => void;
    onSubmit: () => void;
    suggestions: string[];
    suggestionsLoading: boolean;
    onSelectSuggestion: (term: string) => void;
};

import { WordResult } from "./WordResult";

export type WordResultCardProps = {
	result: WordResult;
	onToggleFavorite: (word: WordResult) => void;
	onPlayPronunciation: () => void;
	pronunciationAvailable: boolean;
	isFavorite: boolean;
	examplesVisible: boolean;
	onToggleExamples: () => void;
};

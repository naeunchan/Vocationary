import { type AudioPlayer, type AudioStatus, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { EventSubscription } from "expo-modules-core";

let audioModePromise: Promise<void> | null = null;

async function ensureAudioModeConfigured() {
    if (!audioModePromise) {
        audioModePromise = setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            allowsRecording: false,
            interruptionMode: "mixWithOthers",
            interruptionModeAndroid: "duckOthers",
            shouldRouteThroughEarpiece: false,
        }).catch((error) => {
            console.warn("오디오 모드를 설정하는 중 문제가 발생했어요.", error);
        });
    }

    await audioModePromise;
}

function disposePlayer(player: AudioPlayer) {
    try {
        player.pause();
    } catch (error) {
        console.warn("오디오 재생을 중단하는 중 문제가 발생했어요.", error);
    }

    try {
        player.remove();
    } catch (error) {
        console.warn("오디오 리소스를 정리하는 중 문제가 발생했어요.", error);
    }
}

export async function playRemoteAudio(uri: string) {
    await ensureAudioModeConfigured();

    const player = createAudioPlayer({ uri });

    await new Promise<void>((resolve, reject) => {
        let settled = false;
        let subscription: EventSubscription | null = null;

        const settle = (error?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            subscription?.remove();
            disposePlayer(player);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };

        subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
            if (status.playbackState === "failed") {
                const message =
                    status.reasonForWaitingToPlay && status.reasonForWaitingToPlay !== "unknown"
                        ? status.reasonForWaitingToPlay
                        : "오디오를 재생할 수 없어요.";
                settle(new Error(message));
                return;
            }

            if (status.didJustFinish) {
                settle();
            }
        });

        try {
            player.play();
        } catch (error) {
            const normalized = error instanceof Error ? error : new Error("오디오를 재생할 수 없어요.");
            settle(normalized);
        }
    });
}

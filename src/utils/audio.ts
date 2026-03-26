type AudioStatus = {
    isLoaded?: boolean;
    didJustFinish?: boolean;
    playbackState?: string;
    reasonForWaitingToPlay?: string | null;
};

type EventSubscription = {
    remove: () => void;
};

type AudioPlayer = {
    isLoaded?: boolean;
    play: () => void;
    pause: () => void;
    remove: () => void;
    seekTo: (position: number) => Promise<void>;
    addListener: (eventName: string, listener: (status: AudioStatus) => void) => EventSubscription;
};

type ExpoAudioModule = {
    createAudioPlayer: (
        source: { uri: string },
        options?: {
            downloadFirst?: boolean;
            keepAudioSessionActive?: boolean;
        },
    ) => AudioPlayer;
    setAudioModeAsync: (options: {
        playsInSilentMode: boolean;
        shouldPlayInBackground: boolean;
        allowsRecording: boolean;
        interruptionMode: string;
        shouldRouteThroughEarpiece: boolean;
    }) => Promise<void>;
};

const MAX_CACHED_PLAYERS = 6;
const PLAYER_READY_TIMEOUT_MS = 8000;

type CachedPlayer = {
    player: AudioPlayer;
    readyPromise: Promise<void>;
    lastUsedAt: number;
};

let audioModePromise: Promise<void> | null = null;
let activePlayerUri: string | null = null;
const cachedPlayers = new Map<string, CachedPlayer>();

function getExpoAudioModule(): ExpoAudioModule | null {
    try {
        const moduleValue = require("expo-audio") as Partial<ExpoAudioModule>;
        if (
            typeof moduleValue?.createAudioPlayer !== "function" ||
            typeof moduleValue?.setAudioModeAsync !== "function"
        ) {
            return null;
        }
        return moduleValue as ExpoAudioModule;
    } catch {
        return null;
    }
}

function getAudioModule(): ExpoAudioModule {
    const audioModule = getExpoAudioModule();
    if (!audioModule) {
        throw new Error("현재 환경에서는 오디오 재생을 지원하지 않아요.");
    }
    return audioModule;
}

async function ensureAudioModeConfigured() {
    if (!audioModePromise) {
        audioModePromise = getAudioModule()
            .setAudioModeAsync({
                playsInSilentMode: true,
                shouldPlayInBackground: false,
                allowsRecording: false,
                interruptionMode: "mixWithOthers",
                shouldRouteThroughEarpiece: false,
            })
            .catch((error) => {
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

function removeCachedPlayer(uri: string) {
    const cached = cachedPlayers.get(uri);
    if (!cached) {
        return;
    }
    cachedPlayers.delete(uri);
    if (activePlayerUri === uri) {
        activePlayerUri = null;
    }
    disposePlayer(cached.player);
}

function trimCachedPlayers() {
    if (cachedPlayers.size <= MAX_CACHED_PLAYERS) {
        return;
    }
    const sortedByAge = [...cachedPlayers.entries()].sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
    for (const [uri] of sortedByAge) {
        if (cachedPlayers.size <= MAX_CACHED_PLAYERS) {
            break;
        }
        removeCachedPlayer(uri);
    }
}

function toPlaybackError(status: AudioStatus) {
    const message =
        status.reasonForWaitingToPlay && status.reasonForWaitingToPlay !== "unknown"
            ? status.reasonForWaitingToPlay
            : "오디오를 재생할 수 없어요.";
    return new Error(message);
}

function waitUntilLoaded(player: AudioPlayer): Promise<void> {
    if (player.isLoaded) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
        let settled = false;
        let subscription: EventSubscription | null = null;
        const timeoutId = setTimeout(() => {
            settle(new Error("오디오를 준비할 수 없어요."));
        }, PLAYER_READY_TIMEOUT_MS);

        const settle = (error?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);
            subscription?.remove();
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };

        subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
            if (status.playbackState === "failed") {
                settle(toPlaybackError(status));
                return;
            }

            if (status.isLoaded) {
                settle();
            }
        });
    });
}

function getOrCreateCachedPlayer(uri: string): CachedPlayer {
    const existing = cachedPlayers.get(uri);
    if (existing) {
        existing.lastUsedAt = Date.now();
        return existing;
    }

    const player = getAudioModule().createAudioPlayer(
        { uri },
        {
            downloadFirst: true,
            keepAudioSessionActive: true,
        },
    );
    const cached: CachedPlayer = {
        player,
        readyPromise: waitUntilLoaded(player).catch((error) => {
            removeCachedPlayer(uri);
            throw error;
        }),
        lastUsedAt: Date.now(),
    };

    cachedPlayers.set(uri, cached);
    trimCachedPlayers();
    return cached;
}

async function getReadyPlayer(uri: string): Promise<AudioPlayer> {
    const cached = getOrCreateCachedPlayer(uri);
    await cached.readyPromise;
    cached.lastUsedAt = Date.now();
    return cached.player;
}

export async function prefetchRemoteAudio(uri: string): Promise<void> {
    await ensureAudioModeConfigured();
    await getReadyPlayer(uri);
}

export async function playRemoteAudio(uri: string) {
    await prefetchRemoteAudio(uri);

    if (activePlayerUri && activePlayerUri !== uri) {
        const previous = cachedPlayers.get(activePlayerUri);
        if (previous) {
            try {
                previous.player.pause();
            } catch (error) {
                console.warn("이전 오디오 재생을 중단하는 중 문제가 발생했어요.", error);
            }
        }
    }

    const player = await getReadyPlayer(uri);
    activePlayerUri = uri;

    try {
        await player.seekTo(0);
    } catch {
        // Ignore seek failures and attempt playback anyway.
    }

    await new Promise<void>((resolve, reject) => {
        let settled = false;
        let subscription: EventSubscription | null = null;

        const settle = (error?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            subscription?.remove();
            if (activePlayerUri === uri) {
                activePlayerUri = null;
            }
            if (error) {
                removeCachedPlayer(uri);
                reject(error);
            } else {
                resolve();
            }
        };

        subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
            if (status.playbackState === "failed") {
                settle(toPlaybackError(status));
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

const SUPPORT_EMAIL = "support@vocachip.app";
const CONTACT_SUBJECT = "Vocachip 1:1 문의";

type BuildSupportMailtoUrlParams = {
    appVersion: string;
    isGuest: boolean;
    profileUsername: string | null;
};

export const SETTINGS_SUPPORT_EMAIL = SUPPORT_EMAIL;

export function buildSupportMailtoUrl({ appVersion, isGuest, profileUsername }: BuildSupportMailtoUrlParams) {
    const subject = encodeURIComponent(CONTACT_SUBJECT);
    const body = encodeURIComponent(
        `계정: ${profileUsername ?? (isGuest ? "게스트" : "알 수 없음")}\n앱 버전: ${appVersion}\n\n문의 내용을 작성해주세요.\n`,
    );

    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

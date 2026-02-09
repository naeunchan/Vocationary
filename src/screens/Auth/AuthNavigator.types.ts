import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";

export type AuthStackParamList = {
    Login: undefined;
    RecoveryGuide: undefined;
    SignUpIntro: undefined;
    SignUpEmail: undefined;
    SignUpName: undefined;
    SignUpPhone: undefined;
    SignUpPassword: undefined;
    SignUpSuccess: undefined;
};

export type AuthNavigatorProps = {
    loginProps: LoginScreenProps;
};

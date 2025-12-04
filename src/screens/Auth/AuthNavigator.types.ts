import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { LoginScreenProps } from "@/screens/Auth/LoginScreen.types";

export type AuthStackParamList = {
    Login: undefined;
};

export type AuthNavigatorProps = {
    loginProps: LoginScreenProps;
};

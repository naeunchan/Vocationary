import {
    DarkTheme as NavigationDarkTheme,
    DefaultTheme as NavigationDefaultTheme,
    NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import React, { useMemo } from "react";

import { AuthNavigatorProps, AuthStackParamList } from "@/screens/Auth/AuthNavigator.types";
import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { PasswordResetConfirmScreen } from "@/screens/Auth/PasswordResetConfirmScreen";
import { PasswordResetRequestScreen } from "@/screens/Auth/PasswordResetRequestScreen";
import { SignUpEmailScreen } from "@/screens/Auth/signup/SignUpEmailScreen";
import { SignUpFormProvider } from "@/screens/Auth/signup/SignUpFormProvider";
import { SignUpIntroScreen } from "@/screens/Auth/signup/SignUpIntroScreen";
import { SignUpNameScreen } from "@/screens/Auth/signup/SignUpNameScreen";
import { SignUpPasswordScreen } from "@/screens/Auth/signup/SignUpPasswordScreen";
import { SignUpPhoneScreen } from "@/screens/Auth/signup/SignUpPhoneScreen";
import { SignUpSuccessScreen } from "@/screens/Auth/signup/SignUpSuccessScreen";
import { RecoveryGuideScreen } from "@/screens/Settings/RecoveryGuideScreen";
import { SignupProvider } from "@/store/signupStore";
import { useAppAppearance } from "@/theme/AppearanceContext";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator({ loginProps }: AuthNavigatorProps) {
    const { mode, theme } = useAppAppearance();
    const navigationTheme = useMemo(
        () => ({
            ...(mode === "dark" ? NavigationDarkTheme : NavigationDefaultTheme),
            colors: {
                ...(mode === "dark" ? NavigationDarkTheme.colors : NavigationDefaultTheme.colors),
                background: theme.background,
                card: theme.surface,
                border: theme.border,
                primary: theme.textPrimary,
                text: theme.textPrimary,
            },
        }),
        [mode, theme],
    );
    const stackScreenOptions = useMemo<NativeStackNavigationOptions>(
        () => ({
            contentStyle: { backgroundColor: theme.background },
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.textPrimary,
            headerTitleStyle: { color: theme.textPrimary },
        }),
        [theme.background, theme.textPrimary],
    );

    return (
        <NavigationContainer independent theme={navigationTheme}>
            <SignupProvider>
                <SignUpFormProvider>
                    <Stack.Navigator screenOptions={stackScreenOptions}>
                        <Stack.Screen name="Login" options={{ headerShown: false }}>
                            {(props) => (
                                <LoginScreen
                                    {...loginProps}
                                    onOpenSignUpFlow={() => props.navigation.navigate("SignUpIntro")}
                                    onOpenPasswordResetFlow={() => props.navigation.navigate("PasswordResetRequest")}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen name="PasswordResetRequest" options={{ headerShown: false }}>
                            {(props) => (
                                <PasswordResetRequestScreen
                                    {...props}
                                    onRequestCode={loginProps.onRequestPasswordResetCode}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen name="PasswordResetConfirm" options={{ headerShown: false }}>
                            {(props) => (
                                <PasswordResetConfirmScreen
                                    {...props}
                                    onConfirmPasswordReset={loginProps.onConfirmPasswordReset}
                                    onRequestCode={loginProps.onRequestPasswordResetCode}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen name="RecoveryGuide" options={{ title: "계정 복구 안내", headerBackTitle: "" }}>
                            {({ navigation }) => (
                                <RecoveryGuideScreen
                                    onRequestSignUp={() => {
                                        navigation.navigate("SignUpIntro");
                                    }}
                                    onContinueAsGuest={loginProps.onGuest}
                                    onRequestPasswordReset={() => {
                                        navigation.navigate("PasswordResetRequest");
                                    }}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen
                            name="SignUpIntro"
                            options={{ headerShown: false }}
                            component={SignUpIntroScreen}
                        />
                        <Stack.Screen
                            name="SignUpEmail"
                            options={{ headerShown: false }}
                            component={SignUpEmailScreen}
                        />
                        <Stack.Screen name="SignUpName" options={{ headerShown: false }} component={SignUpNameScreen} />
                        <Stack.Screen
                            name="SignUpPhone"
                            options={{ headerShown: false }}
                            component={SignUpPhoneScreen}
                        />
                        <Stack.Screen name="SignUpPassword" options={{ headerShown: false }}>
                            {(props) => (
                                <SignUpPasswordScreen
                                    {...props}
                                    onSignUp={loginProps.onSignUp}
                                    loading={loginProps.loading ?? false}
                                    errorMessage={loginProps.signUpErrorMessage}
                                />
                            )}
                        </Stack.Screen>
                        <Stack.Screen name="SignUpSuccess" options={{ headerShown: false }}>
                            {(props) => <SignUpSuccessScreen {...props} />}
                        </Stack.Screen>
                    </Stack.Navigator>
                </SignUpFormProvider>
            </SignupProvider>
        </NavigationContainer>
    );
}

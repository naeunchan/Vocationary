import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";

import { RootTabParamList } from "@/navigation/Navigation.types";
import { RootTabNavigatorProps } from "@/navigation/RootTabNavigator.types";
import { TAB_BAR_OPTIONS, TAB_VISUAL_CONFIG } from "@/navigation/tabConfig";
import { FavoritesScreen } from "@/screens/Favorites/FavoritesScreen";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { SearchScreen } from "@/screens/Search/SearchScreen";
import { SettingsNavigator } from "@/screens/Settings/SettingsNavigator";
import { createTabStyles } from "@/styles/App.styles";
import { useAppAppearance } from "@/theme/AppearanceContext";
import { useThemedStyles } from "@/theme/useThemedStyles";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabNavigator({ home, favorites: favoritesTab, search, settings }: RootTabNavigatorProps) {
    const tabStyles = useThemedStyles(createTabStyles);
    const { theme } = useAppAppearance();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => {
                const { icon, label } = TAB_VISUAL_CONFIG[route.name];
                return {
                    headerShown: false,
                    tabBarActiveTintColor: theme.accent,
                    tabBarInactiveTintColor: theme.textSecondary,
                    tabBarLabelStyle: tabStyles.tabLabel,
                    tabBarStyle: tabStyles.tabBar,
                    tabBarShowLabel: TAB_BAR_OPTIONS.showLabel,
                    tabBarLabel: label,
                    tabBarIcon: ({ color, size }) => <MaterialIcons name={icon} color={color} size={size} />,
                };
            }}
        >
            <Tab.Screen name="Home">{() => <HomeScreen {...home} />}</Tab.Screen>
            <Tab.Screen name="Favorites">{() => <FavoritesScreen {...favoritesTab} />}</Tab.Screen>
            <Tab.Screen name="Search">{() => <SearchScreen {...search} />}</Tab.Screen>
            <Tab.Screen name="Settings">{() => <SettingsNavigator {...settings} />}</Tab.Screen>
        </Tab.Navigator>
    );
}

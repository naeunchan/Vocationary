import type { FavoritesScreenProps } from "@/screens/Favorites/FavoritesScreen.types";
import type { HomeScreenProps } from "@/screens/Home/types/HomeScreen.types";
import type { SearchScreenProps } from "@/screens/Search/SearchScreen.types";
import type { SettingsNavigatorProps } from "@/screens/Settings/SettingsNavigator.types";

export type RootTabNavigatorProps = {
    home: HomeScreenProps;
    favorites: FavoritesScreenProps;
    search: SearchScreenProps;
    settings: SettingsNavigatorProps;
};

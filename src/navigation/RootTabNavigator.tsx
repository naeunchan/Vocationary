import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { createTabStyles } from "@/styles/App.styles";
import { FavoritesScreen } from "@/screens/Favorites/FavoritesScreen";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { SearchScreen } from "@/screens/Search/SearchScreen";
import { SettingsNavigator } from "@/screens/Settings/SettingsNavigator";
import { TAB_BAR_OPTIONS, TAB_VISUAL_CONFIG } from "@/navigation/tabConfig";
import { RootTabParamList } from "@/navigation/Navigation.types";
import { RootTabNavigatorProps } from "@/navigation/RootTabNavigator.types";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { useAppAppearance } from "@/theme/AppearanceContext";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabNavigator({
	favorites,
	onToggleFavorite,
	onUpdateFavoriteStatus,
	onRemoveFavorite,
	searchTerm,
	onChangeSearchTerm,
	onSubmitSearch,
	loading,
	error,
	result,
	examplesVisible,
	onToggleExamples,
	isCurrentFavorite,
	onPlayPronunciation,
	pronunciationAvailable,
	mode,
	onModeChange,
	themeMode,
	onThemeModeChange,
	fontScale,
	onFontScaleChange,
	recentSearches,
	onSelectRecentSearch,
	onClearRecentSearches,
	onRetrySearch,
	userName,
	onLogout,
	canLogout,
	isGuest,
	onRequestLogin,
	onRequestSignUp,
	onPlayWordAudio,
	appVersion,
	profileDisplayName,
	profileUsername,
	onUpdateProfile,
	onCheckDisplayName,
	onUpdatePassword,
	onDeleteAccount,
	onExportBackup,
	onImportBackup,
	onShowOnboarding,
}: RootTabNavigatorProps) {
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
			<Tab.Screen name="Home">
				{() => (
						<HomeScreen
							favorites={favorites}
							mode={mode}
							onMoveToStatus={onUpdateFavoriteStatus}
							userName={userName}
						onPlayWordAudio={onPlayWordAudio}
							pronunciationAvailable={pronunciationAvailable}
					/>
				)}
			</Tab.Screen>
			<Tab.Screen name="Favorites">
				{() => (
					<FavoritesScreen
						favorites={favorites}
						onUpdateStatus={onUpdateFavoriteStatus}
						onRemoveFavorite={onRemoveFavorite}
						onPlayAudio={onPlayWordAudio}
						pronunciationAvailable={pronunciationAvailable}
					/>
				)}
			</Tab.Screen>
			<Tab.Screen name="Search">
				{() => (
					<SearchScreen
						searchTerm={searchTerm}
						onChangeSearchTerm={onChangeSearchTerm}
						onSubmit={onSubmitSearch}
						loading={loading}
						error={error}
						result={result}
						examplesVisible={examplesVisible}
						onToggleExamples={onToggleExamples}
						onToggleFavorite={(word) => {
							void onToggleFavorite(word);
						}}
						isCurrentFavorite={isCurrentFavorite}
						onPlayPronunciation={onPlayPronunciation}
						pronunciationAvailable={pronunciationAvailable}
						mode={mode}
						onModeChange={onModeChange}
						recentSearches={recentSearches}
						onSelectRecentSearch={onSelectRecentSearch}
						onClearRecentSearches={onClearRecentSearches}
						onRetry={onRetrySearch}
					/>
				)}
			</Tab.Screen>
			<Tab.Screen name="Settings">
				{() => (
					<SettingsNavigator
						onLogout={onLogout}
						canLogout={canLogout}
						isGuest={isGuest}
						onRequestLogin={onRequestLogin}
						onRequestSignUp={onRequestSignUp}
						appVersion={appVersion}
						profileDisplayName={profileDisplayName}
						profileUsername={profileUsername}
						onUpdateProfile={onUpdateProfile}
						onCheckDisplayName={onCheckDisplayName}
						onUpdatePassword={onUpdatePassword}
						onDeleteAccount={onDeleteAccount}
						onExportBackup={onExportBackup}
						onImportBackup={onImportBackup}
						onShowOnboarding={onShowOnboarding}
						themeMode={themeMode}
						onThemeModeChange={onThemeModeChange}
						fontScale={fontScale}
						onFontScaleChange={onFontScaleChange}
					/>
				)}
			</Tab.Screen>
		</Tab.Navigator>
	);
}

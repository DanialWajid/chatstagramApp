import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import Login from "./screen/login";
import Signup from "./screen/signup";
import ForgetPassword from "./screen/forgetPassword";
import Verification from "./screen/verification";
import FriendsExplore from "./screen/FriendsExplore";
import Profile from "./screen/profile";
import Friends from "./screen/Friends";
import Requests from "./screen/Requests";
import ChatPage from "../app/screen/ChatPage";
import ChatMessage from "../app/screen/ChatMessage";
import CreateGroupChat from "../app/screen/CreateGroupChat";
import GroupChatSettings from "../app/screen/GroupChatSettings";
import BlockedConnections from "../app/screen/BlockedConnections";
import { useAuthStore } from "../store/authStore";
import { ThemeProvider } from "../store/themeContext";
import * as Font from "expo-font";
import { ActivityIndicator, View } from "react-native";
import TwoFactorAuthScreen from "./screen/TwoFactor";

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { isAuthenticated, twoFactorRequired } = useAuthStore(); // 👈 grab 2FA flag
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        InstagramLogo: require("../assets/fonts/Billabong.ttf"),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Signup" component={Signup} />
          <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
          <Stack.Screen name="Verification" component={Verification} />
          <Stack.Screen name="TwoFactor" component={TwoFactorAuthScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={ChatPage} />
          <Stack.Screen name="Friends" component={Friends} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="ChatMessage" component={ChatMessage} />
          <Stack.Screen name="CreateGroupChat" component={CreateGroupChat} />
          <Stack.Screen name="ExploreFriends" component={FriendsExplore} />
          <Stack.Screen name="FriendRequests" component={Requests} />
          <Stack.Screen
            name="GroupChatSettings"
            component={GroupChatSettings}
          />
          <Stack.Screen
            name="BlockedConnections"
            component={BlockedConnections}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;

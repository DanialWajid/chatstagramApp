import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import Login from "./screen/login";
import Home from "./screen/home";
import Signup from "./screen/signup";
import ForgetPassword from "./screen/forgetPassword";
import Verification from "./screen/verification";
import SavedPosts from "./screen/SavedPosts";
import FriendsExplore from "./screen/FriendsExplore";
import Profile from "./screen/profile";
import EditPost from "./screen/EditPost";
import CreatePost from "./screen/CreatePost";
import Friends from "./screen/Friends";
import Requests from "./screen/Requests";
import ChatPage from "../app/screen/ChatPage";
import ChatMessage from "../app/screen/ChatMessage";
import CreateGroupChat from "../app/screen/CreateGroupChat";
import GroupChatSettings from "../app/screen/GroupChatSettings";
import { useAuthStore } from "../store/authStore";
import { ThemeProvider } from "../store/themeContext";
import * as Font from "expo-font";
import { ActivityIndicator, View } from "react-native";

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { isAuthenticated } = useAuthStore();
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
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isAuthenticated ? "Home" : "Login"}
    >
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="CreatePost" component={CreatePost} />
      <Stack.Screen name="Friends" component={Friends} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
      <Stack.Screen name="Verification" component={Verification} />
      <Stack.Screen name="SavedPosts" component={SavedPosts} />
      <Stack.Screen name="ExploreFriends" component={FriendsExplore} />
      <Stack.Screen name="FriendRequests" component={Requests} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="ChatPage" component={ChatPage} />
      <Stack.Screen name="ChatMessage" component={ChatMessage} />
      <Stack.Screen name="CreateGroupChat" component={CreateGroupChat} />
      <Stack.Screen name="GroupChatSettings" component={GroupChatSettings} />
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={({ route }) => ({
          title: route.params?.name || "Profile",
        })}
      />
      <Stack.Screen
        name="EditPost"
        component={EditPost}
        options={({ route }) => ({
          title: route.params?.name || "EditPost",
        })}
      />
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

import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  LogOut,
  Users,
  Menu as HamburgerIcon,
  X as CloseIcon,
  UserPlus,
  Key,
  MessageCircle,
  Palette,
  Plus,
  UserX,
} from "lucide-react-native";
import ChangePasswordModal from "./ChangePasswordModal";
import { useTheme } from "../store/themeContext";
import ThemeToggle from "./ThemeToggle";
import { useAuthStore } from "../store/authStore";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [menuHeight] = useState(new Animated.Value(0));
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    navigation.navigate("Login");
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      // Close menu with animation
      Animated.timing(menuHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => setIsMenuOpen(false));
    } else {
      // Open menu with animation
      setIsMenuOpen(true);
      Animated.timing(menuHeight, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleCreateGroup = () => {
    navigation.navigate("CreateGroupChat");
    setIsMenuOpen(false);
  };

  // Map route names to friendly titles
  const titleMap = {
    Home: "Chatstagram",
    Friends: "Connections",
    Profile: "Profile",
    ChatMessage: "Chat",
    CreateGroupChat: "Create Group",
    ExploreFriends: "Explore Connections",
    FriendRequests: "Connections Requests",
    GroupChatSettings: "Group Settings",
    BlockedConnections: "Blocked Connections",
    Login: "Login",
    Signup: "Sign up",
  };

  const currentTitle = titleMap[route.name] || route.name || "";

  // Get status bar height for Android
  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.navbar,
          borderBottomColor: theme.border,
          paddingTop: statusBarHeight,
        },
      ]}
    >
      <View style={[styles.navbar, { backgroundColor: theme.navbar }]}>
        {/* Page title */}
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => navigation.navigate("Home")}
        >
          {currentTitle === "Chatstagram" ? (
            <>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.chatLogo}
                resizeMode="contain"
              />
              <Text
                style={[styles.chatTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {currentTitle}
              </Text>
            </>
          ) : (
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={1}
            >
              {currentTitle}
            </Text>
          )}
        </TouchableOpacity>

        {/* Menu only */}
        <View style={styles.rightContainer}>
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            {isMenuOpen ? (
              <CloseIcon width={24} height={24} color={theme.text} />
            ) : (
              <HamburgerIcon width={24} height={24} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu (Dropdown) */}
      {isMenuOpen && (
        <Animated.View
          style={[
            styles.menu,
            {
              backgroundColor: theme.navbar,
              borderBottomColor: theme.border,
              maxHeight: menuHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
              }),
              opacity: menuHeight,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.navbar }]}
            onPress={() => {
              navigation.navigate("Friends");
              toggleMenu();
            }}
          >
            <Users
              width={20}
              height={20}
              color={theme.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>
              My Connections
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.navbar }]}
            onPress={() => {
              navigation.navigate("FriendRequests");
              toggleMenu();
            }}
          >
            <UserPlus
              width={20}
              height={20}
              color={theme.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Connection Requests
            </Text>
          </TouchableOpacity>

          {/* Blocked Connections */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.navbar }]}
            onPress={() => {
              navigation.navigate("BlockedConnections");
              toggleMenu();
            }}
          >
            <UserX
              width={20}
              height={20}
              color={theme.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Blocked Connections
            </Text>
          </TouchableOpacity>

          {/* Move Create Group Chat into Navbar menu */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.navbar }]}
            onPress={() => {
              handleCreateGroup();
            }}
          >
            <Plus
              width={20}
              height={20}
              color={theme.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Create Group Chat
            </Text>
          </TouchableOpacity>

          {/* Theme Toggle Menu Item */}
          <View style={[styles.menuItem, { backgroundColor: theme.navbar }]}>
            <Palette
              width={20}
              height={20}
              color={theme.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>Theme</Text>
            <View style={styles.themeToggleContainer}>
              <ThemeToggle />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.navbar }]}
            onPress={() => {
              setShowPasswordModal(true);
              toggleMenu();
            }}
          >
            <Key
              width={20}
              height={20}
              color={theme.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>
              Change Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.navbar }]}
            onPress={() => {
              handleLogout();
              toggleMenu();
            }}
          >
            <LogOut
              width={20}
              height={20}
              color="orange"
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: "orange" }]}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderBottomWidth: 1,
    zIndex: 1000,
    position: "absolute",
    top: 0,
  },
  navbar: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
  },
  logo: {
    width: 0,
    height: 0,
    borderRadius: 0,
  },
  title: {
    fontFamily: "InstagramLogo",
    fontSize: 24,
    marginLeft: 8,
    fontWeight: "700",
  },
  chatTitle: {
    fontFamily: "InstagramLogo",
    fontSize: 35,
    fontWeight: "500",
    marginLeft: 8,
    marginTop: 4,
  },
  chatLogo: {
    width: 45,
    height: 45,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "transparent",
  },
  chatButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  menu: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginVertical: 4,
  },
  menuIcon: {
    marginRight: 8,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  themeToggleContainer: {
    marginLeft: "auto",
  },
});

export default Navbar;

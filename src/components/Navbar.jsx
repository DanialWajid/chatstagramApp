import { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  LogOut,
  Users,
  Menu as HamburgerIcon,
  X as CloseIcon,
  UserPlus,
  Key,
  MessageCircle,
  Palette,
} from "lucide-react-native";
import ChangePasswordModal from "./ChangePasswordModal";
import { useTheme } from "../store/themeContext";
import ThemeToggle from "./ThemeToggle";

const logo = require("../assets/images/logo.jpg");

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleLogout = () => {
    navigation.navigate("Login");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleChatPress = () => {
    navigation.navigate("ChatPage");
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.navbar, borderBottomColor: theme.border },
      ]}
    >
      <View style={[styles.navbar, { backgroundColor: theme.navbar }]}>
        {/* Logo and Title */}
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => navigation.navigate("Home")}
        >
          <Image source={logo} style={styles.logo} />
          <Text style={[styles.title, { color: theme.text }]}>Catstagram</Text>
        </TouchableOpacity>

        {/* Chat Button and Menu */}
        <View style={styles.rightContainer}>
          <TouchableOpacity onPress={handleChatPress} style={styles.chatButton}>
            <MessageCircle width={24} height={24} color={theme.text} />
          </TouchableOpacity>
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
        <View
          style={[
            styles.menu,
            { backgroundColor: theme.navbar, borderBottomColor: theme.border },
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
              My Friends
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
              Friend Requests
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
              color={theme.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: theme.text }]}>Logout</Text>
          </TouchableOpacity>
        </View>
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
    zIndex: 10,
  },
  navbar: {
    height: 80,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  title: {
    fontFamily: "InstagramLogo",
    fontSize: 40,
    marginLeft: 8,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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

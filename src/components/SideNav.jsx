import React, { useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { MessageCircle, Compass } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../store/themeContext";

const SideNav = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { theme } = useTheme();

  // Use useMemo to recreate navItems when user or theme changes
  const navItems = useMemo(
    () => [
      {
        icon: <MessageCircle color={theme.text} size={24} />,
        screen: "Home",
      },
      {
        icon: <Compass color={theme.text} size={24} />,
        screen: "ExploreFriends",
      },
      {
        icon: (
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile", { id: user?._id })}
          >
            <Image
              source={{
                uri: user?.profileImage || "https://example.com/default.jpg",
              }}
              style={[styles.profileImage, { borderColor: theme.accent }]}
              key={user?.profileImage || "default"}
            />
          </TouchableOpacity>
        ),
        screen: "Profile",
      },
    ],
    [user, navigation, theme]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.navbar, borderTopColor: theme.border },
      ]}
    >
      {navItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.navItem,
            item.isSpecial && {
              ...styles.specialButtonContainer,
              backgroundColor: theme.accent,
              // shadowColor for iOS, elevation for Android
              ...(Platform.OS === "ios"
                ? { shadowColor: theme.accent }
                : { elevation: 12 }),
            },
          ]}
          onPress={() => navigation.navigate(item.screen, { id: user?._id })}
        >
          <View
            style={[
              styles.icon,
              item.isSpecial && {
                ...styles.glowEffect,
                backgroundColor: theme.accent,
                shadowColor: theme.accent,
              },
            ]}
          >
            {item.icon}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 4,
    borderTopWidth: 1,
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  icon: {
    marginBottom: 2,
  },
  specialButtonContainer: {
    borderRadius: 50,
    padding: 12,
    marginTop: -20,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  glowEffect: {
    borderRadius: 50,
    padding: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    transform: [{ scale: 1.1 }],
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
});

export default SideNav;

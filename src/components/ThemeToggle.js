import { TouchableOpacity, View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../store/themeContext";
import { useRef, useEffect } from "react";
import { Edit, User } from "lucide-react-native";

const ThemeToggle = ({ style }) => {
  const { theme, themeName, toggleTheme } = useTheme();
  const animatedValue = useRef(
    new Animated.Value(themeName === "dark" ? 0 : 1)
  ).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: themeName === "dark" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [themeName]);

  const thumbPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 32],
  });

  return (
    <TouchableOpacity
      style={[
        style,
        { backgroundColor: "transparent", borderColor: "transparent" },
      ]}
      onPress={toggleTheme}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: themeName === "dark" ? "#000000" : "#ffffff",
            borderColor: theme.accent,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.switchThumb,
            {
              backgroundColor: theme.accent,
              left: thumbPosition,
              shadowColor: theme.accent,
            },
          ]}
        />
        <Ionicons
          name={themeName === "dark" ? "moon" : "sunny"}
          size={14}
          color={themeName === "dark" ? "#facc15" : "#4f46e5"}
          style={[styles.iconInside, { left: themeName === "dark" ? 30 : 4 }]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  switchTrack: {
    width: 60,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
  },
  switchThumb: {
    position: "absolute",
    width: 21,
    height: 21,
    borderRadius: 12,
    top: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  iconInside: {
    position: "absolute",
    top: 7,
    zIndex: 1,
  },
});

export default ThemeToggle;

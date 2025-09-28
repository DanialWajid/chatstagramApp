import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../store/themeContext";

const FloatingShape = ({ size, top, left, delay }) => {
  const { theme, themeName } = useTheme();

  // Use theme accent color with different opacity for dark/light mode
  const backgroundColor =
    themeName === "dark"
      ? "rgba(124, 58, 237, 0.18)" // theme.accent, more subtle in dark
      : "rgba(124, 58, 237, 0.13)"; // theme.accent, lighter in light

  // Animation values
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Start animations
  React.useEffect(() => {
    // Y animation
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(100, { duration: 10000, easing: Easing.linear }),
        -1,
        true
      )
    );

    // X animation
    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming(100, { duration: 10000, easing: Easing.linear }),
        -1,
        true
      )
    );

    // Rotation animation
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  // Create animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  // Determine size class
  let sizeStyle = {};
  switch (size) {
    case "w-16 h-16":
      sizeStyle = { width: 64, height: 64 };
      break;
    case "w-24 h-24":
      sizeStyle = { width: 96, height: 96 };
      break;
    case "w-32 h-32":
      sizeStyle = { width: 128, height: 128 };
      break;
    default:
      sizeStyle = { width: 64, height: 64 };
  }

  return (
    <Animated.View
      style={[
        styles.shape,
        { top, left, backgroundColor },
        sizeStyle,
        animatedStyle,
        // Optionally, add a subtle border using theme.accent
        { borderColor: theme.accent, borderWidth: 1 },
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    />
  );
};

const styles = StyleSheet.create({
  shape: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.22,
  },
});

export default FloatingShape;
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import PasswordMeter from "../../components/PasswordStrengthMeter";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../store/themeContext";
import ThemeToggle from "../../components/ThemeToggle";

const Signup = ({ onSignup }) => {
  const navigation = useNavigation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();

  const { signup, error, isLoading } = useAuthStore();

  const handleSignUp = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      return Alert.alert("Error", "Please fill in all fields.");
    }

    setLoading(true);
    try {
      const data = await signup(email, password, username);

      if (data) {
        Alert.alert(
          "Success!",
          `Welcome, ${username}! A verification email has been sent.`
        );
        navigation.navigate("Verification");
      }
    } catch (err) {
      console.error("Signup error:", err);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
      />
      <LinearGradient colors={theme.gradient} style={styles.background}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <ThemeToggle style={styles.toggleContainer} />

          <Text style={[styles.title, { color: theme.accent }]}>
            Create Account
          </Text>

          {/* Username */}
          <View
            style={[styles.inputContainer, { backgroundColor: theme.input }]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={theme.accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Username"
              placeholderTextColor={theme.secondaryText}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Email */}
          <View
            style={[styles.inputContainer, { backgroundColor: theme.input }]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={theme.accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Email"
              placeholderTextColor={theme.secondaryText}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View
            style={[styles.inputContainer, { backgroundColor: theme.input }]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={theme.accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Password"
              placeholderTextColor={theme.secondaryText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={theme.accent}
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Meter */}
          <View style={{ marginBottom: 16 }}>
            <PasswordMeter password={password} />
          </View>

          <TouchableOpacity
            onPress={handleSignUp}
            disabled={isLoading}
            style={[styles.loginButton, { backgroundColor: theme.button }]}
          >
            <Text style={[styles.loginButtonText, { color: theme.buttonText }]}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: theme.secondaryText }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={[styles.signupLink, { color: theme.accent }]}>
                Log in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default Signup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  toggleContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
  },
  eyeIcon: {
    marginLeft: 8,
  },
  loginButton: {
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  signupText: {},
  signupLink: {
    fontWeight: "bold",
  },
});

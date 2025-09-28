import React, { useState } from "react";
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
import { useAuthStore } from "../../store/authStore";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../store/themeContext";
import ThemeToggle from "../../components/ThemeToggle";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const navigation = useNavigation();
  const { login } = useAuthStore();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Error", "Please enter both email and password");
    }

    try {
      setLoading(true);
      const data = await login(email, password);
      if (data.success) {
        navigation.navigate("Home");
        Alert.alert("Success", data.message);
      } else {
        Alert.alert("Invalid Credentials", data.message);
      }
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  async function resetPassword() {
    navigation.navigate("ForgetPassword");
  }

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
            Welcome Back
          </Text>

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

          <TouchableOpacity onPress={resetPassword}>
            <Text style={[styles.forgotPassword, { color: theme.accent }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.button }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={[styles.loginButtonText, { color: theme.buttonText }]}>
              Login
            </Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: theme.secondaryText }]}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={[styles.signupLink, { color: theme.accent }]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default Login;

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
  forgotPassword: {
    textAlign: "left",
    marginBottom: 24,
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
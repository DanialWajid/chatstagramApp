import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Mail, ArrowLeft } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../store/themeContext";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { forgotPassword } = useAuthStore();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Validation", "Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setIsSubmitted(true);
        Alert.alert(
          "Success",
          result.message || "Check your email for the reset link."
        );
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(500)} style={styles.container}>
      <LinearGradient colors={theme.gradient} style={styles.gradientBackground}>
        <View style={styles.innerContainer}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <MaskedView
              style={styles.maskedView}
              maskElement={
                <Text style={styles.headingMask}>Forgot Password</Text>
              }
            >
              <LinearGradient
                colors={["#34D399", "#10B981"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </MaskedView>
            {!isSubmitted ? (
              <>
                <Text
                  style={[styles.description, { color: theme.secondaryText }]}
                >
                  Enter your email address and we'll send you a link to reset
                  your password.
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.input, borderColor: theme.border },
                  ]}
                >
                  <Mail color={theme.secondaryText} size={20} />
                  <TextInput
                    placeholder="Email Address"
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    style={[styles.input, { color: theme.inputText }]}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={[
                    styles.submitButton,
                    { backgroundColor: theme.success },
                  ]}
                  activeOpacity={0.9}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={[styles.buttonText, { color: theme.buttonText }]}
                    >
                      Send Reset Link
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.centered}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.success },
                  ]}
                >
                  <Mail color="white" size={32} />
                </View>
                <Text
                  style={[styles.description, { color: theme.secondaryText }]}
                >
                  If an account exists for {email}, you will receive a password
                  reset link shortly.
                </Text>
              </View>
            )}
          </View>
        </View>
        <View
          style={[
            styles.footer,
            { borderTopColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.backLink}
          >
            <ArrowLeft size={16} color="#34D399" />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default ForgotPasswordPage;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    alignSelf: "center",
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  innerContainer: {
    padding: 20,
    flex: 1,
    justifyContent: "center",
  },
  maskedView: {
    height: 40,
    marginBottom: 20,
  },
  headingMask: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "black",
  },
  description: {
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: 48,
    paddingLeft: 10,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    alignItems: "center",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    color: "#34D399",
    marginLeft: 5,
    fontSize: 14,
  },
});
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient"; // If using Expo
import { useAuthStore } from "../../store/authStore"; // Adjust path
import { useNavigation } from "@react-navigation/native";

const EmailVerificationPage = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const { verifyEmail } = useAuthStore(); // From Zustand or your state logic
  const navigation = useNavigation(); // To navigate after success

  const handleChange = (index, value) => {
    const newCode = [...code];
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || "";
      }
      setCode(newCode);
      const focusIndex = newCode.findLastIndex((d) => d !== "");
      inputRefs.current[focusIndex < 5 ? focusIndex + 1 : 5]?.focus();
    } else {
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 5) inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const verificationCode = code.join("");
    if (verificationCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-digit code.");
      return;
    }

    try {
      await verifyEmail(verificationCode);
      Alert.alert("Success", "Email verified successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Home") }, // or home screen
      ]);
    } catch (error) {
      Alert.alert("Verification Failed", error.message || "Please try again.");
    }
  };

  return (
    <LinearGradient
      colors={["#4c1d95", "#7e22ce", "#6b21a8"]}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.instruction}>
          Enter the 6-digit code sent to your email address.
        </Text>

        <View style={styles.inputContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              style={styles.input}
              maxLength={1}
              keyboardType="numeric"
              value={digit}
              onChangeText={(value) => handleChange(index, value)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.customButton,
            {
              backgroundColor: code.every((digit) => digit)
                ? "#34d399"
                : "#1e1e2f",
            },
          ]}
          onPress={handleSubmit}
          disabled={code.some((digit) => !digit)}
        >
          <Text
            style={[
              styles.buttonText,
              { color: code.every((digit) => digit) ? "#1e1e2f" : "#34d399" },
            ]}
          >
            Verify Email
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1e1e2f",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#34d399",
    textAlign: "center",
    marginBottom: 16,
  },
  instruction: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  input: {
    width: 40,
    height: 50,
    backgroundColor: "#333",
    color: "#34d399",
    textAlign: "center",
    fontSize: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#34d399",
  },
  customButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default EmailVerificationPage;

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Shield, Lock } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";

export default function TwoFactorAuthScreen() {
  const [code, setCode] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const navigation = useNavigation();
  const { verifyTwoFactor, isLoading, error, twoFactorRequired } =
    useAuthStore();

  useEffect(() => {
    // Instead, use AsyncStorage in React Native:
    // const pendingUserId = await AsyncStorage.getItem("pendingUserId");

    if (!pendingUserId && !twoFactorRequired) {
      navigation.navigate("Login");
    } else {
      setIsPageLoading(false);
    }
  }, [navigation, twoFactorRequired]);

  const handleVerification = async () => {
    if (!pendingUserId) {
      Alert.alert("Error", "No pending authentication session");
      return;
    }

    await verifyTwoFactor(code, pendingUserId);
  };

  if (isPageLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Shield size={48} color="#10b981" />
        </View>

        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app
        </Text>

        <TextInput
          style={styles.input}
          placeholder="6-digit code"
          keyboardType="numeric"
          maxLength={6}
          value={code}
          onChangeText={(val) => setCode(val.replace(/\D/g, "").slice(0, 6))}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.button,
            (isLoading || code.length !== 6) && styles.disabled,
          ]}
          onPress={handleVerification}
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Having trouble?{" "}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate("Help2FA")}
          >
            Get help
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#111827",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 5,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#10b981",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#111827",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  error: {
    color: "#ef4444",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  helpText: {
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 16,
  },
  link: {
    color: "#10b981",
    fontWeight: "600",
  },
});

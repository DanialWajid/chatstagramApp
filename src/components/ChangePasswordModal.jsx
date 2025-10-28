import React, { useState, memo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Eye, EyeOff, X } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../store/themeContext";

const PasswordInput = memo(
  ({
    label,
    value,
    onChangeText,
    secureTextEntry,
    toggleVisibility,
    showPassword,
    required,
  }) => {
    const { theme } = useTheme();

    return (
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.input,
              borderColor: theme.border,
            },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            style={[styles.input, { color: theme.inputText }]}
            required={required}
          />
          <TouchableOpacity onPress={toggleVisibility} style={styles.eyeButton}>
            {showPassword ? (
              <EyeOff size={20} color={theme.text} />
            ) : (
              <Eye size={20} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const { changePassword, isLoading, error, message, clearError } =
    useAuthStore();
  const { theme } = useTheme();

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => (scale.value = withSpring(0.95));
  const handlePressOut = () => (scale.value = withSpring(1));

  useEffect(() => {
    return () => {
      clearError();
    };
  }, []);

  const handleSubmit = async () => {
    setValidationError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setValidationError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setValidationError("New password must be at least 8 characters long");
      return;
    }

    if (currentPassword === newPassword) {
      setValidationError(
        "New password must be different from the current password"
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setValidationError("New passwords do not match");
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      if (!error) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.centeredView}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.modalView, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>
          Change Password
        </Text>

        {error && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        )}
        {message && (
          <Text style={[styles.successText, { color: theme.success }]}>
            {message}
          </Text>
        )}
        {validationError && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {validationError}
          </Text>
        )}

        <View style={styles.form}>
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
            toggleVisibility={() =>
              setShowCurrentPassword(!showCurrentPassword)
            }
            showPassword={showCurrentPassword}
            required
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            toggleVisibility={() => setShowNewPassword(!showNewPassword)}
            showPassword={showNewPassword}
            required
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry={!showConfirmNewPassword}
            toggleVisibility={() =>
              setShowConfirmNewPassword(!showConfirmNewPassword)
            }
            showPassword={showConfirmNewPassword}
            required
          />

          <Animated.View style={animatedStyle}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.button }]}
              onPress={handleSubmit}
              disabled={isLoading}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                {isLoading ? "Changing..." : "Change Password"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "90%",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  form: {
    marginTop: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 45,
    padding: 10,
    fontSize: 16,
  },
  eyeButton: {
    padding: 10,
  },
  button: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    marginBottom: 15,
    textAlign: "center",
  },
  successText: {
    marginBottom: 15,
    textAlign: "center",
  },
});

export default ChangePasswordModal;

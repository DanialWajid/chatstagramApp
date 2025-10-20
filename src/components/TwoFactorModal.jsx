"use client";

import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet, //  add this
} from "react-native";
import { X, Shield, ShieldOff, Copy, Check } from "lucide-react-native";

export default function TwoFactorModal({
  isOpen,
  onClose,
  onEnable,
  onDisable,
  isEnabled,
  theme,
}) {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const styles = createStyles(theme);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await onEnable();
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setShowQR(true);
    } catch (error) {
      console.error("Error enabling 2FA:", error);
      Alert.alert("Error", "Failed to enable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await onDisable();
      onClose();
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      Alert.alert("Error", "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    // For React Native, you might want to use a clipboard library
    // For now, we'll just show the copied state
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // If using expo-clipboard:
    // await Clipboard.setStringAsync(secret);
  };

  const renderEnableSection = () => (
    <View style={styles.section}>
      <Text style={styles.description}>
        Two-factor authentication adds an extra layer of security to your
        account. You'll need to enter a code from your authenticator app when
        signing in.
      </Text>
      <TouchableOpacity
        onPress={handleEnable}
        disabled={loading}
        style={[styles.primaryButton, loading && styles.disabledButton]}
      >
        {loading ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator
              size="small"
              color={theme.buttonText || "#ffffff"}
            />
            <Text style={styles.primaryButtonText}>Enabling...</Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            <Shield size={20} color={theme.buttonText || "#ffffff"} />
            <Text style={styles.primaryButtonText}>Enable 2FA</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderQRCodeSection = () => (
    <View style={styles.section}>
      <Text style={styles.description}>
        Scan this QR code with your authenticator app (Google Authenticator,
        Authy, etc)
      </Text>

      <View style={styles.qrContainer}>
        <Image
          source={{ uri: qrCode }}
          style={styles.qrCode}
          resizeMode="contain"
        />
      </View>

      <View style={styles.secretSection}>
        <Text style={styles.secretLabel}>Or enter this secret manually</Text>
        <View style={styles.secretContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.secretText}>{secret}</Text>
          </ScrollView>
          <TouchableOpacity onPress={copySecret} style={styles.copyButton}>
            {copied ? (
              <Check size={20} color="#10b981" />
            ) : (
              <Copy size={20} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          setShowQR(false); //  hide QR after saving
          onClose(); //  close modal
        }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>I've Saved My Backup Codes</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDisableSection = () => (
    <View style={styles.section}>
      <View style={styles.warningContainer}>
        <Text style={styles.warningText}>
          ⚠️ Two-factor authentication is currently enabled for your account.
          Disabling it will make your account less secure.
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleDisable}
        disabled={loading}
        style={[styles.dangerButton, loading && styles.disabledButton]}
      >
        {loading ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator
              size="small"
              color={theme.buttonText || "#ffffff"}
            />
            <Text style={styles.dangerButtonText}>Disabling...</Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            <ShieldOff size={20} color={theme.buttonText || "#ffffff"} />
            <Text style={styles.dangerButtonText}>Disable 2FA</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              {isEnabled ? (
                <ShieldOff size={24} color="#ef4444" />
              ) : (
                <Shield size={24} color="#3b82f6" />
              )}
              <Text style={styles.title}>
                {isEnabled ? "Disable" : "Enable"} Two-Factor Authentication
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            style={{ flexGrow: 0 }}
          >
            {!showQR && !isEnabled && renderEnableSection()}
            {showQR && renderQRCodeSection()}
            {isEnabled && !showQR && renderDisableSection()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContainer: {
      backgroundColor: theme.card || "#ffffff",
      borderRadius: 12,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      maxHeight: "80%",
      borderWidth: 1,
      borderColor: theme.border || "#e5e5e5",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text || "#000000",
    },
    closeButton: {
      padding: 4,
      borderRadius: 20,
    },
    content: {
      flex: 1,
    },
    section: {
      gap: 12,
      marginBottom: 16,
    },
    description: {
      fontSize: 14,
      color: theme.secondaryText || "#666666",
      lineHeight: 20,
    },
    qrContainer: {
      justifyContent: "center",
      alignItems: "center",
      padding: 12,
      backgroundColor: theme.background === "dark" ? "#1f2937" : "#f8fafc",
      borderRadius: 8,
      marginBottom: 8,
    },
    qrCode: {
      width: 192,
      height: 192,
      borderWidth: 2,
      borderColor: theme.border || "#e5e5e5",
      borderRadius: 8,
    },
    secretSection: {
      gap: 8,
    },
    secretLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.secondaryText || "#666666",
    },
    secretContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      backgroundColor: theme.input || "#f3f4f6",
      borderRadius: 8,
      gap: 8,
    },
    secretText: {
      flex: 1,
      fontFamily: "monospace",
      fontSize: 12,
      color: theme.text || "#000000",
    },
    copyButton: {
      padding: 8,
      borderRadius: 6,
    },
    warningContainer: {
      padding: 12,
      backgroundColor: theme.warningBackground || "#fef3c7",
      borderWidth: 1,
      borderColor: theme.warningBorder || "#f59e0b",
      borderRadius: 8,
    },
    warningText: {
      fontSize: 14,
      color: theme.warningText || "#92400e",
      lineHeight: 20,
    },
    buttonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryButton: {
      backgroundColor: theme.accent || "#3b82f6",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    dangerButton: {
      backgroundColor: theme.danger || "#ef4444",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    secondaryButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    disabledButton: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: theme.buttonText || "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    dangerButtonText: {
      color: theme.buttonText || "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButtonText: {
      color: theme.secondaryText || "#666666",
      fontSize: 16,
      fontWeight: "600",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border || "#e5e5e5",
    },
  });

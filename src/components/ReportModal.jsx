import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../store/themeContext";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Square,
  CheckSquare,
} from "lucide-react-native";
import { reportService } from "../services/reportService";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../store/authStore";

const REPORT_CATEGORIES = [
  { id: "spam", label: "Spam", description: "Unwanted repetitive messages" },
  {
    id: "harassment",
    label: "Harassment",
    description: "Bullying or intimidating behavior",
  },
  {
    id: "inappropriate_content",
    label: "Inappropriate Content",
    description: "Offensive or explicit material",
  },
  {
    id: "impersonation",
    label: "Impersonation",
    description: "Fake identity or impersonating someone",
  },
  {
    id: "scam",
    label: "Scam",
    description: "Fraudulent or deceptive behavior",
  },
  { id: "other", label: "Other", description: "Other violation" },
];

const ReportModal = ({ visible, onClose, chatData, reportedUser }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockUser, setBlockUser] = useState(false);

  const API_URL = "http://192.168.100.15:8000/api";

  const dynamicStyles = {
    overlay: {
      ...styles.overlay,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modal: {
      ...styles.modal,
      backgroundColor: theme.background,
    },
    header: {
      ...styles.header,
      borderBottomColor: theme.border,
    },
    input: {
      ...styles.input,
      backgroundColor: theme.input,
      borderColor: theme.border,
      color: theme.text,
    },
    radioButton: {
      ...styles.radioButton,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    radioButtonSelected: {
      ...styles.radioButton,
      backgroundColor: theme.accent + "08",
      borderColor: theme.accent,
    },
    submitButton: {
      ...styles.submitButton,
      backgroundColor: theme.accent,
    },
    cancelButton: {
      ...styles.cancelButton,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert("Error", "Description must be at least 10 characters");
      return;
    }

    if (!reportedUser?._id || !chatData?._id) {
      Alert.alert("Error", "Missing required information. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const reportData = {
        reportedUserId: reportedUser._id,
        chatId: chatData._id,
        reason: selectedCategory,
        description: description.trim(),
      };

      // Submit report first
      const response = await reportService.submitReport(reportData);

      if (response.success || response.report) {
        // If block user checkbox is checked, block the user
        if (blockUser) {
          try {
            const token = await SecureStore.getItemAsync("token");
            console.log(
              "[ReportBlock] Starting block for user:",
              reportedUser._id
            );

            const blockResponse = await axios.post(
              `${API_URL}/user/block-user/${user._id}`,
              {
                userIdToBlock: reportedUser._id,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            console.log(
              "[ReportBlock] Block API Response:",
              blockResponse.data
            );

            if (blockResponse.data.success) {
              // Update the global user state with the blocked list from API response
              useAuthStore.getState().setUser({
                blocked: blockResponse.data.blocked,
              });

              console.log(
                "[ReportBlock] Updated blocked list:",
                blockResponse.data.blocked
              );

              Alert.alert(
                "Success",
                `Report submitted and ${reportedUser.name} has been blocked.`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      resetForm();
                      onClose();
                    },
                  },
                ]
              );
            } else {
              console.log("[ReportBlock] Block API returned success: false");
              Alert.alert(
                "Partial Success",
                "Report submitted but failed to block user.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      resetForm();
                      onClose();
                    },
                  },
                ]
              );
            }
          } catch (blockError) {
            console.error("[ReportBlock] Error blocking user:", blockError);
            console.error(
              "[ReportBlock] Error response:",
              blockError.response?.data
            );
            Alert.alert(
              "Partial Success",
              "Report submitted but failed to block user.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    resetForm();
                    onClose();
                  },
                },
              ]
            );
          }
        } else {
          Alert.alert(
            "Report Submitted",
            "Thank you for your report. We will review it and take appropriate action.",
            [
              {
                text: "OK",
                onPress: () => {
                  resetForm();
                  onClose();
                },
              },
            ]
          );
        }
      } else {
        Alert.alert("Error", response.message || "Failed to submit report");
      }
    } catch (error) {
      let errorMessage = "An error occurred while submitting the report";

      if (error.message.includes("token")) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error.message.includes("Network")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory("");
    setDescription("");
    setBlockUser(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={dynamicStyles.overlay}>
        <View style={dynamicStyles.modal}>
          <View style={dynamicStyles.header}>
            <View style={styles.headerContent}>
              <AlertTriangle size={20} color="#ef4444" strokeWidth={2} />
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Report User
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.infoCard,
                { backgroundColor: theme.cardHighlight || theme.card },
              ]}
            >
              <Text style={[styles.infoText, { color: theme.secondaryText }]}>
                Reporting{" "}
                <Text style={{ fontWeight: "600", color: theme.text }}>
                  {reportedUser?.name}
                </Text>
                {" • "}
                <Text style={{ color: theme.secondaryText }}>
                  {chatData?.isGroupChat ? chatData.chatName : "Direct Message"}
                </Text>
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Reason <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>

            <View style={styles.categoriesContainer}>
              {REPORT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={
                    selectedCategory === category.id
                      ? dynamicStyles.radioButtonSelected
                      : dynamicStyles.radioButton
                  }
                  onPress={() => setSelectedCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioContent}>
                    <View style={styles.radioIndicator}>
                      {selectedCategory === category.id ? (
                        <CheckCircle2
                          size={18}
                          color={theme.accent}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Circle
                          size={18}
                          color={theme.secondaryText}
                          strokeWidth={2}
                        />
                      )}
                    </View>
                    <View style={styles.radioTextContainer}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          {
                            color:
                              selectedCategory === category.id
                                ? theme.accent
                                : theme.text,
                          },
                        ]}
                      >
                        {category.label}
                      </Text>
                      <Text
                        style={[
                          styles.categoryDescription,
                          { color: theme.secondaryText },
                        ]}
                      >
                        {category.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Description <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: theme.secondaryText }]}
            >
              Provide details about the incident (minimum 10 characters)
            </Text>
            <TextInput
              style={[dynamicStyles.input, styles.descriptionInput]}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={theme.secondaryText}
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.charCountContainer}>
              <Text style={[styles.charCount, { color: theme.secondaryText }]}>
                {description.length}/500
              </Text>
            </View>

            {/* Block User Checkbox */}
            <TouchableOpacity
              style={[
                styles.checkboxContainer,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setBlockUser(!blockUser)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxContent}>
                <View style={styles.checkboxIndicator}>
                  {blockUser ? (
                    <CheckSquare
                      size={20}
                      color={theme.accent}
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Square
                      size={20}
                      color={theme.secondaryText}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text
                    style={[
                      styles.checkboxLabel,
                      {
                        color: blockUser ? theme.accent : theme.text,
                      },
                    ]}
                  >
                    Block this user
                  </Text>
                  <Text
                    style={[
                      styles.checkboxDescription,
                      { color: theme.secondaryText },
                    ]}
                  >
                    Prevent this user from contacting you
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View
              style={[
                styles.noteCard,
                {
                  backgroundColor: theme.accent + "08",
                  borderColor: "#e27272ff",
                },
              ]}
            >
              <Text style={[styles.noteText, { color: theme.secondaryText }]}>
                NOTE: Last 20 messages from this chat will be included for
                review
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={dynamicStyles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                dynamicStyles.submitButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "88%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  radioButton: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  radioContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  radioIndicator: {
    marginRight: 10,
  },
  radioTextContainer: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 1,
  },
  categoryDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 40,
  },
  descriptionInput: {
    minHeight: 90,
  },
  charCountContainer: {
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: 20,
  },
  charCount: {
    fontSize: 11,
  },
  checkboxContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  checkboxContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  checkboxIndicator: {
    marginRight: 10,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  checkboxDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  noteCard: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  noteText: {
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  submitButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default ReportModal;

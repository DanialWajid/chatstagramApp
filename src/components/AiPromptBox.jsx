"use client";

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import axios from "axios";
import { useTheme } from "../store/themeContext";
import { Check, X, Copy } from "lucide-react-native";

const AiPromptBox = ({ visible, onClose, onAiReply }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [step, setStep] = useState("input"); // "input", "preview", "confirmed"
  const { theme } = useTheme();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(
        "http://192.168.100.15:8000/api/gemini/auto-message",
        { prompt }
      );
      setGeneratedMessage(res.data.reply);
      setStep("preview");
    } catch (error) {
      console.error("AI Error:", error);
      Alert.alert("Error", "Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    onAiReply(generatedMessage);
    setStep("confirmed");
    // Reset after a brief delay
    setTimeout(() => {
      resetModal();
    }, 1000);
  };

  const handleReject = () => {
    setStep("input");
    setGeneratedMessage("");
  };

  const handleCopyMessage = () => {
    // You can implement clipboard functionality here
    // For now, we'll just set it as the new message
    onAiReply(generatedMessage);
    setStep("confirmed");
    setTimeout(() => {
      resetModal();
    }, 1000);
  };

  const resetModal = () => {
    setPrompt("");
    setGeneratedMessage("");
    setStep("input");
    onClose();
  };

  const dynamicStyles = {
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      borderWidth: 1,
      borderColor: theme.border,
      maxHeight: "80%",
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 16,
      textAlign: "center",
    },
    textInput: {
      backgroundColor: theme.input,
      borderRadius: 12,
      padding: 16,
      color: theme.inputText,
      fontSize: 16,
      minHeight: 100,
      textAlignVertical: "top",
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    previewContainer: {
      backgroundColor: theme.input,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.secondaryText,
      marginBottom: 8,
    },
    generatedMessage: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 22,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    cancelButton: {
      backgroundColor: theme.input,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      flex: 1,
    },
    cancelButtonText: {
      color: theme.secondaryText,
      fontSize: 16,
      fontWeight: "500",
      textAlign: "center",
    },
    generateButton: {
      backgroundColor: theme.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      flex: 1,
    },
    generateButtonDisabled: {
      backgroundColor: theme.input,
      opacity: 0.5,
    },
    generateButtonText: {
      color: theme.buttonText,
      fontSize: 16,
      fontWeight: "500",
      textAlign: "center",
    },
    rejectButton: {
      backgroundColor: theme.input,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    acceptButton: {
      backgroundColor: theme.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    successContainer: {
      alignItems: "center",
      padding: 20,
    },
    successText: {
      fontSize: 16,
      color: theme.text,
      textAlign: "center",
      marginTop: 12,
    },
  };

  const renderInputStep = () => (
    <>
      <Text style={dynamicStyles.title}>Ask AI Assistant</Text>
      <TextInput
        style={dynamicStyles.textInput}
        placeholder="What would you like to say?..."
        placeholderTextColor={theme.secondaryText}
        value={prompt}
        onChangeText={setPrompt}
        multiline
        editable={!loading}
      />
      <View style={dynamicStyles.buttonContainer}>
        <TouchableOpacity
          style={dynamicStyles.cancelButton}
          onPress={resetModal}
          disabled={loading}
        >
          <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            dynamicStyles.generateButton,
            (!prompt.trim() || loading) && dynamicStyles.generateButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!prompt.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size={16} color={theme.buttonText} />
          ) : (
            <Text style={dynamicStyles.generateButtonText}>Generate</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPreviewStep = () => (
    <>
      <Text style={dynamicStyles.title}>AI Generated Message</Text>
      <View style={dynamicStyles.previewContainer}>
        <Text style={dynamicStyles.previewTitle}>Generated Message:</Text>
        <ScrollView>
          <Text style={dynamicStyles.generatedMessage}>{generatedMessage}</Text>
        </ScrollView>
      </View>
      <View style={dynamicStyles.buttonRow}>
        <TouchableOpacity
          style={dynamicStyles.rejectButton}
          onPress={handleReject}
        >
          <X size={20} color={theme.secondaryText} />
          <Text style={dynamicStyles.cancelButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={dynamicStyles.acceptButton}
          onPress={handleAccept}
        >
          <Check size={20} color={theme.buttonText} />
          <Text style={dynamicStyles.generateButtonText}>Use This</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderConfirmedStep = () => (
    <View style={dynamicStyles.successContainer}>
      <Check size={48} color="#10b981" />
      <Text style={dynamicStyles.successText}>Message added to text box!</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={resetModal}
    >
      <View style={dynamicStyles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          {step === "input" && renderInputStep()}
          {step === "preview" && renderPreviewStep()}
          {step === "confirmed" && renderConfirmedStep()}
        </View>
      </View>
    </Modal>
  );
};

export default AiPromptBox;

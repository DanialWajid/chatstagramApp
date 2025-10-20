import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

/**
 * Handles exporting chat messages to a text file
 * @param {Array} messages - Array of chat messages
 * @param {Object} user - Current user object
 * @param {Function} getChatDisplayInfo - Function to get chat display information
 * @param {Function} setShowMenuModal - Function to close the menu modal
 */
export const handleExportChat = async (
  messages,
  user,
  getChatDisplayInfo,
  setShowMenuModal
) => {
  setShowMenuModal(false);
  try {
    // Create chat export content
    const displayInfo = getChatDisplayInfo();
    const chatName = displayInfo.name || "Chat";
    const exportDate = new Date().toLocaleDateString();

    let exportContent = `Chat Export: ${chatName}\nDate: ${exportDate}\n\n`;

    messages.forEach((message) => {
      const timestamp = new Date(message.createdAt).toLocaleString();
      const senderName =
        message.sender._id === user._id
          ? "You"
          : message.sender.name || "Unknown";

      if (message.fileUrl) {
        exportContent += `[${timestamp}] ${senderName}: [File: ${
          message.fileName || "Attachment"
        }]\n`;
      } else {
        exportContent += `[${timestamp}] ${senderName}: ${message.content}\n`;
      }
    });

    // Create a temporary file for sharing
    const fileName = `${chatName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_export_${Date.now()}.txt`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, exportContent);

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        dialogTitle: "Export Chat",
      });
    } else {
      Alert.alert("Success", "Chat exported successfully!");
    }
  } catch (error) {
    console.error("Export error:", error);
    Alert.alert("Error", "Failed to export chat. Please try again.");
  }
};

/**
 * Handles deleting a chat (currently shows not implemented message)
 * @param {Function} setShowMenuModal - Function to close the menu modal
 */
export const handleDeleteChat = (setShowMenuModal) => {
  setShowMenuModal(false);
  Alert.alert("Delete Chat", "This functionality is not implemented yet.", [
    {
      text: "OK",
      style: "default",
    },
  ]);
};

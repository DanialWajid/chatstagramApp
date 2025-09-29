"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useAuthStore } from "../../store/authStore";
import {
  User,
  Send,
  Users,
  Settings,
  Bot,
  Paperclip,
  File,
  Image as ImageIcon,
  Download,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import SocketService from "../../services/socket";
import { useTheme } from "../../store/themeContext";
import AiPromptBox from "../../components/AiPromptBox";

const TypingIndicator = ({ typingUsers }) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length > 0) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [typingUsers.length]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    } else {
      return `${typingUsers[0].name} and ${
        typingUsers.length - 1
      } others are typing...`;
    }
  };

  return (
    <Animated.View style={[styles.typingContainer, { opacity }]}>
      <View style={[styles.typingBubble, { backgroundColor: theme.input }]}>
        <Text style={[styles.typingText, { color: theme.secondaryText }]}>
          {getTypingText()}
        </Text>
        <View style={styles.typingDots}>
          <View
            style={[
              styles.dot,
              styles.dot1,
              { backgroundColor: theme.secondaryText },
            ]}
          />
          <View
            style={[
              styles.dot,
              styles.dot2,
              { backgroundColor: theme.secondaryText },
            ]}
          />
          <View
            style={[
              styles.dot,
              styles.dot3,
              { backgroundColor: theme.secondaryText },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const DateSeparator = ({ date }) => {
  const { theme } = useTheme();

  const formatDate = (dateString) => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDateOnly = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const yesterdayOnly = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    if (messageDateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  return (
    <View style={styles.dateSeparatorContainer}>
      <View
        style={[styles.dateSeparatorLine, { backgroundColor: theme.border }]}
      />
      <View
        style={[styles.dateSeparatorBubble, { backgroundColor: theme.input }]}
      >
        <Text
          style={[styles.dateSeparatorText, { color: theme.secondaryText }]}
        >
          {formatDate(date)}
        </Text>
      </View>
      <View
        style={[styles.dateSeparatorLine, { backgroundColor: theme.border }]}
      />
    </View>
  );
};

const ChatMessage = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileOptions, setShowFileOptions] = useState(false);

  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);

  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const { chatId, chatData } = route.params;
  const API_URL = "http://192.168.0.109:8000/api";

  useEffect(() => {
    console.log("ChatMessage component mounted for chat:", chatId);
    fetchMessages();
    setupSocket();

    return () => {
      console.log("ChatMessage component unmounting");
      cleanupSocket();
    };
  }, [chatId, user._id]);

  const groupMessagesByDate = (messages) => {
    const grouped = [];
    let currentDate = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toDateString();

      if (currentDate !== messageDate) {
        grouped.push({
          type: "date",
          id: `date-${messageDate}`,
          date: message.createdAt,
        });
        currentDate = messageDate;
      }

      grouped.push({
        type: "message",
        ...message,
      });
    });

    return grouped;
  };

  const setupSocket = () => {
    console.log("Setting up socket connection...");

    SocketService.connect(user._id, user.name);

    const checkConnection = setInterval(() => {
      const connected = SocketService.getConnectionStatus();
      setSocketConnected(connected);

      if (connected && !SocketService.hasJoinedChat) {
        console.log("Socket connected, joining chat...");
        SocketService.joinChat(chatId);
        SocketService.hasJoinedChat = true;
      }
    }, 1000);

    SocketService.onMessageReceived((newMessage) => {
      console.log("New message received in component:", newMessage);
      setMessages((prevMessages) => {
        const messageExists = prevMessages.some(
          (msg) => msg._id === newMessage._id
        );
        if (!messageExists) {
          return [...prevMessages, newMessage];
        }
        return prevMessages;
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    SocketService.onTyping((data) => {
      console.log("Typing event received:", data);
      if (data.user._id !== user._id) {
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u._id === data.user._id);
          if (!exists) {
            return [...prev, data.user];
          }
          return prev;
        });
      }
    });

    SocketService.onStopTyping((data) => {
      console.log("Stop typing event received:", data);
      setTypingUsers((prev) => prev.filter((u) => u._id !== data.user._id));
    });

    return () => {
      clearInterval(checkConnection);
    };
  };

  const cleanupSocket = () => {
    console.log("Cleaning up socket listeners...");
    SocketService.offMessageReceived();
    SocketService.offTyping();
    SocketService.hasJoinedChat = false;
    setTypingUsers([]);
  };

  const fetchMessages = async () => {
    try {
      console.log("Fetching messages for chat:", chatId);
      const token = await SecureStore.getItemAsync("token");
      setLoading(true);

      const response = await axios.get(`${API_URL}/message/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched", response.data.length, "messages");
      setMessages(response.data);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 500);
    } catch (error) {
      console.error("Error fetching messages:", error);
      Alert.alert("Error", "Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || sending) return;

    const messageContent = newMessage.trim();
    console.log("Sending message:", messageContent, "with file:", selectedFile);

    setNewMessage("");
    const fileToSend = selectedFile;
    setSelectedFile(null);

    try {
      setSending(true);
      const token = await SecureStore.getItemAsync("token");

      const formData = new FormData();
      formData.append("content", messageContent);
      formData.append("chatId", chatId);

      if (fileToSend) {
        formData.append("file", {
          uri: fileToSend.uri,
          name: fileToSend.name,
          type: fileToSend.type,
        });
      }

      const response = await axios.post(`${API_URL}/message/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const sentMessage = response.data.data || response.data;
      console.log("Message sent successfully:", sentMessage);

      setMessages((prevMessages) => [...prevMessages, sentMessage]);

      if (socketConnected) {
        SocketService.sendMessage(sentMessage);
      }

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      SocketService.stopTyping(chatId);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      setNewMessage(messageContent);
      setSelectedFile(fileToSend);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);

    if (!socketConnected) return;

    SocketService.startTyping(chatId);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      SocketService.stopTyping(chatId);
    }, 3000);

    setTypingTimeout(timeout);
  };

  const handleAiReply = (aiMessage) => {
    setNewMessage(aiMessage);
    setShowAiPrompt(false);
  };

  const getChatDisplayInfo = () => {
    if (!chatData) return { name: "Chat", image: null, isGroup: false };

    if (chatData.isGroupChat) {
      return {
        name: chatData.chatName,
        image: null,
        isGroup: true,
        memberCount: chatData.users.length,
      };
    } else {
      const otherUser = chatData.users.find((u) => u._id !== user._id);
      return {
        name: otherUser?.name || "Unknown User",
        image: otherUser?.profileImage || otherUser?.pic,
        isGroup: false,
      };
    }
  };

  const navigateToGroupSettings = () => {
    if (chatData?.isGroupChat) {
      navigation.navigate("GroupChatSettings", {
        chatId: chatId,
        chatData: chatData,
      });
    }
  };

  const selectImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || "image/jpeg",
          size: asset.fileSize || 0,
        });
        setShowFileOptions(false);
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const selectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size > 10 * 1024 * 1024) {
          Alert.alert("Error", "File size must be less than 10MB");
          return;
        }

        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        });
        setShowFileOptions(false);
      }
    } catch (error) {
      console.error("Error selecting document:", error);
      Alert.alert("Error", "Failed to select document");
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const MessageBubble = ({ item }) => {
    const { theme } = useTheme();
    const isMyMessage = item.sender._id === user._id;
    const isFileMessage = item.type === "file" && item.fileUrl;

    const openFile = async () => {
      if (item.fileUrl) {
        try {
          const fileUrl = item.fileUrl; // Cloudinary URLs are already complete

          const supported = await Linking.canOpenURL(fileUrl);
          if (supported) {
            await Linking.openURL(fileUrl);
          } else {
            Alert.alert("Error", "Cannot open this file type");
          }
        } catch (error) {
          console.error("Error opening file:", error);
          Alert.alert("Error", "Failed to open file");
        }
      }
    };

    const isImage = (fileType) => {
      return fileType && fileType.startsWith("image/");
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (
        Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
      );
    };

    return (
      <View
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.theirMessageWrapper,
        ]}
      >
        {!isMyMessage && chatData?.isGroupChat && (
          <Text style={[styles.senderName, { color: theme.secondaryText }]}>
            {item.sender.name}
          </Text>
        )}

        <View
          style={[
            styles.messageBubble,
            isMyMessage
              ? [styles.myMessageBubble, { backgroundColor: theme.accent }]
              : [styles.theirMessageBubble, { backgroundColor: theme.input }],
          ]}
        >
          {isFileMessage ? (
            <TouchableOpacity onPress={openFile} style={styles.fileContainer}>
              {isImage(item.fileType) ? (
                <View>
                  <Image
                    source={{ uri: item.fileUrl }}
                    style={styles.imageMessage}
                    resizeMode="cover"
                  />
                  {item.content && (
                    <Text
                      style={[
                        styles.messageText,
                        { marginTop: 8 },
                        isMyMessage
                          ? { color: theme.buttonText || "#FFFFFF" }
                          : { color: theme.text },
                      ]}
                    >
                      {item.content}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.documentContainer}>
                  <View style={styles.documentIcon}>
                    <File size={24} color={theme.accent} />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text
                      style={[
                        styles.documentName,
                        isMyMessage
                          ? { color: theme.buttonText || "#FFFFFF" }
                          : { color: theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.fileName || "Document"}
                    </Text>
                    <Text
                      style={[
                        styles.documentSize,
                        isMyMessage
                          ? {
                              color: theme.buttonText || "#FFFFFF",
                              opacity: 0.7,
                            }
                          : { color: theme.secondaryText },
                      ]}
                    >
                      {formatFileSize(item.fileSize || 0)}
                    </Text>
                  </View>
                  <Download
                    size={20}
                    color={
                      isMyMessage
                        ? theme.buttonText || "#FFFFFF"
                        : theme.secondaryText
                    }
                  />
                </View>
              )}

              {item.content && !isImage(item.fileType) && (
                <Text
                  style={[
                    styles.messageText,
                    { marginTop: 8 },
                    isMyMessage
                      ? { color: theme.buttonText || "#FFFFFF" }
                      : { color: theme.text },
                  ]}
                >
                  {item.content}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text
              style={[
                styles.messageText,
                isMyMessage
                  ? { color: theme.buttonText || "#FFFFFF" }
                  : { color: theme.text },
              ]}
            >
              {item.content}
            </Text>
          )}
        </View>

        <Text
          style={[
            styles.timestamp,
            { color: theme.secondaryText },
            isMyMessage ? styles.myTimestamp : styles.theirTimestamp,
          ]}
        >
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    if (item.type === "date") {
      return <DateSeparator date={item.date} />;
    }

    return <MessageBubble item={item} />;
  };

  const displayInfo = getChatDisplayInfo();
  const groupedMessages = groupMessagesByDate(messages);

  const { theme } = useTheme();

  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 50,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },
    headerAvatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.input,
      alignItems: "center",
      justifyContent: "center",
    },
    groupHeaderAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.cardHighlight || theme.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.accent,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.card,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.input,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginRight: 12,
      color: theme.inputText,
      fontSize: 16,
      maxHeight: 100,
    },
    sendButtonActive: {
      backgroundColor: theme.accent,
    },
    sendButtonInactive: {
      backgroundColor: theme.input,
    },
    aiButton: {
      position: "absolute",
      bottom: 80,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  };

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text
          style={{ marginTop: 16, fontSize: 16, color: theme.secondaryText }}
        >
          Loading messages...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={dynamicStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.text }}>
            ←
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={displayInfo.isGroup ? navigateToGroupSettings : undefined}
        >
          {displayInfo.isGroup ? (
            <View style={dynamicStyles.groupHeaderAvatar}>
              <Users size={20} color={theme.accent} />
            </View>
          ) : displayInfo.image ? (
            <Image
              source={{ uri: displayInfo.image }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={dynamicStyles.headerAvatarFallback}>
              <User size={20} color={theme.secondaryText} />
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                textAlign: "center",
                color: theme.text,
              }}
            >
              {displayInfo.name}
              {displayInfo.isGroup && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "normal",
                    color: theme.secondaryText,
                  }}
                >
                  {" "}
                  ({displayInfo.memberCount})
                </Text>
              )}
            </Text>
            {socketConnected && (
              <Text
                style={{ fontSize: 12, color: "#10b981", textAlign: "center" }}
              >
                Online
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {displayInfo.isGroup && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={navigateToGroupSettings}
            >
              <Settings size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          )}
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: socketConnected ? "#10b981" : "#ef4444" },
            ]}
          />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => (item.type === "date" ? item.id : item._id)}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (groupedMessages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text
              style={{
                fontSize: 16,
                textAlign: "center",
                color: theme.secondaryText,
              }}
            >
              {displayInfo.isGroup
                ? "Welcome to the group! Start the conversation!"
                : "No messages yet. Start the conversation!"}
            </Text>
          </View>
        }
        ListFooterComponent={<TypingIndicator typingUsers={typingUsers} />}
      />

      <TouchableOpacity
        style={dynamicStyles.aiButton}
        onPress={() => setShowAiPrompt(true)}
      >
        <Bot size={24} color={theme.buttonText} />
      </TouchableOpacity>

      <AiPromptBox
        visible={showAiPrompt}
        onClose={() => setShowAiPrompt(false)}
        onAiReply={handleAiReply}
      />

      {showFileOptions && (
        <View style={styles.fileOptionsOverlay}>
          <TouchableOpacity
            style={styles.fileOptionsBackdrop}
            onPress={() => setShowFileOptions(false)}
          />
          <View
            style={[
              styles.fileOptionsContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <TouchableOpacity
              style={[styles.fileOption, { borderBottomColor: theme.border }]}
              onPress={selectImageFromGallery}
            >
              <ImageIcon size={24} color={theme.accent} />
              <Text style={[styles.fileOptionText, { color: theme.text }]}>
                Select Image
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fileOption}
              onPress={selectDocument}
            >
              <File size={24} color={theme.accent} />
              <Text style={[styles.fileOptionText, { color: theme.text }]}>
                Select Document
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedFile && (
        <View
          style={[
            styles.selectedFileContainer,
            { backgroundColor: theme.card, borderTopColor: theme.border },
          ]}
        >
          <View style={styles.selectedFileContent}>
            <View style={styles.selectedFileIcon}>
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon size={20} color={theme.accent} />
              ) : (
                <File size={20} color={theme.accent} />
              )}
            </View>
            <View style={styles.selectedFileInfo}>
              <Text
                style={[styles.selectedFileName, { color: theme.text }]}
                numberOfLines={1}
              >
                {selectedFile.name}
              </Text>
              <Text
                style={[
                  styles.selectedFileSize,
                  { color: theme.secondaryText },
                ]}
              >
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
            <TouchableOpacity
              onPress={removeSelectedFile}
              style={styles.removeFileButton}
            >
              <Text style={[styles.removeFileText, { color: theme.accent }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={dynamicStyles.inputContainer}>
        <TouchableOpacity
          style={[styles.attachButton, { backgroundColor: theme.input }]}
          onPress={() => setShowFileOptions(true)}
        >
          <Paperclip size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        <TextInput
          style={[dynamicStyles.textInput, { marginLeft: 8 }]}
          value={newMessage}
          onChangeText={handleTyping}
          placeholder={`Message ${
            displayInfo.isGroup ? displayInfo.name : displayInfo.name
          }...`}
          placeholderTextColor={theme.secondaryText}
          multiline
          maxLength={500}
          editable={!sending}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (newMessage.trim() || selectedFile) && !sending
              ? dynamicStyles.sendButtonActive
              : dynamicStyles.sendButtonInactive,
          ]}
          onPress={sendMessage}
          disabled={(!newMessage.trim() && !selectedFile) || sending}
        >
          {sending ? (
            <ActivityIndicator size={16} color={theme.buttonText} />
          ) : (
            <Send
              size={20}
              color={
                (newMessage.trim() || selectedFile) && !sending
                  ? theme.buttonText
                  : theme.secondaryText
              }
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
    width: 40,
  },
  headerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 16,
  },
  headerTextContainer: {
    alignItems: "center",
    marginLeft: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    width: 40,
    justifyContent: "flex-end",
  },
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    flexGrow: 1,
  },
  dateSeparatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorBubble: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  theirMessageWrapper: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    marginLeft: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginHorizontal: 12,
  },
  myTimestamp: {
    textAlign: "right",
  },
  theirTimestamp: {
    textAlign: "left",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: 14,
    marginRight: 8,
  },
  typingDots: {
    flexDirection: "row",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  fileOptionsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  fileOptionsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  fileOptionsContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  fileOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  fileOptionText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: "500",
  },
  selectedFileContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedFileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedFileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedFileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedFileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  removeFileButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeFileText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  fileContainer: {
    minWidth: 200,
  },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  documentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    minWidth: 200,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: "500",
  },
  documentSize: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default ChatMessage;

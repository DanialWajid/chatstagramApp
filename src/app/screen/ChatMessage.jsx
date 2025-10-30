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
  Modal,
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
  File as ImageIcon,
  Download,
  Phone,
  Mic,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MoreVertical,
  Trash2,
  FileText,
  Ban,
} from "lucide-react-native";
import Slider from "@react-native-community/slider";
import { useNavigation, useRoute } from "@react-navigation/native";
import SocketService from "../../services/socket";
import { useTheme } from "../../store/themeContext";
import AiPromptBox from "../../components/AiPromptBox";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  AudioProfileType,
  AudioScenarioType,
  ConnectionStateType,
  ConnectionChangedReasonType,
} from "react-native-agora";
import { Audio, Video, ResizeMode } from "expo-av";
import VideoMessage from "../../components/videoMessage";
import FileMessage from "../../components/fileMessage";
import { VoiceRecorderControls } from "../../components/voiceNotes";
import VoiceCallModal from "../../components/voiceCallModal";
import CallInfoMessage from "../../components/call-info-message";
import { handleExportChat } from "../../utils/chatMenuUtils";

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
const AudioMessagePlayer = ({ uri }) => {
  const soundRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const ensureLoaded = async () => {
    try {
      if (soundRef.current) {
        const s = await soundRef.current.getStatusAsync();
        if (s.isLoaded) return;
      }

      setIsLoading(true);
      setHasError(false);

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        (s) => setStatus(s),
        true
      );
      soundRef.current = sound;
    } catch (err) {
      console.log("[AudioPlayer] Error loading sound:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPlayer = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
    } catch {}
    soundRef.current = null;
    await ensureLoaded();
  };

  useEffect(() => {
    ensureLoaded();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [uri]);

  useEffect(() => {
    if (status?.didJustFinish && soundRef.current) {
      soundRef.current.setPositionAsync(0);
    }
  }, [status]);

  const togglePlay = async () => {
    try {
      await ensureLoaded();
      if (!soundRef.current) return;

      const s = await soundRef.current.getStatusAsync();
      if (!s.isLoaded) return await resetPlayer();

      if (s.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        if (s.positionMillis >= s.durationMillis) {
          await soundRef.current.setPositionAsync(0);
        }
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.warn("[AudioPlayer] togglePlay error:", err);
      await resetPlayer();
    }
  };

  const seek = async (direction) => {
    try {
      if (!soundRef.current) return;
      const s = await soundRef.current.getStatusAsync();
      if (!s.isLoaded) return;

      const delta = 5000 * (direction === "forward" ? 1 : -1);
      const newPos = Math.min(
        Math.max(s.positionMillis + delta, 0),
        s.durationMillis
      );
      await soundRef.current.setPositionAsync(newPos);
    } catch (err) {
      console.warn("[AudioPlayer] seek error:", err);
    }
  };

  if (hasError)
    return (
      <Text style={{ color: "red", padding: 8 }}>
        Audio format not supported
      </Text>
    );

  return (
    <View style={{ padding: 12, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => seek("backward")} disabled={isLoading}>
          <SkipBack size={28} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlay}
          disabled={isLoading}
          style={{ marginHorizontal: 12 }}
        >
          {status?.isPlaying ? (
            <Pause size={36} color="#2196F3" />
          ) : (
            <Play size={36} color="#2196F3" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => seek("forward")} disabled={isLoading}>
          <SkipForward size={28} color="#555" />
        </TouchableOpacity>
      </View>

      <Slider
        style={{ width: 250, marginTop: 10 }}
        minimumValue={0}
        maximumValue={status?.durationMillis || 1}
        value={status?.positionMillis || 0}
        onSlidingComplete={async (val) => {
          if (soundRef.current) {
            await soundRef.current.setPositionAsync(val);
          }
        }}
        minimumTrackTintColor="#2196F3"
        maximumTrackTintColor="#ccc"
      />

      <Text style={{ marginTop: 6, color: "#666" }}>
        {formatTime(status?.positionMillis)} /{" "}
        {formatTime(status?.durationMillis)}
      </Text>
    </View>
  );
};

function formatTime(millis) {
  if (!millis) return "0:00";
  const totalSec = Math.floor(millis / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function ChatMessage({
  user,
  displayInfo: propDisplayInfo,
  onNavigateToGroupSettings,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [isOtherUserBlocked, setIsOtherUserBlocked] = useState(false);

  const [imagePreview, setImagePreview] = useState({
    visible: false,
    url: "",
    fromMe: false,
  });
  const [docPreview, setDocPreview] = useState({
    visible: false,
    url: "",
    name: "",
    type: "",
    fromMe: false,
  });
  const [videoPreview, setVideoPreview] = useState({
    visible: false,
    url: "",
    fromMe: false,
  });
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedMap, setDownloadedMap] = useState({});
  const [docWebError, setDocWebError] = useState(false);

  const [calling, setCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState(null);
  const [callTimeout, setCallTimeout] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [calleeInfo, setCalleeInfo] = useState(null);
  const [showMenuModal, setShowMenuModal] = useState(false);

  const engineRef = useRef(null); // Changed from agoraEngineRef to engineRef to match error
  const agoraHandlerRef = useRef(null);

  const formatMillis = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const startVoiceRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Permission required",
          "Microphone permission is needed to record voice messages."
        );
        return;
      }

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await rec.startAsync();

      recordingRef.current = rec;
      setRecordingDuration(0);
      setIsRecording(true);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(async () => {
        try {
          const status = await rec.getStatusAsync();
          if (
            status?.isRecording &&
            typeof status.durationMillis === "number"
          ) {
            setRecordingDuration(status.durationMillis);
          }
        } catch {}
      }, 250);
    } catch (e) {
      console.log("[v0] startVoiceRecording error:", e?.message);
      Alert.alert("Error", "Failed to start recording");
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      const rec = recordingRef.current;
      if (!rec) return null;

      await rec.stopAndUnloadAsync();

      // ✅ get final status after stopping
      const status = await rec.getStatusAsync();
      const finalDuration = status?.durationMillis || 0;

      const uri = rec.getURI();
      recordingRef.current = null;

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setIsRecording(false);
      setRecordingDuration(finalDuration); // ✅ update duration properly

      if (uri) {
        // get file size and set as selected file to reuse existing send flow
        const info = await FileSystem.getInfoAsync(uri);
        const name = `voice_${Date.now()}.m4a`;
        const fileObj = {
          uri,
          name,
          type: "audio/m4a",
          size: info?.size ?? 0,
          duration: finalDuration,
        };
        setSelectedFile(fileObj);
        return fileObj;
      }

      return null;
    } catch (e) {
      console.log("[v0] stopVoiceRecording error:", e?.message);
      setIsRecording(false);
      return null;
    } finally {
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch {}
    }
  };

  const stopAndSendVoiceRecording = async () => {
    const fileObj = await stopVoiceRecording();
    if (fileObj && fileObj.uri) {
      // send immediately with the recorded audio file
      await sendMessage(fileObj);
    }
  };

  const cancelVoiceRecording = async () => {
    try {
      const rec = recordingRef.current;
      if (rec) {
        try {
          await rec.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
      }
    } catch {}
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
    setIsRecording(false);
  };

  const { user: authUser } = useAuthStore(); // Renamed to avoid conflict with the prop 'user'
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);

  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const API_URL = "http://192.168.100.15:8000/api";
  const CALL_URL = API_URL.replace("/api", "/call");
  const AGORA_APP_ID = "e7f6e9aeecf14b2ba10e3f40be9f56e7";
  const { chatId } = route.params;

  console.log("[ChatMessage] Component render - chatId:", chatId);
  console.log("[ChatMessage] authUser:", authUser);
  console.log("[ChatMessage] isOtherUserBlocked:", isOtherUserBlocked);

  const fetchAgoraToken = async (channelName, uid = 0) => {
    try {
      const { data } = await axios.post(`${CALL_URL}/token`, {
        channelName: String(channelName),
        uid,
      });
      return data?.token;
    } catch (e) {
      console.log("[v0] fetchAgoraToken error:", e?.message);
      return undefined;
    }
  };

  const sendCallInfoMessage = async (
    callStatus,
    duration = 0,
    callerName = ""
  ) => {
    try {
      const token = await SecureStore.getItemAsync("token");

      const callInfoData = {
        content: `Call ${callStatus}`,
        chatId,
        type: "call",
        callStatus, // "missed", "rejected", "ended"
        duration, // in seconds
        callerName,
      };

      const response = await axios.post(`${API_URL}/message/`, callInfoData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const callMessage = response.data.data || response.data;
      console.log("[v0] Call info message sent:", callMessage);

      setMessages((prevMessages) => [...prevMessages, callMessage]);

      if (socketConnected) {
        SocketService.sendMessage(callMessage);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("[v0] Error sending call info message:", error);
    }
  };

  const handleDeleteChat = async () => {
    setShowMenuModal(false);
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Deleting chat with ID:", chatId);
              const deleteUrl = `${API_URL}/chat/${chatId}`;
              console.log("Delete URL:", deleteUrl);

              const token = await SecureStore.getItemAsync("token");
              console.log("Token present:", !!token);

              const response = await axios.delete(deleteUrl, {
                headers: { Authorization: `Bearer ${token}` },
              });

              console.log("Delete response:", response.data);
              Alert.alert("Success", "Chat deleted successfully");
              navigation.navigate("Home");
            } catch (error) {
              console.error("Delete chat error:", error);
              console.error("Error details:", {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
              });
              Alert.alert("Error", "Failed to delete chat. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleBlockUnblock = async () => {
    setShowMenuModal(false);

    const chatData = route.params?.chatData;
    if (!chatData || chatData.isGroupChat) {
      Alert.alert("Error", "Cannot block in group chats");
      return;
    }

    const otherUser = chatData.users.find((u) => u._id !== authUser._id);
    if (!otherUser) {
      Alert.alert("Error", "User not found");
      return;
    }

    const action = isOtherUserBlocked ? "Unblock" : "Block";
    const actionLower = action.toLowerCase();

    Alert.alert(
      `${action} User`,
      `Are you sure you want to ${actionLower} ${otherUser.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: isOtherUserBlocked ? "default" : "destructive",
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync("token");
              console.log(
                `[${action}] Starting ${actionLower} for user:`,
                otherUser._id
              );
              console.log(`[${action}] Current user ID:`, authUser._id);

              const endpoint = isOtherUserBlocked
                ? `${API_URL}/user/unblock-user/${authUser._id}`
                : `${API_URL}/user/block-user/${authUser._id}`;

              const bodyKey = isOtherUserBlocked
                ? "userIdToUnblock"
                : "userIdToBlock";

              const response = await axios.post(
                endpoint,
                { [bodyKey]: otherUser._id },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              console.log(`[${action}] API Response:`, response.data);

              if (response.data.success) {
                // Update the global user state with the blocked list from API response
                useAuthStore.getState().setUser({
                  blocked: response.data.blocked,
                });

                console.log(
                  `[${action}] Updated blocked list:`,
                  response.data.blocked
                );

                // Update local state
                setIsOtherUserBlocked(!isOtherUserBlocked);

                Alert.alert(
                  "Success",
                  `User ${otherUser.name} has been ${actionLower}ed.`
                );

                // Re-check blocked status
                checkIfUserBlocked();
              } else {
                console.log(`[${action}] API returned success: false`);
                Alert.alert(
                  "Error",
                  response.data.message || `Failed to ${actionLower} user`
                );
              }
            } catch (error) {
              console.error(`[${action}] Error:`, error);
              console.error(
                `[${action}] Error response:`,
                error.response?.data
              );
              Alert.alert(
                "Error",
                error.response?.data?.message ||
                  `Failed to ${actionLower} the user. Please try again.`
              );
            }
          },
        },
      ]
    );
  };

  const handleExportChatPress = () => {
    const getChatDisplayInfo = () => displayInfo;
    handleExportChat(messages, authUser, getChatDisplayInfo, setShowMenuModal);
  };

  useEffect(() => {
    console.log("ChatMessage component mounted for chat:", chatId);
    fetchMessages();
    checkIfUserBlocked();
    setupSocket();

    return () => {
      console.log("ChatMessage component unmounting");
      cleanupSocket();
      endVoiceCall();
      try {
        cancelVoiceRecording();
      } catch {}
    };
  }, [chatId, authUser._id]); // Use authUser._id here

  useEffect(() => {
    console.log(
      "[BlockCheck] isOtherUserBlocked state changed to:",
      isOtherUserBlocked
    );
  }, [isOtherUserBlocked]);

  // Re-check blocked status when authUser.blocked changes
  useEffect(() => {
    if (authUser?.blocked) {
      console.log("[BlockCheck] AuthUser blocked list changed, re-checking...");
      checkIfUserBlocked();
    }
  }, [authUser?.blocked]);

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

    SocketService.connect(authUser._id, authUser.name); // Use authUser._id and authUser.name

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
      if (data.user._id !== authUser._id) {
        // Use authUser._id
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

    SocketService.socket?.on("call:initiate", (data) => {
      console.log("[v0] Incoming call from:", data.from);

      if (data.from._id === authUser._id) {
        // Use authUser._id
        console.log("[v0] Ignoring own call event");
        return;
      }

      setIncomingCallFrom(data.from);
      setIsRinging(true);

      const timeout = setTimeout(() => {
        console.log("[v0] Call timeout - no response");
        setIsRinging(false);
        setIncomingCallFrom(null);
        Alert.alert("Missed Call", `Call from ${data.from.name} ended`);
        sendCallInfoMessage("missed", 0, data.from.name);
      }, 30000);
      setCallTimeout(timeout);
    });

    SocketService.socket?.on("call:accept", (data) => {
      console.log("[v0] Call accepted by:", data.from);
      setCalling(false);
      setIsRinging(false);
      setCallStartTime(Date.now());
      startAgoraConnection();
    });

    SocketService.socket?.on("call:reject", (data) => {
      console.log("[v0] Call rejected by:", data.from);
      setCalleeInfo(null);
      setCalling(false);
      setIsRinging(false);
      setIncomingCallFrom(null);

      // Send call rejected message
      sendCallInfoMessage("rejected");

      Alert.alert("Call Rejected", "The recipient rejected your call.");
    });

    // Socket listener for call timeout
    SocketService.socket?.on("call:timeout", (data) => {
      console.log("[v0] Call timed out");
      setCalleeInfo(null);
      setCalling(false);
      setIsRinging(false);
      setIncomingCallFrom(null);

      // Send call missed message
      sendCallInfoMessage("missed");

      Alert.alert("Call Missed", "The recipient did not answer the call.");
    });

    return () => {
      clearInterval(checkConnection);
    };
  };

  const cleanupSocket = () => {
    console.log("Cleaning up socket listeners...");
    SocketService.offMessageReceived();
    SocketService.offTyping();
    SocketService.socket?.off("call:initiate");
    SocketService.socket?.off("call:accept");
    SocketService.socket?.off("call:reject");
    SocketService.socket?.off("call:end");
    SocketService.hasJoinedChat = false;
    setTypingUsers([]);
  };

  const checkIfUserBlocked = async () => {
    try {
      const chatData = route.params?.chatData;

      console.log("[BlockCheck] Starting blocked check...");
      console.log("[BlockCheck] Chat data:", chatData);

      // Only check for one-on-one chats, not group chats
      if (!chatData || chatData.isGroupChat) {
        console.log("[BlockCheck] Skipping - is group chat or no chat data");
        setIsOtherUserBlocked(false);
        return;
      }

      const otherUser = chatData.users.find((u) => u._id !== authUser._id);
      console.log("[BlockCheck] Other user:", otherUser);
      console.log("[BlockCheck] Current user (authUser):", authUser._id);
      console.log("[BlockCheck] AuthUser object:", authUser);
      console.log("[BlockCheck] AuthUser blocked array:", authUser.blocked);

      if (!otherUser) {
        console.log("[BlockCheck] No other user found");
        setIsOtherUserBlocked(false);
        return;
      }

      // If blocked array is not available in authUser, fetch it from API
      let blockedList = [];
      if (!authUser.blocked || !Array.isArray(authUser.blocked)) {
        console.log(
          "[BlockCheck] Blocked array not in authUser, fetching from API..."
        );
        try {
          const token = await SecureStore.getItemAsync("token");
          const response = await axios.get(
            `${API_URL}/profile/getProfile/${authUser._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          blockedList = Array.isArray(response.data.blocked)
            ? response.data.blocked
            : [];
          console.log(
            "[BlockCheck] Fetched blocked list from API:",
            blockedList
          );
        } catch (apiError) {
          console.error("[BlockCheck] Error fetching profile:", apiError);
          blockedList = [];
        }
      } else {
        blockedList = authUser.blocked;
      }

      // Check if the other user is in the blocked list
      const isBlocked = blockedList.some((blockedId) => {
        // blockedId might be an object with _id or just an ID string
        const idToCheck =
          typeof blockedId === "object" ? blockedId._id : blockedId;
        return idToCheck?.toString() === otherUser._id.toString();
      });

      console.log("[BlockCheck] Blocked list:", blockedList);
      console.log("[BlockCheck] Other user ID:", otherUser._id);
      console.log("[BlockCheck] Is user blocked:", isBlocked);

      setIsOtherUserBlocked(isBlocked);
      console.log("[BlockCheck] User blocked status set to:", isBlocked);
    } catch (error) {
      console.error("[BlockCheck] Error checking blocked status:", error);
      console.error("[BlockCheck] Error details:", error.message);
      setIsOtherUserBlocked(false);
    }
  };

  const fetchMessages = async () => {
    try {
      console.log("[v0] Fetching messages for chat:", chatId);

      if (!chatId) {
        console.error("[v0] chatId is undefined or empty");
        Alert.alert("Error", "Chat ID is missing");
        return;
      }

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        console.error("[v0] Token not found in secure storage");
        Alert.alert("Error", "Authentication token missing");
        return;
      }

      setLoading(true);

      const response = await axios.get(`${API_URL}/message/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[v0] Fetched", response.data.length, "messages");
      setMessages(response.data);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 500);
    } catch (error) {
      console.error("[v0] Error fetching messages:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
      });
      Alert.alert(
        "Error",
        `Failed to load messages: ${
          error?.response?.data?.message || error?.message
        }`
      );
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const getMessageKey = (item) =>
    item?._id ||
    item?.fileUrl ||
    item?.fileName ||
    String(item?.createdAt || "");

  const getLocalTargetForItem = (item) => {
    if (!item?.fileUrl && !item?.fileName) return null;
    const isImage = (t) => t && t.startsWith("image/");
    const fromUrl = item?.fileUrl?.split("/")?.pop() || "";
    const baseName =
      item?.fileName ||
      fromUrl ||
      (isImage(item?.fileType)
        ? `image_${item?._id || Date.now()}.jpg`
        : `file_${item?._id || Date.now()}`);
    const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(baseName);
    const extFromType = item?.fileType?.split("/")[1] || (hasExt ? "" : "bin");
    const safeName = hasExt
      ? baseName
      : `${baseName}${extFromType ? `.${extFromType}` : ""}`;
    return FileSystem.documentDirectory + safeName;
  };

  const isAudioFile = (fileType, fileName = "") => {
    const t = (fileType || "").toLowerCase();
    if (t.startsWith("audio/")) return true;
    const n = (fileName || "").toLowerCase();
    return [".m4a", ".aac", ".mp3", ".wav", ".ogg", ".amr", ".caf"].some(
      (ext) => n.endsWith(ext)
    );
  };

  const isVideoFile = (fileType, fileName = "") => {
    const t = (fileType || "").toLowerCase();
    if (t.startsWith("video/")) return true;
    const n = (fileName || "").toLowerCase();
    return [".mp4", ".mov", ".m4v", ".avi", ".webm", ".3gp", ".mkv"].some(
      (ext) => n.endsWith(ext)
    );
  };

  const getDocPreviewUrl = (url, type) => {
    try {
      const lower = (type || "").toLowerCase();
      if (lower.includes("pdf")) return url;

      const cleanUrl = (url || "").split("#")[0].split("?")[0];
      const ext = cleanUrl.includes(".")
        ? cleanUrl.split(".").pop().toLowerCase()
        : "";

      const officeExts = [
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "pps",
        "ppsx",
        "csv",
      ];
      const isOfficeByExt = officeExts.includes(ext);
      const isOfficeByMime =
        lower.includes("msword") ||
        lower.includes("excel") ||
        lower.includes("powerpoint") ||
        lower.includes("officedocument");

      if (isOfficeByExt || isOfficeByMime) {
        return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
          url
        )}`;
      }

      return `https://docs.google.com/viewer?embedded=1&url=${encodeURIComponent(
        url
      )}`;
    } catch {
      return url;
    }
  };

  const getDisplayFileName = (item) => {
    if (item?.fileName && typeof item.fileName === "string")
      return item.fileName;
    const url = item?.fileUrl || "";
    try {
      const last = url.split("/").pop() || "";
      return decodeURIComponent(last) || "Document";
    } catch {
      return "Document";
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const updates = {};
      const fileMessages = messages.filter(
        (m) => m?.type === "file" && m?.fileUrl
      );
      await Promise.all(
        fileMessages.map(async (m) => {
          const key = getMessageKey(m);
          const target = getLocalTargetForItem(m);
          if (!target) return;
          try {
            const info = await FileSystem.getInfoAsync(target);
            updates[key] = { exists: !!info.exists, uri: target };
          } catch {
            updates[key] = { exists: false, uri: target };
          }
        })
      );
      if (!cancelled && Object.keys(updates).length) {
        setDownloadedMap((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messages]);

  const sendMessage = async (fileOverride) => {
    const isValidFileOverride =
      fileOverride &&
      typeof fileOverride === "object" &&
      "uri" in fileOverride &&
      typeof fileOverride.uri === "string";

    if (
      (!newMessage.trim() && !selectedFile && !isValidFileOverride) ||
      sending
    )
      return;

    const messageContent = newMessage.trim();
    console.log(
      "Sending message:",
      messageContent,
      "with file:",
      isValidFileOverride ? fileOverride : selectedFile
    );

    setNewMessage("");
    const fileToSend = isValidFileOverride ? fileOverride : selectedFile;
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
      if (isValidFileOverride) {
        setSelectedFile(fileOverride);
      } else {
        setSelectedFile(fileToSend);
      }
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
    // const chatData = route.params?.chatData; // Assuming chatData is passed via route params
    const chatData = route.params?.chatData; // <-- Fix: Added declaration for chatData
    if (!chatData) return { name: "Chat", image: null, isGroup: false };

    if (chatData.isGroupChat) {
      return {
        name: chatData.chatName,
        image: chatData.groupProfilePic || null,
        isGroup: true,
        memberCount: chatData.users.length,
      };
    } else {
      const otherUser = chatData.users.find((u) => u._id !== authUser._id); // Use authUser._id
      return {
        name: otherUser?.name || "Unknown User",
        image: otherUser?.profileImage || otherUser?.pic,
        isGroup: false,
      };
    }
  };

  const navigateToGroupSettings = () => {
    const chatData = route.params?.chatData; // <-- Fix: Added declaration for chatData
    if (chatData?.isGroupChat) {
      navigation.navigate("GroupChatSettings", {
        chatId: chatId,
        chatData: chatData,
      });
    }
  };

  const selectVideoFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Media library permission is needed to pick videos."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const last = asset.uri.split("/").pop() || `video_${Date.now()}`;
        const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(last);
        const name = asset.fileName || (hasExt ? last : `${last}.mp4`);
        setSelectedFile({
          uri: asset.uri,
          name,
          type: "video/mp4",
          size: asset.fileSize || 0,
        });
        setShowFileOptions(false);
      }
    } catch (e) {
      console.log("[v0] selectVideoFromLibrary error:", e?.message);
      Alert.alert("Error", "Failed to select video");
    }
  };

  const recordVideoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Camera permission is needed to record videos."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 60,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const last = asset.uri.split("/").pop() || `video_${Date.now()}`;
        const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(last);
        const name = asset.fileName || (hasExt ? last : `${last}.mp4`);
        setSelectedFile({
          uri: asset.uri,
          name,
          type: "video/mp4",
          size: asset.fileSize || 0,
        });
        setShowFileOptions(false);
      }
    } catch (e) {
      console.log("[v0] recordVideoWithCamera error:", e?.message);
      Alert.alert("Error", "Failed to record video");
    }
  };

  const selectImageFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Media library permission is needed to pick images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const last = asset.uri.split("/").pop() || `image_${Date.now()}`;
        const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(last);
        const name = asset.fileName || (hasExt ? last : `${last}.jpg`);

        setSelectedFile({
          uri: asset.uri,
          name,
          type: asset.type?.startsWith("image") ? "image/jpeg" : "image/jpeg",
          size: asset.fileSize || 0,
        });
        setShowFileOptions(false);
      }
    } catch (error) {
      console.error("[v0] Error selecting image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const selectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.size > 10 * 1024 * 1024) {
          Alert.alert("Error", "File size must be less than 10MB");
          return;
        }

        setSelectedFile({
          uri: asset.uri,
          name: asset.name || `file_${Date.now()}`,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size ?? 0,
        });
        setShowFileOptions(false);
      }
    } catch (error) {
      console.error("[v0] Error selecting document:", error);
      Alert.alert("Error", "Failed to select document");
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const downloadFile = async (fileUrl, messageId) => {
    try {
      setDownloadingId(messageId);
      const result = await FileSystem.downloadAsync(
        fileUrl,
        FileSystem.documentDirectory + fileUrl.split("/").pop()
      );
      console.log("Downloaded file to:", result.uri);
      await Sharing.shareAsync(result.uri);
    } catch (error) {
      console.error("Error downloading file:", error);
      Alert.alert("Error", "Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  const MessageBubble = ({ item }) => {
    const { theme } = useTheme();
    const isMyMessage = item.sender._id === authUser._id; // Use authUser._id
    const isCallInfoMessage = item.type === "call";
    const isFileMessage = item.type === "file" && item.fileUrl;
    const msgKey = getMessageKey(item);
    const localInfo = downloadedMap[msgKey];

    const openPreview = () => {
      if (!item.fileUrl) return;
      if (isAudioFile(item.fileType, item.fileUrl)) {
        // audio handled inline
      } else if (item.fileType && item.fileType.startsWith("image/")) {
        setImagePreview({
          visible: true,
          url: item.fileUrl,
          fromMe: isMyMessage,
        });
      } else if (isVideoFile(item.fileType, item.fileUrl)) {
        setVideoPreview({
          visible: true,
          url: item.fileUrl,
          fromMe: isMyMessage,
        });
      } else {
        setDocWebError(false);
        setDocPreview({
          visible: true,
          url: item.fileUrl,
          name: getDisplayFileName(item),
          type: item.fileType || "application/octet-stream",
          fromMe: isMyMessage,
        });
      }
    };

    const downloadCurrent = async () => {
      try {
        const url = item.fileUrl;
        const target = getLocalTargetForItem(item);

        setDownloadingId(item._id || msgKey);
        const { uri } = await FileSystem.downloadAsync(url, target);
        setDownloadedMap((prev) => ({
          ...prev,
          [msgKey]: { exists: true, uri },
        }));

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert("Downloaded", `Saved to app documents`);
        }
      } catch (err) {
        console.error("Download error:", err);
        Alert.alert("Error", "Failed to download file");
      } finally {
        setDownloadingId(null);
      }
    };

    const openLocal = async () => {
      const uri = localInfo?.uri;
      if (!uri) {
        Alert.alert("Not found", "File is not available locally yet.");
        return;
      }
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert("Saved", `File available at: ${uri}`);
        }
      } catch (e) {
        console.error("Open local error:", e);
        Alert.alert("Error", "Failed to open local file");
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
        {!isMyMessage &&
          route.params?.chatData?.isGroupChat && ( // <-- Fix: Use route.params?.chatData to access isGroupChat
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
          {isCallInfoMessage ? (
            <CallInfoMessage item={item} isMyMessage={isMyMessage} />
          ) : isFileMessage ? (
            <TouchableOpacity
              onPress={openPreview}
              style={styles.fileContainer}
              activeOpacity={0.9}
            >
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
                  <View style={styles.inlineActions}>
                    {localInfo?.exists ? (
                      <TouchableOpacity
                        style={[
                          styles.inlineActionBtn,
                          {
                            backgroundColor: isMyMessage
                              ? "rgba(255,255,255,0.2)"
                              : "#00000020",
                          },
                        ]}
                        onPress={openLocal}
                      >
                        <Text
                          style={[
                            styles.inlineActionText,
                            { color: isMyMessage ? "#fff" : "#000" },
                          ]}
                        >
                          Open
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.inlineActionBtn,
                          {
                            backgroundColor: isMyMessage
                              ? "rgba(255,255,255,0.2)"
                              : "#00000020",
                          },
                        ]}
                        onPress={downloadCurrent}
                      >
                        {downloadingId === (item._id || msgKey) ? (
                          <ActivityIndicator
                            size={14}
                            color={isMyMessage ? "#fff" : "#000"}
                          />
                        ) : (
                          <Download
                            size={16}
                            color={isMyMessage ? "#fff" : "#000"}
                          />
                        )}
                        <Text
                          style={[
                            styles.inlineActionText,
                            { color: isMyMessage ? "#fff" : "#000" },
                          ]}
                        >
                          Download
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : isAudioFile(item.fileType, item.fileUrl) ? (
                <AudioMessagePlayer
                  uri={item.fileUrl}
                  isMyMessage={isMyMessage}
                />
              ) : isVideoFile(item.fileType, item.fileUrl) ? (
                <VideoMessage
                  item={item}
                  isMyMessage={isMyMessage}
                  localInfo={localInfo}
                  onOpenLocal={openLocal}
                  onDownload={downloadCurrent}
                />
              ) : (
                <FileMessage
                  item={item}
                  isMyMessage={isMyMessage}
                  localInfo={localInfo}
                  onPreview={openPreview}
                  onDownload={downloadCurrent}
                  onOpenLocal={openLocal}
                  getDisplayFileName={getDisplayFileName}
                  formatFileSize={formatFileSize}
                />
              )}

              {item.content &&
                !(item.fileType && item.fileType.startsWith("image/")) &&
                !isVideoFile(item.fileType, item.fileUrl) && (
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

  const requestMicrophonePermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Microphone Required",
        "Please enable microphone access to place a call."
      );
      return false;
    }
    return true;
  };

  const initiateVoiceCall = async () => {
    try {
      const micOk = await requestMicrophonePermission();
      if (!micOk) return;

      setCalling(true);

      const chatData = route.params?.chatData;
      const otherUser = chatData?.users.find((u) => u._id !== authUser._id);
      setCalleeInfo(otherUser);

      // Emit call initiation event to other user
      SocketService.socket?.emit("call:initiate", {
        to: otherUser?._id,
        from: {
          _id: authUser._id,
          name: authUser.name,
        },
        chatId,
      });

      console.log("[v0] Call initiated to:", otherUser?.name);
    } catch (e) {
      console.log("[v0] initiateVoiceCall error:", e.message);
      Alert.alert("Call Failed", "Unable to initiate the call.");
      setCalling(false);
    }
  };

  const startAgoraConnection = async () => {
    try {
      if (!AGORA_APP_ID) {
        Alert.alert(
          "Missing config",
          "AGORA_APP_ID is not set. Please set EXPO_PUBLIC_AGORA_APP_ID or NEXT_PUBLIC_AGORA_APP_ID."
        );
        return;
      }

      const token = await fetchAgoraToken(chatId, 0);
      if (!token) {
        setCalling(false);
        Alert.alert("Token Error", "Failed to get Agora token.");
        return;
      }

      let engine = engineRef.current;
      if (!engine) {
        engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({
          appId: AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.setAudioProfile(
          AudioProfileType.AudioProfileDefault,
          AudioScenarioType.AudioScenarioCommunication
        );

        try {
          engine.enableAudio && engine.enableAudio();
          engine.enableLocalAudio && engine.enableLocalAudio(true);
          if (typeof engine.setDefaultAudioRouteToSpeakerphone === "function") {
            engine.setDefaultAudioRouteToSpeakerphone(true);
          }
        } catch (e) {
          console.log("[v0] enable audio/route error:", e.message);
        }
      }

      if (
        agoraHandlerRef.current &&
        typeof engine.unregisterEventHandler === "function"
      ) {
        try {
          engine.unregisterEventHandler(agoraHandlerRef.current);
        } catch {}
      }

      const handler = {
        onJoinChannelSuccess: () => {
          setInCall(true);
          setCalling(false);
          setCallStartTime(Date.now());
        },
        onUserJoined: (uid) => {
          setRemoteUid(uid);
        },
        onUserOffline: (uid) => {
          if (remoteUid === uid) setRemoteUid(null);
        },
        onError: (err) => {
          console.log("[v0] Agora Error:", err);
        },
        onTokenPrivilegeWillExpire: async () => {
          try {
            const newToken = await fetchAgoraToken(chatId, 0);
            if (newToken) {
              engine.renewToken && engine.renewToken(newToken);
            }
          } catch (e) {
            console.log("[v0] renew token error:", e.message);
          }
        },
        onConnectionStateChanged: async (state, reason) => {
          if (
            reason ===
              ConnectionChangedReasonType.ConnectionChangedRejectedByServer ||
            reason ===
              ConnectionChangedReasonType.ConnectionChangedTokenExpired ||
            reason === ConnectionChangedReasonType.ConnectionChangedInvalidToken
          ) {
            try {
              const newToken = await fetchAgoraToken(chatId, 0);
              if (newToken) {
                engine.renewToken && engine.renewToken(newToken);
              }
            } catch (e) {
              console.log("[v0] renew on state change error:", e.message);
            }
          }

          if (state === ConnectionStateType.ConnectionStateDisconnected) {
            console.log("[v0] Agora disconnected (reason:", reason, ")");
          }
        },
      };
      engine.registerEventHandler(handler);
      agoraHandlerRef.current = handler;

      engine.joinChannel(token, String(chatId), 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } catch (e) {
      console.log("[v0] startAgoraConnection error:", e.message);
      Alert.alert("Call Failed", "Unable to connect to call.");
      setCalling(false);
    }
  };

  const acceptIncomingCall = async () => {
    try {
      if (callTimeout) {
        clearTimeout(callTimeout);
        setCallTimeout(null);
      }

      setIsRinging(false);

      // Notify caller of acceptance
      SocketService.socket?.emit("call:accept", {
        to: incomingCallFrom?._id,
        from: {
          _id: authUser._id,
          name: authUser.name,
        },
        chatId,
      });

      // Start Agora connection
      await startAgoraConnection();
    } catch (e) {
      console.log("[v0] acceptIncomingCall error:", e.message);
      Alert.alert("Error", "Failed to accept call");
    }
  };

  const rejectIncomingCall = () => {
    setCalleeInfo(null);
    setIsRinging(false);
    setIncomingCallFrom(null);

    // Send call rejected message
    sendCallInfoMessage("rejected");

    // Emit rejection event
    const chatData = route.params?.chatData;
    const otherUser = chatData?.users.find((u) => u._id !== authUser._id);
    SocketService.socket?.emit("call:reject", {
      to: otherUser?._id,
      from: authUser._id,
      chatId,
    });

    console.log("[v0] Call rejected");
  };

  const endVoiceCall = async () => {
    try {
      setCalleeInfo(null);
      setCalling(false);
      setInCall(false);
      setIsRinging(false);
      setIncomingCallFrom(null);
      setRemoteUid(null);

      if (callStartTime) {
        const duration = Math.floor((Date.now() - callStartTime) / 1000);
        setCallDuration(duration);

        // Send call ended message
        await sendCallInfoMessage("ended", duration);
      }

      if (engineRef.current) {
        // Changed from agoraEngineRef.current to engineRef.current
        await engineRef.current.leaveChannel();
        await engineRef.current.release();
        engineRef.current = null;
      }

      // Emit call end event
      const chatData = route.params?.chatData;
      const otherUser = chatData?.users.find((u) => u._id !== authUser._id);
      SocketService.socket?.emit("call:end", {
        to: otherUser?._id,
        from: authUser._id,
        chatId,
      });

      console.log("[v0] Call ended");
    } catch (e) {
      console.log("[v0] endVoiceCall error:", e.message);
    }
  };

  const toggleMute = async () => {
    try {
      const engine = engineRef.current;
      if (!engine) return;
      const next = !isMuted;
      await engine.muteLocalAudioStream(next);
      setIsMuted(next);
    } catch (e) {
      console.log("[v0] toggleMute error:", e?.message);
    }
  };

  const toggleSpeaker = async () => {
    try {
      const engine = engineRef.current;
      if (!engine) return;
      const next = !speakerOn;
      if (typeof engine.setEnableSpeakerphone === "function") {
        await engine.setEnableSpeakerphone(next);
      } else if (
        typeof engine.setDefaultAudioRouteToSpeakerphone === "function"
      ) {
        engine.setDefaultAudioRouteToSpeakerphone(next);
      }
      setSpeakerOn(next);
    } catch (e) {
      console.log("[v0] toggleSpeaker error:", e?.message);
    }
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

  const displayInfo = getChatDisplayInfo(); // Define displayInfo here

  return (
    <KeyboardAvoidingView
      style={dynamicStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={displayInfo.isGroup ? navigateToGroupSettings : undefined}
        >
          {displayInfo.isGroup ? (
            displayInfo.image ? (
              <Image
                source={{ uri: displayInfo.image }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={dynamicStyles.groupHeaderAvatar}>
                <Users size={20} color={theme.accent} />
              </View>
            )
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
              <Text style={{ fontSize: 12, color: "#10b981" }}>Online</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {!displayInfo.isGroup && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={initiateVoiceCall}
              disabled={calling || inCall || isRinging}
            >
              <Phone
                size={20}
                color={
                  calling || inCall || isRinging
                    ? theme.secondaryText
                    : theme.secondaryText
                }
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowMenuModal(true)}
          >
            <MoreVertical size={20} color={theme.secondaryText} />
          </TouchableOpacity>
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

      {!isOtherUserBlocked && (
        <TouchableOpacity
          style={dynamicStyles.aiButton}
          onPress={() => setShowAiPrompt(true)}
        >
          <Bot size={24} color={theme.buttonText} />
        </TouchableOpacity>
      )}

      <AiPromptBox
        visible={showAiPrompt}
        onClose={() => setShowAiPrompt(false)}
        onAiReply={handleAiReply}
      />

      {!isOtherUserBlocked && (
        <Modal
          visible={showFileOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFileOptions(false)}
        >
          <View style={styles.fileOptionsOverlay}>
            <TouchableOpacity
              style={styles.fileOptionsBackdrop}
              onPress={() => setShowFileOptions(false)}
            />
            <View
              style={[
                styles.fileOptionsContainer,
                { backgroundColor: theme.card, borderTopColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[styles.fileOption, { borderBottomColor: theme.border }]}
                onPress={selectImageFromGallery}
              >
                <ImageIcon size={20} color={theme.accent} />
                <Text style={[styles.fileOptionText, { color: theme.text }]}>
                  Choose Image
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fileOption, { borderBottomColor: theme.border }]}
                onPress={selectVideoFromLibrary}
              >
                <ImageIcon size={20} color={theme.accent} />
                <Text style={[styles.fileOptionText, { color: theme.text }]}>
                  Choose Video
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fileOption, { borderBottomColor: theme.border }]}
                onPress={recordVideoWithCamera}
              >
                <ImageIcon size={20} color={theme.accent} />
                <Text style={[styles.fileOptionText, { color: theme.text }]}>
                  Record Video
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fileOption, { borderBottomColor: theme.border }]}
                onPress={selectDocument}
              >
                <Paperclip size={20} color={theme.accent} />
                <Text style={[styles.fileOptionText, { color: theme.text }]}>
                  Choose Document
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowFileOptions(false)}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                <Text style={{ color: theme.secondaryText, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <Modal
        visible={imagePreview.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setImagePreview({ visible: false, url: "", fromMe: false })
        }
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewContent}>
            <Image
              source={{ uri: imagePreview.url }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: "#00000050" }]}
                onPress={() =>
                  setImagePreview({ visible: false, url: "", fromMe: false })
                }
              >
                <Text style={styles.previewBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: "#00000080" }]}
                onPress={async () => {
                  try {
                    setDownloadingId("image-preview");
                    const msg = messages.find(
                      (m) => m?.fileUrl === imagePreview.url
                    );
                    let target;
                    let key;
                    if (msg) {
                      target = getLocalTargetForItem(msg);
                      key = getMessageKey(msg);
                    } else {
                      const filename = `image_${Date.now()}.jpg`;
                      target = FileSystem.documentDirectory + filename;
                    }
                    const { uri } = await FileSystem.downloadAsync(
                      imagePreview.url,
                      target
                    );
                    if (key) {
                      setDownloadedMap((prev) => ({
                        ...prev,
                        [key]: { exists: true, uri },
                      }));
                    }
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri);
                    } else {
                      Alert.alert("Downloaded", "Saved to app documents");
                    }
                  } catch (e) {
                    console.error("[v0] image preview download error:", e);
                    Alert.alert("Error", "Failed to download image");
                  } finally {
                    setDownloadingId(null);
                  }
                }}
              >
                {downloadingId === "image-preview" ? (
                  <ActivityIndicator size={16} color="#fff" />
                ) : (
                  <Text style={styles.previewBtnText}>Download</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={videoPreview.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setVideoPreview({ visible: false, url: "", fromMe: false })
        }
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewContent}>
            <Video
              source={{ uri: videoPreview.url }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 12,
                backgroundColor: "#000",
              }}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
            />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: "#00000050" }]}
                onPress={() =>
                  setVideoPreview({ visible: false, url: "", fromMe: false })
                }
              >
                <Text style={styles.previewBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: "#00000080" }]}
                onPress={async () => {
                  try {
                    setDownloadingId("video-preview");
                    const msg = messages.find(
                      (m) => m?.fileUrl === videoPreview.url
                    );
                    let target, key;
                    if (msg) {
                      target = getLocalTargetForItem(msg);
                      key = getMessageKey(msg);
                    } else {
                      const filename = `video_${Date.now()}.mp4`;
                      target = FileSystem.documentDirectory + filename;
                    }
                    const { uri } = await FileSystem.downloadAsync(
                      videoPreview.url,
                      target
                    );
                    if (key) {
                      setDownloadedMap((prev) => ({
                        ...prev,
                        [key]: { exists: true, uri },
                      }));
                    }
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri);
                    } else {
                      Alert.alert("Downloaded", "Saved to app documents");
                    }
                  } catch (e) {
                    console.error("[v0] spreview download error:", e);
                    Alert.alert("Error", "Failed to download video");
                  } finally {
                    setDownloadingId(null);
                  }
                }}
              >
                {downloadingId === "video-preview" ? (
                  <ActivityIndicator size={16} color="#fff" />
                ) : (
                  <Text style={styles.previewBtnText}>Download</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={docPreview.visible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDocPreview({
            visible: false,
            url: "",
            name: "",
            type: "",
            fromMe: false,
          });
          setDocWebError(false);
        }}
      >
        <View style={styles.docModalBackdrop}>
          <View style={styles.docModalCard}>
            <View style={styles.docHeader}>
              <ImageIcon size={20} color="#3b82f6" />
              <Text style={styles.docTitle} numberOfLines={1}>
                {docPreview.name}
              </Text>
            </View>
            <View style={styles.docBody}>
              <View style={{ height: 420 }}>
                {docWebError ? (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <Text style={{ color: "#6b7280", textAlign: "center" }}>
                      We couldn't display this file in the viewer.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        WebBrowser.openBrowserAsync(docPreview.url)
                      }
                      style={{
                        backgroundColor: "#3b82f6",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Open in Viewer
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <WebView
                    source={{
                      uri: getDocPreviewUrl(docPreview.url, docPreview.type),
                    }}
                    style={{ flex: 1, borderRadius: 8 }}
                    originWhitelist={["*"]}
                    javaScriptEnabled
                    domStorageEnabled
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    mixedContentMode="always"
                    startInLoadingState
                    renderLoading={() => (
                      <View
                        style={{
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ActivityIndicator size="small" />
                      </View>
                    )}
                    onLoadStart={() => setDocWebError(false)}
                    onError={(e) => {
                      console.log("[v0] WebView onError:", e?.nativeEvent);
                      setDocWebError(true);
                    }}
                    onHttpError={(e) => {
                      console.log("[v0] WebView onHttpError:", e?.nativeEvent);
                      setDocWebError(true);
                    }}
                  />
                )}
              </View>
            </View>
            <View style={styles.docFooter}>
              <TouchableOpacity
                style={[styles.docBtn, { backgroundColor: "#e5e7eb" }]}
                onPress={() => {
                  setDocPreview({
                    visible: false,
                    url: "",
                    name: "",
                    type: "",
                    fromMe: false,
                  });
                  setDocWebError(false);
                }}
              >
                <Text style={[styles.docBtnText, { color: "#111827" }]}>
                  Close
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.docBtn, { backgroundColor: "#3b82f6" }]}
                onPress={async () => {
                  try {
                    setDownloadingId("doc-preview");
                    const msg = messages.find(
                      (m) => m?.fileUrl === docPreview.url
                    );
                    let target;
                    let key;
                    if (msg) {
                      target = getLocalTargetForItem(msg);
                      key = getMessageKey(msg);
                    } else {
                      const extension = docPreview.type?.split("/")[1] || "bin";
                      const filename = /\.[a-zA-Z0-9]{2,5}$/.test(
                        docPreview.name
                      )
                        ? docPreview.name
                        : `${
                            docPreview.name || `file_${Date.now()}`
                          }.${extension}`;
                      target = FileSystem.documentDirectory + filename;
                    }
                    const { uri } = await FileSystem.downloadAsync(
                      docPreview.url,
                      target
                    );
                    if (key) {
                      setDownloadedMap((prev) => ({
                        ...prev,
                        [key]: { exists: true, uri },
                      }));
                    }
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri);
                    } else {
                      Alert.alert("Downloaded", `Saved to: ${uri}`);
                    }
                  } catch (e) {
                    console.error("[v0] doc preview download error:", e);
                    Alert.alert("Error", "Failed to download file");
                  } finally {
                    setDownloadingId(null);
                  }
                }}
              >
                {downloadingId === "doc-preview" ? (
                  <ActivityIndicator size={16} color="#fff" />
                ) : (
                  <Text style={[styles.docBtnText, { color: "#fff" }]}>
                    Download
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <VoiceCallModal
        visible={calling || (incomingCallFrom && isRinging) || inCall}
        inCall={inCall}
        isRinging={isRinging && incomingCallFrom !== null}
        isCalling={calling && !inCall && !incomingCallFrom}
        displayName={
          incomingCallFrom?.name || calleeInfo?.name || displayInfo?.name
        }
        isMuted={isMuted}
        speakerOn={speakerOn}
        remoteUid={remoteUid}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        onEnd={endVoiceCall}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />

      {/* Chat Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.menuModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View
            style={[
              styles.menuModalContent,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: theme.border }]}
              onPress={handleExportChatPress}
            >
              <FileText size={20} color={theme.text} />
              <Text style={[styles.menuOptionText, { color: theme.text }]}>
                Export Chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: theme.border }]}
              onPress={handleBlockUnblock}
            >
              <Ban
                size={20}
                color={isOtherUserBlocked ? theme.accent : "#ff8c00"}
              />
              <Text
                style={[
                  styles.menuOptionText,
                  { color: isOtherUserBlocked ? theme.accent : "#ff8c00" },
                ]}
              >
                {isOtherUserBlocked ? "Unblock User" : "Block User"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleDeleteChat}
            >
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.menuOptionText, { color: "#ef4444" }]}>
                Delete Chat
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {selectedFile && !isOtherUserBlocked && (
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
                <ImageIcon size={20} color={theme.accent} />
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
        {isOtherUserBlocked ? (
          <View
            style={[styles.blockedMessageContainer, { flex: 1, padding: 16 }]}
          >
            <Text
              style={[
                styles.blockedMessageText,
                { color: theme.secondaryText, textAlign: "center" },
              ]}
            >
              This user has been blocked
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.attachButton, { backgroundColor: theme.input }]}
              onPress={() => setShowFileOptions(true)}
            >
              <Paperclip size={20} color={theme.secondaryText} />
            </TouchableOpacity>

            {isRecording ? (
              <VoiceRecorderControls
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                onStop={stopVoiceRecording}
                onStopAndSend={stopAndSendVoiceRecording}
                onCancel={cancelVoiceRecording}
              />
            ) : (
              <TextInput
                style={[dynamicStyles.textInput, { marginLeft: 8 }]}
                value={newMessage}
                onChangeText={handleTyping}
                placeholder={`Message...`}
                placeholderTextColor={theme.secondaryText}
                multiline
                maxLength={500}
                editable={!sending}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
            )}

            {isRecording ? (
              <View />
            ) : (
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
            )}

            {!isRecording && (
              <TouchableOpacity
                style={[styles.micButton, { backgroundColor: theme.input }]}
                onPress={startVoiceRecording}
                disabled={sending || !!selectedFile}
              >
                <Mic
                  size={20}
                  color={
                    sending || !!selectedFile
                      ? theme.secondaryText
                      : theme.secondaryText
                  }
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
    width: 40,
  },
  headerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  headerTextContainer: {
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
    maxWidth: 280,
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
    gap: 8,
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
  docActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 8,
  },
  docActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  docActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inlineActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  inlineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewContent: {
    width: "100%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  previewActions: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  previewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  previewBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  docModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  docModalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  docHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    gap: 8,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  docBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  docHint: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    marginTop: 16,
  },
  docFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  docBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  docBtnText: {
    fontWeight: "600",
    fontSize: 14,
  },
  callModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  callModal: {
    width: "85%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  callTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  callSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  callStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  callStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  callControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  callControlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  callEndBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginRight: 12,
    height: 44,
    borderRadius: 22,
  },
  recordingDuration: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  cancelRecordingText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 16,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: 260,
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 12,
  },
  audioMeta: {
    flex: 1,
    justifyContent: "center",
  },
  audioProgressTrack: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  audioProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  audioTimeLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  menuModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuModalContent: {
    width: "80%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  menuOptionText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  blockedMessageContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  blockedMessageText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});

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
  StopCircle,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import SocketService from "../../services/socket";
import { useTheme } from "../../store/themeContext";
import AiPromptBox from "../../components/AiPromptBox";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser"; // add WebBrowser for in-app fallback
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  AudioProfileType,
  AudioScenarioType,
  ConnectionStateType,
  ConnectionChangedReasonType,
} from "react-native-agora";
import { Audio, Video } from "expo-av"; // import Video player and video icon
import {
  Video as VideoIcon, // alias to avoid clashing with expo-av's Video
} from "lucide-react-native";

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

// lightweight audio message player component per message
const AudioMessagePlayer = ({ uri, isMyMessage }) => {
  const { theme } = useTheme();
  const soundRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

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

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        try {
          soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }
    };
  }, []);

  const ensureLoaded = async () => {
    if (soundRef.current) return;
    setIsLoading(true);
    const s = new Audio.Sound();
    s.setOnPlaybackStatusUpdate((status) => {
      if (!status) return;
      if ("positionMillis" in status && "durationMillis" in status) {
        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);
      }
      if ("isPlaying" in status) {
        setIsPlaying(status.isPlaying);
      }
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(status.durationMillis || 0);
      }
    });
    try {
      await s.loadAsync({ uri }, {}, true);
    } catch (e) {
      console.log("[v0] load sound error:", e?.message);
      Alert.alert("Playback Error", "Unable to load audio.");
    } finally {
      setIsLoading(false);
      soundRef.current = s;
    }
  };

  const togglePlay = async () => {
    await ensureLoaded();
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const pct =
    duration > 0 ? Math.min(100, (position / Math.max(1, duration)) * 100) : 0;

  return (
    <View
      style={[
        styles.audioPlayerContainer,
        {
          backgroundColor: isMyMessage ? "transparent" : theme.input,
          borderColor: isMyMessage ? "rgba(255,255,255,0.35)" : theme.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={togglePlay}
        style={[
          styles.audioPlayButton,
          {
            backgroundColor: isMyMessage ? "rgba(0,0,0,0.15)" : theme.card,
            borderColor: isMyMessage ? "rgba(255,255,255,0.25)" : theme.border,
          },
        ]}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            size={14}
            color={isMyMessage ? "#fff" : theme.text}
          />
        ) : isPlaying ? (
          <Pause size={16} color={isMyMessage ? "#fff" : theme.text} />
        ) : (
          <Play size={16} color={isMyMessage ? "#fff" : theme.text} />
        )}
      </TouchableOpacity>
      <View style={styles.audioMeta}>
        <View
          style={[
            styles.audioProgressTrack,
            {
              backgroundColor: isMyMessage
                ? "rgba(255,255,255,0.25)"
                : theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.audioProgressFill,
              {
                width: `${pct}%`,
                backgroundColor: isMyMessage ? "#ffffff" : theme.accent,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.audioTimeLabel,
            {
              color: isMyMessage
                ? theme.buttonText || "#fff"
                : theme.secondaryText,
            },
          ]}
        >
          {formatMillis(position)} / {formatMillis(duration)}
        </Text>
      </View>
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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

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
  const [docWebError, setDocWebError] = useState(false); // add docWebError state for WebView error tracking
  const [calling, setCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  // replace RtcEngine instance with ref for the new Agora API
  const engineRef = useRef(null);
  const agoraHandlerRef = useRef(null);
  // Changed to useRef<any> | null

  // Replace with VideoPlayer component in MessageBubble for video files
  // const [videoPreview, setVideoPreview] = useState({
  //   visible: false,
  //   url: "",
  //   fromMe: false,
  // });

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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

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
      const uri = rec.getURI();
      recordingRef.current = null;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);

      if (uri) {
        // get file size and set as selected file to reuse existing send flow
        const info = await FileSystem.getInfoAsync(uri);
        const name = `voice_${Date.now()}.m4a`;
        const fileObj = {
          uri,
          name,
          type: "audio/m4a",
          size: info?.size ?? 0,
        };
        setSelectedFile(fileObj);
        return fileObj; // return file object for quick-send
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

  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);

  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const { chatId, chatData } = route.params;
  const API_URL = "http://192.168.0.110:8000/api";
  const CALL_URL = API_URL.replace("/api", "/call");
  const AGORA_APP_ID = "e7f6e9aeecf14b2ba10e3f40be9f56e7";

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

  useEffect(() => {
    console.log("ChatMessage component mounted for chat:", chatId);
    fetchMessages();
    setupSocket();

    return () => {
      console.log("ChatMessage component unmounting");
      cleanupSocket();
      endVoiceCall(); // Ensure call is ended on unmount
      try {
        cancelVoiceRecording();
      } catch {}
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

  const getMessageKey = (item) =>
    item?._id ||
    item?.fileUrl ||
    item?.fileName ||
    String(item?.createdAt || "");

  const getLocalTargetForItem = (item) => {
    if (!item?.fileUrl && !item?.fileName) return null;
    const isImage = (t) => t && t.startsWith("image/");
    const isVideo = (t) => t && t.startsWith("video/");
    const fromUrl = item?.fileUrl?.split("/")?.pop() || "";
    const baseName =
      item?.fileName ||
      fromUrl ||
      (isImage(item?.fileType)
        ? `image_${item?._id || Date.now()}.jpg`
        : isVideo(item?.fileType)
        ? `video_${item?._id || Date.now()}.mp4`
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
    return [".mp4", ".mov", ".m4v", ".avi", ".webm", ".mkv", ".3gp"].some(
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

      // Default to Google Docs Viewer
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
        (m) =>
          (m?.type === "file" || m?.type === "video" || m?.type === "audio") &&
          m?.fileUrl
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
    // Treat RN TextInput onSubmitEditing event as undefined file override
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
        // derive a stable filename if fileName is missing
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

  const selectVideoFromGallery = async () => {
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
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const last = asset.uri.split("/").pop() || `video_${Date.now()}`;
        const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(last);
        const fallbackExt = ".mp4";
        const name =
          asset.fileName || (hasExt ? last : `${last}${fallbackExt}`);

        setSelectedFile({
          uri: asset.uri,
          name,
          type: asset.mimeType || "video/mp4",
          size: asset.fileSize || 0,
        });
        setShowFileOptions(false);
      }
    } catch (error) {
      console.error("[v0] Error selecting video:", error);
      Alert.alert("Error", "Failed to select video");
    }
  };

  const recordVideo = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
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
        const fallbackExt = ".mp4";
        const name =
          asset.fileName || (hasExt ? last : `${last}${fallbackExt}`);

        setSelectedFile({
          uri: asset.uri,
          name,
          type: asset.mimeType || "video/mp4",
          size: asset.fileSize || 0,
        });
        setShowFileOptions(false);
      }
    } catch (error) {
      console.error("[v0] Error recording video:", error);
      Alert.alert("Error", "Failed to record video");
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

  const selectVideo = async () => {
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
        allowsEditing: true,
        aspect: [16, 9], // Common aspect ratio for videos
        quality: 0.7, // Adjust quality as needed
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const last = asset.uri.split("/").pop() || `video_${Date.now()}`;
        const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(last);
        const name = asset.fileName || (hasExt ? last : `${last}.mp4`);

        setSelectedFile({
          uri: asset.uri,
          name,
          type: asset.type || "video/mp4",
          size: asset.fileSize || 0,
        });
        setShowFileOptions(false);
      }
    } catch (error) {
      console.error("[v0] Error selecting video:", error);
      Alert.alert("Error", "Failed to select video");
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
    const isMyMessage = item.sender._id === user._id;
    const isFileMessage = item.type === "file" && item.fileUrl;
    const isImageMessage = item.type === "image" && item.fileUrl;
    const isVideoMessage = item.type === "video" && item.fileUrl;
    const isAudioMessage = item.type === "audio" && item.fileUrl;

    const msgKey = getMessageKey(item);
    const localInfo = downloadedMap[msgKey];

    const openPreview = () => {
      if (!item.fileUrl) return;
      // audio handled inline via player
      if (item.fileType && item.fileType.startsWith("image/")) {
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
        setDocWebError(false); // reset error before showing doc preview
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
          {isFileMessage ||
          isImageMessage ||
          isVideoMessage ||
          isAudioMessage ? (
            <TouchableOpacity
              onPress={openPreview}
              style={styles.fileContainer}
              activeOpacity={0.9}
            >
              {isImageMessage ? (
                <View>
                  <Image
                    source={{ uri: item.fileUrl }}
                    style={styles.imageMessage}
                    resizeMode="cover"
                  />
                  {/* Removed filename display for images */}

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
                // Use the new AudioMessagePlayer component for audio files
                <AudioMessagePlayer
                  uri={item.fileUrl}
                  isMyMessage={isMyMessage}
                />
              ) : isVideoFile(item.fileType, item.fileUrl) ? (
                <View>
                  <Video
                    source={{ uri: item.fileUrl }}
                    style={styles.videoMessage}
                    useNativeControls
                    resizeMode="contain"
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
              ) : (
                <View style={styles.documentContainer}>
                  <View style={styles.documentIcon}>
                    <ImageIcon size={20} color={theme.accent} />
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
                      {getDisplayFileName(item)}
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
                  <View style={styles.docActions}>
                    <TouchableOpacity
                      onPress={openPreview}
                      style={styles.docActionBtn}
                    >
                      <Text
                        style={[
                          styles.docActionText,
                          { color: isMyMessage ? "#fff" : theme.text },
                        ]}
                      >
                        Preview
                      </Text>
                    </TouchableOpacity>
                    {localInfo?.exists ? (
                      <TouchableOpacity
                        onPress={openLocal}
                        style={styles.docActionBtn}
                      >
                        <Text
                          style={[
                            styles.docActionText,
                            { color: isMyMessage ? "#fff" : theme.text },
                          ]}
                        >
                          Open
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={downloadCurrent}
                        style={styles.docActionBtn}
                      >
                        {downloadingId === (item._id || msgKey) ? (
                          <ActivityIndicator
                            size={14}
                            color={isMyMessage ? "#fff" : theme.text}
                          />
                        ) : (
                          <Download
                            size={20}
                            color={isMyMessage ? "#fff" : theme.text}
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {item.content &&
                !isImage(item.fileType) &&
                !isImageMessage &&
                !isVideoMessage &&
                !isAudioMessage && (
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

  // voice call helpers
  const requestMicPermission = async () => {
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

  const startVoiceCall = async () => {
    try {
      // robust join: use Communication profile, enable audio, route to speaker, handle token renewals
      if (!AGORA_APP_ID) {
        Alert.alert(
          "Missing config",
          "AGORA_APP_ID is not set. Please set EXPO_PUBLIC_AGORA_APP_ID or NEXT_PUBLIC_AGORA_APP_ID."
        );
        return;
      }
      const micOk = await requestMicPermission();
      if (!micOk) return;

      setCalling(true);

      // get token
      const token = await fetchAgoraToken(chatId, 0);
      if (!token) {
        setCalling(false);
        Alert.alert("Token Error", "Failed to get Agora token.");
        return;
      }

      // reuse engine if exists, otherwise create
      let engine = engineRef.current;
      if (!engine) {
        engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({
          appId: AGORA_APP_ID,
          // Use Communication for 1:1/Group calls to avoid broadcaster/audience role drops
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
        // communication doesn't require roles, but it's harmless to set
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.setAudioProfile(
          AudioProfileType.AudioProfileDefault,
          AudioScenarioType.AudioScenarioCommunication
        );

        // ensure audio is active and routed to speaker by default
        // (some platforms default to earpiece unless specified)
        try {
          engine.enableAudio && engine.enableAudio();
          engine.enableLocalAudio && engine.enableLocalAudio(true);
          // Set default route to speakerphone
          if (typeof engine.setDefaultAudioRouteToSpeakerphone === "function") {
            engine.setDefaultAudioRouteToSpeakerphone(true);
          }
        } catch (e) {
          console.log("[v0] enable audio/route error:", e.message);
        }
      }

      // unregister previous handler (if any) to avoid duplicate callbacks
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
        },
        onUserJoined: (uid) => {
          setRemoteUid(uid);
        },
        onUserOffline: (uid) => {
          if (remoteUid === uid) setRemoteUid(null);
        },
        onError: (err) => {
          console.log("[v0] Agora Error:", err);
          // avoid immediate teardown on ephemeral errors; let connection state handle it
        },
        // auto-renew token before expiry to prevent drops
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
        // monitor connection state for unexpected drops and try renewing token
        onConnectionStateChanged: async (state, reason) => {
          // If token expired or rejected, renew and keep the session alive
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

          // If truly disconnected and not user-triggered, keep modal open; user can decide to End, or it may reconnect via token renew
          if (state === ConnectionStateType.ConnectionStateDisconnected) {
            console.log("[v0] Agora disconnected (reason:", reason, ")");
          }
        },
      };
      engine.registerEventHandler(handler);
      agoraHandlerRef.current = handler;

      // join channel
      engine.joinChannel(token, String(chatId), 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } catch (e) {
      console.log("[v0] startVoiceCall error:", e.message);
      Alert.alert("Call Failed", "Unable to start the call.");
      setCalling(false);
    }
  };

  const endVoiceCall = async () => {
    try {
      const engine = engineRef.current;
      if (engine) {
        try {
          await engine.leaveChannel();
        } catch {}
        try {
          if (
            agoraHandlerRef.current &&
            typeof engine.unregisterEventHandler === "function"
          ) {
            engine.unregisterEventHandler(agoraHandlerRef.current);
          }
        } catch {}
        try {
          engine.release && engine.release();
        } catch {}
        engineRef.current = null;
        agoraHandlerRef.current = null;
      }
    } catch (e) {
      console.log("[v0] endVoiceCall error:", e?.message);
    } finally {
      setIsMuted(false);
      setSpeakerOn(false);
      setRemoteUid(null);
      setInCall(false);
      setCalling(false);
    }
  };

  const toggleMute = async () => {
    try {
      const engine = engineRef.current;
      if (!engine) return;
      const next = !isMuted;
      // use muteLocalAudioStream for v4 API
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
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={startVoiceCall}
            disabled={calling || inCall}
          >
            <Phone
              size={20}
              color={
                calling || inCall ? theme.secondaryText : theme.secondaryText
              }
            />
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

      <Modal
        visible={showFileOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFileOptions(false)}
      >
        <View style={styles.fileOptionsOverlay}>
          <TouchableOpacity
            style={styles.fileOptionsBackdrop}
            onPress={() => setShowFileOptions(false)}
            activeOpacity={1}
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
              onPress={selectVideoFromGallery}
            >
              <VideoIcon size={20} color={theme.accent} />
              <Text style={[styles.fileOptionText, { color: theme.text }]}>
                Choose Video
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fileOption, { borderBottomColor: theme.border }]}
              onPress={recordVideo}
            >
              <VideoIcon size={20} color={theme.accent} />
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
              style={styles.previewImage /* reuse container sizing */}
              resizeMode="contain"
              useNativeControls // Use native controls for video playback
              onLoad={() => console.log("Video loaded")}
              onError={(e) => console.error("Video playback error:", e)}
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
                    let target;
                    let key;
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
                    console.error("[v0] video preview download error:", e);
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
                      We couldn’t display this file in the viewer.
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
                    mixedContentMode="always" // Android: allow https<->http assets if any
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

      <Modal
        visible={calling || inCall}
        transparent
        animationType="fade"
        onRequestClose={endVoiceCall}
      >
        <View style={styles.callModalBackdrop}>
          <View
            style={[
              styles.callModal,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.callTitle, { color: theme.text }]}>
              {inCall ? "In Call" : "Calling..."}
            </Text>
            <Text
              style={[styles.callSubtitle, { color: theme.secondaryText }]}
              numberOfLines={1}
            >
              {displayInfo?.name}
            </Text>

            <View style={styles.callStatusRow}>
              <View
                style={[
                  styles.callStatusDot,
                  { backgroundColor: inCall ? "#10b981" : "#f59e0b" },
                ]}
              />
              <Text style={{ color: theme.secondaryText }}>
                {inCall
                  ? remoteUid
                    ? `Connected • User ${remoteUid}`
                    : "Connected"
                  : "Ringing"}
              </Text>
            </View>

            <View style={styles.callControls}>
              <TouchableOpacity
                style={[
                  styles.callControlBtn,
                  { backgroundColor: isMuted ? theme.input : theme.input },
                ]}
                onPress={toggleMute}
              >
                <Mic size={24} color={theme.text} />
                <Text style={{ color: theme.text, marginTop: 4 }}>
                  {isMuted ? "Unmute" : "Mute"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.callControlBtn,
                  { backgroundColor: theme.input },
                ]}
                onPress={toggleSpeaker}
              >
                <Text style={{ color: theme.text }}>
                  {speakerOn ? "Earpiece" : "Speaker"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callEndBtn, { backgroundColor: "#ef4444" }]}
                onPress={endVoiceCall}
              >
                <Text style={{ color: "#fff" }}>End</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              ) : selectedFile.type.startsWith("video/") ? (
                <VideoIcon size={20} color={theme.accent} />
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
        <TouchableOpacity
          style={[styles.attachButton, { backgroundColor: theme.input }]}
          onPress={() => setShowFileOptions(true)}
        >
          <Paperclip size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        {isRecording ? (
          <View style={styles.recordingIndicator}>
            <ActivityIndicator size={16} color={theme.accent} />
            <Text style={[styles.recordingDuration, { color: theme.text }]}>
              {formatMillis(recordingDuration)}
            </Text>
            <TouchableOpacity
              onPress={stopVoiceRecording}
              accessibilityRole="button"
              accessibilityLabel="Stop recording"
            >
              <StopCircle size={32} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={stopAndSendVoiceRecording}
              accessibilityRole="button"
              accessibilityLabel="Send voice message"
            >
              <Send size={28} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cancelVoiceRecording}
              accessibilityRole="button"
              accessibilityLabel="Cancel recording"
            >
              <Text
                style={[
                  styles.cancelRecordingText,
                  { color: theme.secondaryText },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
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
    maxWidth: 280,
  },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  videoMessageContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  videoMessage: {
    width: 240,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#000",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
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
  previewVideo: {
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
  // Call UI
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
  // Voice Recording Styles
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
  // Audio Player Styles
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: 260, // Fixed width for audio messages
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
});

export default ChatMessage;

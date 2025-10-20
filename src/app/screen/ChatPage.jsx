"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  SectionList,
  Animated,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../store/themeContext";
import { User, MessageCircle, Users, Plus } from "lucide-react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import SocketService from "../../services/socket";
import SideNav from "../../components/SideNav";
import Navbar from "../../components/Navbar";
import LongPressMenu from "../../components/LongPressMenu";
import ReportModal from "../../components/ReportModal";

const { width } = Dimensions.get("window");

// Unread Badge Component
const UnreadBadge = ({ count, theme }) => {
  if (!count || count === 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
      <Text style={[styles.unreadBadgeText, { color: theme.buttonText }]}>
        {displayCount}
      </Text>
    </View>
  );
};

// Typing Indicator Component
const TypingIndicator = ({ typingUsers, isGroupChat, theme }) => {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    if (typingUsers.length > 0) {
      const animateDots = () => {
        const createAnimation = (dot, delay) => {
          return Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(dot, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          );
        };

        Animated.parallel([
          createAnimation(dot1, 0),
          createAnimation(dot2, 200),
          createAnimation(dot3, 400),
        ]).start();
      };

      animateDots();
    }
  }, [typingUsers, dot1, dot2, dot3]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return isGroupChat ? `${typingUsers[0].name} is typing` : "typing";
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
    } else {
      return `${typingUsers[0].name} and ${
        typingUsers.length - 1
      } others are typing`;
    }
  };

  return (
    <View style={styles.typingContainer}>
      <Text style={[styles.typingText, { color: theme.accent }]}>
        {getTypingText()}
      </Text>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[styles.dot, { opacity: dot1, backgroundColor: theme.accent }]}
        />
        <Animated.View
          style={[styles.dot, { opacity: dot2, backgroundColor: theme.accent }]}
        />
        <Animated.View
          style={[styles.dot, { opacity: dot3, backgroundColor: theme.accent }]}
        />
      </View>
    </View>
  );
};

const ChatPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allFriends, setAllFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [typingStatus, setTypingStatus] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({}); // { chatId: count }
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedReportedUser, setSelectedReportedUser] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Add scroll animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const navbarTranslateY = useRef(new Animated.Value(0)).current;
  const isScrollingDown = useRef(false);

  const API_URL = "http://192.168.100.15:8000/api";

  // Enhanced Socket Connection with better error handling and reconnection
  useEffect(() => {
    if (user?._id && user?.name) {
      // Connect to socket
      SocketService.connect(user._id, user.name);

      // Monitor connection status with more frequent checks
      const connectionInterval = setInterval(() => {
        const connected = SocketService.getConnectionStatus();
        console.log("Socket connection status:", connected);

        if (!connected) {
          console.log("Socket disconnected, attempting to reconnect...");
          SocketService.connect(user._id, user.name);
        }
      }, 3000); // Check every 3 seconds

      // Set up all socket listeners
      setupSocketListeners();

      return () => {
        console.log("Cleaning up socket listeners");
        clearInterval(connectionInterval);

        // Safe cleanup - only use methods that exist in SocketService
        try {
          // Only call offTyping which handles both typing events
          if (SocketService && typeof SocketService.offTyping === "function") {
            SocketService.offTyping();
          }

          // Only call offMessageReceived if it exists
          if (
            SocketService &&
            typeof SocketService.offMessageReceived === "function"
          ) {
            SocketService.offMessageReceived();
          }

          // Optionally disconnect entirely
          if (SocketService && typeof SocketService.disconnect === "function") {
            SocketService.disconnect();
          }
        } catch (error) {
          console.log("Error during socket cleanup:", error);
        }

        setTypingStatus({});
      };
    }
  }, [user]);

  const setupSocketListeners = () => {
    try {
      // Listen for typing events
      if (SocketService && typeof SocketService.onTyping === "function") {
        SocketService.onTyping((data) => {
          console.log("Typing event received:", data);
          const { chatId, user: typingUser } = data;

          if (typingUser._id !== user._id) {
            setTypingStatus((prev) => {
              const currentTypers = prev[chatId] || [];
              const isAlreadyTyping = currentTypers.some(
                (u) => u._id === typingUser._id
              );

              if (!isAlreadyTyping) {
                return {
                  ...prev,
                  [chatId]: [...currentTypers, typingUser],
                };
              }
              return prev;
            });
          }
        });
      }

      // Only set up stop typing listener if the method exists
      if (SocketService && typeof SocketService.onStopTyping === "function") {
        SocketService.onStopTyping((data) => {
          console.log("Stop typing event received:", data);
          const { chatId, user: typingUser } = data;

          setTypingStatus((prev) => {
            const currentTypers = prev[chatId] || [];
            const filteredTypers = currentTypers.filter(
              (u) => u._id !== typingUser._id
            );

            if (filteredTypers.length === 0) {
              const newStatus = { ...prev };
              delete newStatus[chatId];
              return newStatus;
            } else {
              return {
                ...prev,
                [chatId]: filteredTypers,
              };
            }
          });
        });
      } else {
        console.log("onStopTyping method not available in SocketService");
      }

      // Enhanced message received handler
      if (
        SocketService &&
        typeof SocketService.onMessageReceived === "function"
      ) {
        SocketService.onMessageReceived((newMessage) => {
          console.log("New message received in ChatPage:", newMessage);

          // Only increment unread count if message is not from current user
          if (newMessage.sender._id !== user._id) {
            setUnreadCounts((prev) => ({
              ...prev,
              [newMessage.chat._id]: (prev[newMessage.chat._id] || 0) + 1,
            }));
          }

          // Update the chat list with the new message
          setChats((prevChats) => {
            const updatedChats = prevChats.map((chat) => {
              if (chat._id === newMessage.chat._id) {
                return {
                  ...chat,
                  latestMessage: newMessage,
                  updatedAt: newMessage.createdAt,
                };
              }
              return chat;
            });

            // If the chat doesn't exist in the list, fetch it
            const chatExists = prevChats.some(
              (chat) => chat._id === newMessage.chat._id
            );
            if (!chatExists) {
              console.log("New chat detected, refreshing chat list");
              // Trigger a refresh to get the new chat
              setTimeout(() => {
                fetchChats();
              }, 500);
            }

            // Sort chats by latest message time
            return updatedChats.sort((a, b) => {
              const aTime = new Date(
                a.latestMessage?.createdAt || a.updatedAt || 0
              );
              const bTime = new Date(
                b.latestMessage?.createdAt || b.updatedAt || 0
              );
              return bTime - aTime;
            });
          });
        });
      }
    } catch (error) {
      console.error("Error setting up socket listeners:", error);
    }
  };

  // Join chats when they are loaded
  useEffect(() => {
    if (chats.length > 0 && SocketService.getConnectionStatus()) {
      chats.forEach((chat) => {
        console.log("Joining chat:", chat._id);
        SocketService.joinChat(chat._id);
      });
    }
  }, [chats]);

  // Enhanced focus effect with force refresh option
  useFocusEffect(
    React.useCallback(() => {
      console.log("ChatPage focused, checking for updates");

      // Always refresh data when component gains focus
      fetchData();

      // Also ensure socket is connected
      if (user?._id && user?.name && !SocketService.getConnectionStatus()) {
        console.log("Reconnecting socket on focus");
        SocketService.connect(user._id, user.name);
      }

      // Reset navbar position when screen is focused
      Animated.spring(navbarTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 20,
      }).start();
    }, [user])
  );

  // Fetch both chats and friends sequentially to ensure proper filtering
  const fetchData = async () => {
    try {
      setLoading(true);

      // First fetch chats
      await fetchChats();

      // Then fetch friends (this will use the updated chats for filtering)
      await fetchFriends();

      // Fetch unread counts
      await fetchUnreadCounts();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchChats = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.get(`${API_URL}/chat/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched chats:", response.data.length);
      setChats(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChats([]);
      return [];
    }
  };

  const fetchFriends = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      setFriendsLoading(true);

      const response = await axios.get(`${API_URL}/friends/list/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let friendsList = [];
      if (Array.isArray(response.data)) {
        friendsList = response.data;
      } else if (response.data?.friends) {
        friendsList = response.data.friends;
      } else if (response.data?.data) {
        friendsList = response.data.data;
      }

      console.log("All friends fetched:", friendsList.length);
      setAllFriends(friendsList);
    } catch (error) {
      console.error("Error fetching friends:", error);
      setAllFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  };

  // Fetch unread message counts for all chats
  const fetchUnreadCounts = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.get(`${API_URL}/chat/unread-counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched unread counts:", response.data);
      setUnreadCounts(response.data || {});
    } catch (error) {
      console.error("Error fetching unread counts:", error);
      // If endpoint doesn't exist, you can calculate from chat data
      // or set default empty object
      setUnreadCounts({});
    }
  };

  // Mark chat as read when opening
  const markChatAsRead = async (chatId) => {
    try {
      const token = await SecureStore.getItemAsync("token");

      await axios.put(
        `${API_URL}/chat/${chatId}/mark-read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Clear unread count locally
      setUnreadCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[chatId];
        return newCounts;
      });

      console.log("Marked chat as read:", chatId);
    } catch (error) {
      console.error("Error marking chat as read:", error);
      // Still clear locally even if API call fails
      setUnreadCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[chatId];
        return newCounts;
      });
    }
  };

  // Filter friends who don't have existing chats (computed property)
  const availableFriends = React.useMemo(() => {
    console.log(
      "Filtering friends. Total friends:",
      allFriends.length,
      "Total chats:",
      chats.length
    );

    const filtered = allFriends.filter((friend) => {
      // Don't show current user
      if (friend._id === user._id) {
        console.log("Filtering out current user:", friend.name);
        return false;
      }

      // Check if there's already a chat with this friend
      const hasExistingChat = chats.some((chat) => {
        // Skip group chats
        if (chat.isGroupChat) return false;

        // Check if this friend is in any existing chat
        const isInChat = chat.users.some(
          (chatUser) => chatUser._id === friend._id
        );
        if (isInChat) {
          console.log("Friend already has chat:", friend.name);
        }
        return isInChat;
      });

      return !hasExistingChat;
    });

    console.log("Available friends after filtering:", filtered.length);
    return filtered;
  }, [allFriends, chats, user._id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const accessOrCreateChat = async (friendId) => {
    try {
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.post(
        `${API_URL}/chat/`,
        { userId: friendId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const chat = response.data;

      // Join the new chat
      if (SocketService.getConnectionStatus()) {
        SocketService.joinChat(chat._id);
      }

      // Refresh data to update the lists
      await fetchData();

      navigation.navigate("ChatMessage", {
        chatId: chat._id,
        chatData: chat,
      });
    } catch (error) {
      console.error("Error accessing chat:", error);
      Alert.alert("Error", "Failed to create chat");
    }
  };

  const navigateToExistingChat = async (chat) => {
    // Mark chat as read before navigating
    await markChatAsRead(chat._id);

    navigation.navigate("ChatMessage", {
      chatId: chat._id,
      chatData: chat,
    });
  };

  const navigateToCreateGroup = () => {
    navigation.navigate("CreateGroupChat");
  };

  const getChatDisplayInfo = (chat) => {
    if (chat.isGroupChat) {
      return {
        name: chat.chatName,
        image: null,
        isGroup: true,
        memberCount: chat.users.length,
      };
    } else {
      const otherUser = chat.users.find((u) => u._id !== user._id);
      return {
        name: otherUser?.name || "Unknown User",
        image: otherUser?.profileImage || otherUser?.pic,
        isGroup: false,
      };
    }
  };

  const getLastMessageText = (chat) => {
    if (chat.latestMessage) {
      const senderName = chat.latestMessage.sender.name;
      const isMyMessage = chat.latestMessage.sender._id === user._id;
      const prefix = chat.isGroupChat
        ? isMyMessage
          ? "You: "
          : `${senderName}: `
        : "";
      return `${prefix}${chat.latestMessage.content}`;
    }
    return chat.isGroupChat ? "Group created" : "Start a conversation";
  };

  const getLastMessageTime = (chat) => {
    if (chat.latestMessage) {
      const date = new Date(chat.latestMessage.createdAt || chat.updatedAt);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return "";
  };

  // Handle scroll events to show/hide navbar
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        // Determine scroll direction
        if (currentScrollY > lastScrollY.current + 5) {
          // Scrolling down - hide navbar
          if (!isScrollingDown.current) {
            isScrollingDown.current = true;
            Animated.spring(navbarTranslateY, {
              toValue: 100, // Move navbar off screen
              useNativeDriver: true,
              tension: 100,
              friction: 20,
            }).start();
          }
        } else if (currentScrollY < lastScrollY.current - 5) {
          // Scrolling up - show navbar
          if (isScrollingDown.current) {
            isScrollingDown.current = false;
            Animated.spring(navbarTranslateY, {
              toValue: 0, // Move navbar back to original position
              useNativeDriver: true,
              tension: 100,
              friction: 20,
            }).start();
          }
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  // Create dynamic styles inside the component
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
      marginTop: 100,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    chatCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chatCardUnread: {
      borderColor: theme.accent,
      backgroundColor: theme.cardHighlight || theme.card,
    },
    friendCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatarFallback: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.input,
      alignItems: "center",
      justifyContent: "center",
    },
    groupAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.cardHighlight || theme.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.accent,
    },
    sideNavContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      transform: [{ translateY: navbarTranslateY }],
    },
    navbarContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    },
  };

  const handleLongPress = (chat, event) => {
    // Get the other user in the chat (for DM) or show group info
    let reportedUser = null;

    if (chat.isGroupChat) {
      // For group chats, you might want to show different options
      // For now, we'll just return without showing report option
      Alert.alert(
        "Group Chat",
        "Please report individual users from the chat screen"
      );
      return;
    } else {
      // For direct messages, get the other user
      reportedUser = chat.users.find((u) => u._id !== user._id);
    }

    if (!reportedUser) {
      Alert.alert("Error", "Unable to identify user to report");
      return;
    }

    // Get touch position for menu placement
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX - 80, y: pageY });

    setSelectedChat(chat);
    setSelectedReportedUser(reportedUser);
    setShowLongPressMenu(true);
  };

  const handleReportUser = () => {
    setShowLongPressMenu(false);
    // Small delay to ensure menu is closed before opening modal
    setTimeout(() => {
      setShowReportModal(true);
    }, 100);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setSelectedChat(null);
    setSelectedReportedUser(null);
  };

  const renderChatCard = ({ item }) => {
    const displayInfo = getChatDisplayInfo(item);
    const typingUsers = typingStatus[item._id] || [];
    const isTyping = typingUsers.length > 0;
    const unreadCount = unreadCounts[item._id] || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[
          dynamicStyles.chatCard,
          hasUnread && dynamicStyles.chatCardUnread,
        ]}
        onPress={() => navigateToExistingChat(item)}
        onLongPress={(event) => handleLongPress(item, event)}
        delayLongPress={500}
      >
        <View style={styles.chatCardContent}>
          <View style={styles.avatarContainer}>
            {displayInfo.isGroup ? (
              <View style={styles.groupAvatarContainer}>
                <View style={dynamicStyles.groupAvatar}>
                  <Users size={24} color={theme.accent} />
                </View>
              </View>
            ) : displayInfo.image ? (
              <Image
                source={{ uri: displayInfo.image }}
                style={styles.avatar}
              />
            ) : (
              <View style={dynamicStyles.avatarFallback}>
                <User size={32} color={theme.secondaryText} />
              </View>
            )}

            {/* Unread badge on avatar */}
            {hasUnread && (
              <View style={styles.avatarBadgeContainer}>
                <UnreadBadge count={unreadCount} theme={theme} />
              </View>
            )}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text
                style={[
                  styles.chatName,
                  { color: theme.text },
                  hasUnread && styles.chatNameUnread,
                ]}
                numberOfLines={1}
              >
                {displayInfo.name}
                {displayInfo.isGroup && (
                  <Text
                    style={[styles.memberCount, { color: theme.secondaryText }]}
                  >
                    {" "}
                    ({displayInfo.memberCount})
                  </Text>
                )}
              </Text>
              <View style={styles.timestampContainer}>
                <Text
                  style={[
                    styles.timestamp,
                    { color: theme.secondaryText },
                    hasUnread && [
                      styles.timestampUnread,
                      { color: theme.accent },
                    ],
                  ]}
                >
                  {getLastMessageTime(item)}
                </Text>
              </View>
            </View>

            {isTyping ? (
              <TypingIndicator
                typingUsers={typingUsers}
                isGroupChat={displayInfo.isGroup}
                theme={theme}
              />
            ) : (
              <Text
                style={[
                  styles.lastMessage,
                  { color: theme.secondaryText },
                  hasUnread && [
                    styles.lastMessageUnread,
                    { color: theme.text },
                  ],
                ]}
                numberOfLines={1}
              >
                {getLastMessageText(item)}
              </Text>
            )}
          </View>

          <View style={styles.chatIconContainer}>
            {displayInfo.isGroup ? (
              <Users size={20} color={theme.accent} />
            ) : (
              <MessageCircle size={20} color={theme.accent} />
            )}

            {hasUnread && (
              <View
                style={[styles.unreadDot, { backgroundColor: theme.accent }]}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendCard = ({ item }) => (
    <TouchableOpacity
      style={dynamicStyles.friendCard}
      onPress={() => accessOrCreateChat(item._id)}
    >
      <View style={styles.chatCardContent}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <View style={dynamicStyles.avatarFallback}>
            <User size={32} color="#9ca3af" />
          </View>
        )}

        <View style={styles.chatInfo}>
          <Text
            style={[styles.chatName, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.lastMessage, { color: theme.secondaryText }]}
            numberOfLines={1}
          >
            Tap to start chatting
          </Text>
        </View>

        <View style={styles.chatIconContainer}>
          <MessageCircle size={20} color={theme.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title, data, showToggle } }) => {
    // Calculate total unread messages for the section title
    const totalUnread =
      title === "Recent Chats"
        ? Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
        : 0;

    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {title}
          {totalUnread > 0 && (
            <Text style={[styles.sectionUnreadCount, { color: theme.accent }]}>
              {" "}
              ({totalUnread})
            </Text>
          )}
        </Text>
      </View>
    );
  };

  const prepareSectionData = () => {
    const sections = [];

    // Recent Chats Section - sort by unread first, then by latest message
    if (chats.length > 0) {
      const sortedChats = [...chats].sort((a, b) => {
        const aUnread = unreadCounts[a._id] || 0;
        const bUnread = unreadCounts[b._id] || 0;

        // First sort by unread (unread chats first)
        if (aUnread > 0 && bUnread === 0) return -1;
        if (bUnread > 0 && aUnread === 0) return 1;

        // Then sort by latest message time
        const aTime = new Date(a.latestMessage?.createdAt || a.updatedAt || 0);
        const bTime = new Date(b.latestMessage?.createdAt || b.updatedAt || 0);
        return bTime - aTime;
      });

      sections.push({
        title: "Recent Chats",
        data: sortedChats,
        renderItem: renderChatCard,
        showToggle: false,
      });
    }

    // Start New Chat Section - only show friends without existing chats
    if (availableFriends.length > 0) {
      const friendsToShow = showAllFriends
        ? availableFriends
        : availableFriends.slice(0, 50);
      sections.push({
        title: "Start New Chat",
        data: friendsToShow,
        renderItem: renderFriendCard,
        showToggle: true,
      });
    }

    return sections;
  };

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
          Loading chats...
        </Text>
      </View>
    );
  }

  const sections = prepareSectionData();

  // Calculate the bottom padding to ensure content isn't hidden behind navbar
  const navbarHeight = 60; // Approximate height of SideNav

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.navbarContainer}>
        <Navbar />
      </View>

      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Chats</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              console.log("Manual refresh triggered");
              handleRefresh();
            }}
          >
            <Text style={[styles.refreshButtonText, { color: theme.accent }]}>
              ↻
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={navigateToCreateGroup}
          >
            <Plus size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item._id + index}
          renderItem={({ item, section }) => section.renderItem({ item })}
          renderSectionHeader={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: navbarHeight + 20 }, // Add extra padding at bottom
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.accent]}
              tintColor={theme.accent}
            />
          }
          stickySectionHeadersEnabled={false}
          onScroll={handleScroll}
          scrollEventThrottle={16} // For smooth animation
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MessageCircle size={64} color="#6b7280" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No chats yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
            {friendsLoading
              ? "Loading friends..."
              : availableFriends.length === 0
              ? "All your friends already have chats with you!"
              : "Start a conversation with your friends!"}
          </Text>
          {friendsLoading && (
            <ActivityIndicator
              size="small"
              color={theme.accent}
              style={styles.emptyLoader}
            />
          )}
        </View>
      )}

      {/* Long Press Menu */}
      <LongPressMenu
        visible={showLongPressMenu}
        onClose={() => setShowLongPressMenu(false)}
        onReportUser={handleReportUser}
        chatData={selectedChat}
        position={menuPosition}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={handleCloseReportModal}
        chatData={selectedChat}
        reportedUser={selectedReportedUser}
      />

      {/* Animated SideNav */}
      <Animated.View style={dynamicStyles.sideNavContainer}>
        <SideNav />
      </Animated.View>
    </View>
  );
};

// Remove theme references from StyleSheet.create()
const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  createGroupButton: {
    padding: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionUnreadCount: {
    fontSize: 16,
    fontWeight: "600",
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chatCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  groupAvatarContainer: {
    width: 50,
    height: 50,
  },
  avatarBadgeContainer: {
    position: "absolute",
    top: -5,
    right: -5,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  chatNameUnread: {
    fontWeight: "700",
  },
  memberCount: {
    fontSize: 14,
    fontWeight: "normal",
  },
  timestampContainer: {
    alignItems: "flex-end",
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  timestampUnread: {
    fontWeight: "600",
  },
  lastMessage: {
    fontSize: 14,
  },
  lastMessageUnread: {
    fontWeight: "500",
  },
  chatIconContainer: {
    padding: 8,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  emptyLoader: {
    marginTop: 16,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    fontSize: 14,
    fontStyle: "italic",
    marginRight: 6,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default ChatPage;

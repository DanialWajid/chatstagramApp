import React, { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { User, Ban } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../store/themeContext";

const API_URL = "http://192.168.0.109:8000/api";

const UserCard = ({ cardUser, isPrivate, isFriend, onFriendUpdate }) => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useTheme();

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        const response = await axios.get(
          `${API_URL}/friends/status/${cardUser._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const { friendRequestStatus, requestId, isBlocked } = response.data;
        setRequestSent(friendRequestStatus === "pending");
        setRequestId(requestId);
        setIsBlocked(isBlocked);
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    };

    fetchUserStatus();
  }, [cardUser._id]);

  const handleBlockUser = async () => {
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${cardUser.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = await SecureStore.getItemAsync("token");
              const response = await axios.post(
                `${API_URL}/user/block-user/${user._id}`,
                {
                  userIdToBlock: cardUser._id,
                }
              );
              if (response.data.success) {
                setIsBlocked(true);
                Alert.alert(
                  "Success",
                  `User ${cardUser.name} has been blocked.`
                );
                onFriendUpdate && onFriendUpdate();
              }
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert(
                "Error",
                "Failed to block the user. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleUnblockUser = async () => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${cardUser.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = await SecureStore.getItemAsync("token");
              const response = await axios.post(
                `${API_URL}/user/unblock-user/${user._id}`,
                {
                  userIdToUnblock: cardUser._id,
                }
              );
              if (response.data.success) {
                setIsBlocked(false);
                Alert.alert(
                  "Success",
                  `User ${cardUser.name} has been unblocked.`
                );
                onFriendUpdate && onFriendUpdate();
              }
            } catch (error) {
              console.error("Error unblocking user:", error);
              Alert.alert(
                "Error",
                "Failed to unblock the user. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleFriendRequest = async () => {
    if (isLoading || requestSent || isBlocked) return;

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.post(
        `${API_URL}/friends/request/${cardUser._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { request } = response.data;
      setRequestSent(true);
      setRequestId(request.id);
      onFriendUpdate && onFriendUpdate();
      Alert.alert("Success", `Friend request sent to ${cardUser.name}.`);
    } catch (error) {
      console.error(
        "Error sending friend request:",
        error.response?.data || error.message
      );
      Alert.alert("Error", "Failed to send friend request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsendRequest = async () => {
    if (isLoading || !requestSent || !requestId) return;

    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this friend request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = await SecureStore.getItemAsync("token");

              await axios.delete(`${API_URL}/friends/request/${requestId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              setRequestSent(false);
              setRequestId(null);
              onFriendUpdate && onFriendUpdate();
            } catch (error) {
              console.error(
                "Error unsending friend request:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Error",
                "Failed to unsend friend request. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveFriend = async () => {
    if (isBlocked) return;

    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${cardUser.name} from your friends?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = await SecureStore.getItemAsync("token");

              await axios.delete(`${API_URL}/friends/remove/${cardUser._id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              onFriendUpdate && onFriendUpdate();
              Alert.alert(
                "Success",
                `${cardUser.name} has been removed from your friends.`
              );
            } catch (error) {
              console.error("Error removing friend:", error);
              Alert.alert(
                "Error",
                "Failed to remove friend. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const getButtonConfig = () => {
    if (isBlocked) {
      return {
        text: "Blocked",
        onPress: handleUnblockUser,
        style: { backgroundColor: theme.error },
        textStyle: { color: theme.buttonText },
      };
    } else if (isFriend) {
      return {
        text: "Remove Friend",
        onPress: handleRemoveFriend,
        style: { backgroundColor: theme.error },
        textStyle: { color: theme.buttonText },
      };
    } else if (requestSent) {
      return {
        text: "Cancel Request",
        onPress: handleUnsendRequest,
        style: { backgroundColor: theme.border },
        textStyle: { color: theme.text },
      };
    } else {
      return {
        text: "Send Friend Request",
        onPress: handleFriendRequest,
        style: { backgroundColor: theme.button },
        textStyle: { color: theme.buttonText },
      };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.accent,
          shadowColor: theme.accent,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.blockButton}
        onPress={isBlocked ? handleUnblockUser : handleBlockUser}
        disabled={isLoading}
      >
        <Ban size={20} color={isBlocked ? theme.buttonText : theme.error} />
      </TouchableOpacity>

      <View style={styles.cardContent}>
        {cardUser.profileImage ? (
          <Image
            source={{ uri: cardUser.profileImage }}
            style={[styles.avatar, { borderColor: theme.accent }]}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              { backgroundColor: theme.input, borderColor: theme.accent },
            ]}
          >
            <User size={40} color={theme.secondaryText} />
          </View>
        )}

        <View style={styles.userInfo}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile", { id: cardUser._id })}
          >
            <Text style={[styles.userName, { color: theme.text }]}>
              {cardUser.name}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
            {isPrivate ? "Email is private" : cardUser.email}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                buttonConfig.style,
                isLoading && styles.disabledButton,
              ]}
              onPress={buttonConfig.onPress}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <Text style={[styles.buttonText, buttonConfig.textStyle]}>
                  {buttonConfig.text}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  blockButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 8,
  },
  cardContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    marginRight: 16,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    marginRight: 8,
    marginBottom: 8,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default UserCard;

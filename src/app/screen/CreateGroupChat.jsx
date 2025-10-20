import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../store/themeContext";
import { User, Users, Check, X, Plus, AlertCircle } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

const CreateGroupChat = () => {
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const API_URL = "http://192.168.100.15:8000/api";

  useEffect(() => {
    fetchFriends();
  }, []);

  // Clear validation error when user starts typing
  useEffect(() => {
    if (groupName.trim() && validationError) {
      setValidationError("");
    }
  }, [groupName, validationError]);

  const fetchFriends = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      setLoading(true);

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

      setFriends(friendsList.filter((friend) => friend._id !== user._id));
    } catch (error) {
      console.error("Error fetching friends:", error);
      Alert.alert("Error", "Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friend) => {
    setSelectedFriends((prev) => {
      const isSelected = prev.find((f) => f._id === friend._id);
      if (isSelected) {
        return prev.filter((f) => f._id !== friend._id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const validateForm = () => {
    if (!groupName.trim()) {
      setValidationError("Please enter a group name first");
      return false;
    }

    if (selectedFriends.length < 2) {
      setValidationError("Please select at least 2 friends to create a group");
      return false;
    }

    setValidationError("");
    return true;
  };

  const createGroup = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);
      const token = await SecureStore.getItemAsync("token");

      const userIds = selectedFriends.map((friend) => friend._id);

      const response = await axios.post(
        `${API_URL}/chat/group`,
        {
          name: groupName.trim(),
          users: JSON.stringify(userIds),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const createdGroup = response.data;

      Alert.alert("Success", "Group created successfully!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("ChatMessage", {
              chatId: createdGroup._id,
              chatData: createdGroup,
            });
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Create dynamic styles inside the component
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
    groupNameSection: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },
    groupIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.cardHighlight || theme.card,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    groupNameInput: {
      flex: 1,
      fontSize: 18,
      color: theme.text,
      fontWeight: "600",
    },
    groupNameInputError: {
      borderColor: "#ef4444",
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
    },
    selectedSection: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },
    selectedFriendChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.input,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
    },
    chipAvatarFallback: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 6,
    },
    friendItem: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectedFriendItem: {
      borderColor: theme.accent,
      backgroundColor: theme.cardHighlight || theme.card,
    },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.input,
      alignItems: "center",
      justifyContent: "center",
    },
    selectedIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    unselectedIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.secondaryText,
    },
    createButtonActive: {
      backgroundColor: "#9333EA", // Purple color
    },
    createButtonInactive: {
      backgroundColor: theme.input,
    },
    validationError: {
      backgroundColor: "#fef2f2",
      borderColor: "#ef4444",
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      margin: 16,
      flexDirection: "row",
      alignItems: "center",
    },
    validationErrorDark: {
      backgroundColor: "#450a0a",
      borderColor: "#ef4444",
    },
  };

  const renderValidationError = () => {
    if (!validationError) return null;

    return (
      <View
        style={[
          dynamicStyles.validationError,
          theme.background === "#111827" && dynamicStyles.validationErrorDark,
        ]}
      >
        <AlertCircle size={20} color="#ef4444" />
        <Text
          style={[
            styles.validationErrorText,
            { color: "#ef4444", marginLeft: 8 },
          ]}
        >
          {validationError}
        </Text>
      </View>
    );
  };

  const renderFriendItem = ({ item }) => {
    const isSelected = selectedFriends.find((f) => f._id === item._id);

    return (
      <TouchableOpacity
        style={[
          dynamicStyles.friendItem,
          isSelected && dynamicStyles.selectedFriendItem,
        ]}
        onPress={() => toggleFriendSelection(item)}
      >
        <View style={styles.friendContent}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.avatar} />
          ) : (
            <View style={dynamicStyles.avatarFallback}>
              <User size={24} color={theme.secondaryText} />
            </View>
          )}

          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: theme.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.friendEmail, { color: theme.secondaryText }]}>
              {item.email}
            </Text>
          </View>

          <View style={styles.selectionIndicator}>
            {isSelected ? (
              <View style={dynamicStyles.selectedIcon}>
                <Check size={16} color="#ffffff" />
              </View>
            ) : (
              <View style={dynamicStyles.unselectedIcon} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedFriend = ({ item }) => (
    <View style={dynamicStyles.selectedFriendChip}>
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.chipAvatar} />
      ) : (
        <View style={dynamicStyles.chipAvatarFallback}>
          <User size={12} color={theme.secondaryText} />
        </View>
      )}
      <Text style={[styles.chipName, { color: theme.text }]}>{item.name}</Text>
      <TouchableOpacity
        onPress={() => toggleFriendSelection(item)}
        style={styles.removeChip}
      >
        <X size={14} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
          Loading friends...
        </Text>
      </View>
    );
  }

  const isFormValid = groupName.trim() && selectedFriends.length >= 2;

  return (
    <KeyboardAvoidingView
      style={dynamicStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Create Group
        </Text>
        <TouchableOpacity
          style={[
            styles.createButton,
            isFormValid
              ? dynamicStyles.createButtonActive
              : dynamicStyles.createButtonInactive,
          ]}
          onPress={createGroup}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size={16} color="#ffffff" />
          ) : (
            <Text
              style={[
                styles.createButtonText,
                {
                  color: isFormValid ? "#ffffff" : theme.secondaryText,
                },
              ]}
            >
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Validation Error */}
      {renderValidationError()}

      {/* Group Name Input */}
      <View style={dynamicStyles.groupNameSection}>
        <View style={dynamicStyles.groupIconContainer}>
          <Users size={24} color={theme.accent} />
        </View>
        <TextInput
          style={[
            dynamicStyles.groupNameInput,
            validationError &&
              !groupName.trim() &&
              dynamicStyles.groupNameInputError,
          ]}
          placeholder="Group name"
          placeholderTextColor={theme.secondaryText}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={50}
        />
      </View>

      {/* Selected Friends */}
      {selectedFriends.length > 0 && (
        <View style={dynamicStyles.selectedSection}>
          <Text style={[styles.selectedTitle, { color: theme.text }]}>
            Selected ({selectedFriends.length})
          </Text>
          <FlatList
            data={selectedFriends}
            renderItem={renderSelectedFriend}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedList}
          />
        </View>
      )}

      {/* Friends List */}
      <View style={styles.friendsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Choose friends ({friends.length})
        </Text>
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.friendsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={64} color={theme.secondaryText} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No friends found
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: theme.secondaryText }]}
              >
                Add some friends to create a group chat
              </Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
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
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  validationErrorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  selectedList: {
    paddingRight: 16,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  chipName: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 6,
  },
  removeChip: {
    padding: 2,
  },
  friendsSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  friendsList: {
    flexGrow: 1,
  },
  friendContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 14,
  },
  selectionIndicator: {
    marginLeft: 12,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default CreateGroupChat;

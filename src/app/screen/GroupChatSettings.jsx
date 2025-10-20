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
  Modal,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { useAuthStore } from "../../store/authStore";
import {
  User,
  Users,
  Edit3,
  UserMinus,
  UserPlus,
  LogOut,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

const GroupChatSettings = () => {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();

  const { chatId, chatData } = route.params;
  const API_URL = "http://192.168.100.15:8000/api";

  useEffect(() => {
    setGroupData(chatData);
    setNewGroupName(chatData?.chatName || "");
    setLoading(false);
  }, [chatData]);

  const isAdmin = groupData?.groupAdmin?._id === user._id;

  const renameGroup = async () => {
    if (!newGroupName.trim() || newGroupName === groupData.chatName) {
      setEditingName(false);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.put(
        `${API_URL}/chat/rename`,
        {
          chatId: chatId,
          chatName: newGroupName.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setGroupData(response.data);
      setEditingName(false);
      Alert.alert("Success", "Group name updated successfully");
    } catch (error) {
      console.error("Error renaming group:", error);
      Alert.alert("Error", "Failed to update group name");
    }
  };

  const removeUser = async (userId) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member from the group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync("token");

              const response = await axios.put(
                `${API_URL}/chat/groupremove`,
                {
                  chatId: chatId,
                  userId: userId,
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              setGroupData(response.data);
              Alert.alert("Success", "Member removed successfully");
            } catch (error) {
              console.error("Error removing user:", error);
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const leaveGroup = () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync("token");

            await axios.put(
              `${API_URL}/chat/groupremove`,
              {
                chatId: chatId,
                userId: user._id,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            navigation.navigate("ChatPage");
            Alert.alert("Success", "You have left the group");
          } catch (error) {
            console.error("Error leaving group:", error);
            Alert.alert("Error", "Failed to leave group");
          }
        },
      },
    ]);
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberItem}>
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <User size={24} color="#9ca3af" />
        </View>
      )}

      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.name}
          {item._id === groupData?.groupAdmin?._id && (
            <Text style={styles.adminLabel}> (Admin)</Text>
          )}
          {item._id === user._id && <Text style={styles.youLabel}> (You)</Text>}
        </Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>

      {isAdmin && item._id !== user._id && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeUser(item._id)}
        >
          <UserMinus size={20} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={styles.loadingText}>Loading group settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Group Info */}
      <View style={styles.groupInfoSection}>
        <View style={styles.groupIcon}>
          <Users size={32} color="#9333EA" />
        </View>

        <View style={styles.groupDetails}>
          {editingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.editNameInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                onBlur={renameGroup}
                onSubmitEditing={renameGroup}
                autoFocus
                maxLength={50}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.groupNameContainer}
              onPress={() => isAdmin && setEditingName(true)}
              disabled={!isAdmin}
            >
              <Text style={styles.groupName}>{groupData?.chatName}</Text>
              {isAdmin && <Edit3 size={16} color="#9ca3af" />}
            </TouchableOpacity>
          )}

          <Text style={styles.memberCount}>
            {groupData?.users?.length} members
          </Text>
        </View>
      </View>

      {/* Members List */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Members</Text>
        <FlatList
          data={groupData?.users || []}
          renderItem={renderMember}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.membersList}
        />
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.leaveButton} onPress={leaveGroup}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#9ca3af",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    backgroundColor: "#1f2937",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: "#f9fafb",
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f9fafb",
  },
  headerSpacer: {
    width: 40,
  },
  groupInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    backgroundColor: "#1f2937",
  },
  groupIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1e1b4b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#9333EA",
    marginRight: 16,
  },
  groupDetails: {
    flex: 1,
  },
  groupNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f9fafb",
    marginRight: 8,
  },
  editNameContainer: {
    marginBottom: 4,
  },
  editNameInput: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#9333EA",
    paddingBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  membersSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f9fafb",
    marginBottom: 16,
  },
  membersList: {
    flexGrow: 1,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1f2937",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f9fafb",
    marginBottom: 2,
  },
  adminLabel: {
    color: "#9333EA",
    fontSize: 14,
    fontWeight: "500",
  },
  youLabel: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "500",
  },
  memberEmail: {
    fontSize: 14,
    color: "#9ca3af",
  },
  removeButton: {
    padding: 8,
  },
  actionsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#1f2937",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  leaveButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default GroupChatSettings;

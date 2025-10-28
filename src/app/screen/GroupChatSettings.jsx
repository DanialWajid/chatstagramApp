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
  UserPlus,
  LogOut,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useTheme } from "../../store/themeContext";

const GroupChatSettings = () => {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [memberMenuVisible, setMemberMenuVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [availableFriends, setAvailableFriends] = useState([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();

  const { chatId, chatData } = route.params;
  const API_URL = "http://192.168.100.15:8000/api";

  useEffect(() => {
    setGroupData(chatData);
    setNewGroupName(chatData?.chatName || "");
    setLoading(false);
  }, [chatData]);

  const isUserAdmin = (userId) => {
    if (!groupData?.groupAdmin) return false;
    if (Array.isArray(groupData.groupAdmin)) {
      return groupData.groupAdmin.some(admin => admin._id === userId);
    }
    return groupData.groupAdmin._id === userId;
  };

  const isCurrentUserAdmin = isUserAdmin(user._id);

  const canCurrentUserAddMembers = () => {
    if (isCurrentUserAdmin) return true;
    const perms = groupData?.memberPermissions?.[user._id];
    return perms?.canAddMembers || false;
  };

  const canCurrentUserEditGroup = () => {
    if (isCurrentUserAdmin) return true;
    const perms = groupData?.memberPermissions?.[user._id];
    return perms?.canEditGroup || false;
  };

  const getMemberPermissions = (memberId) => {
    if (!groupData?.memberPermissions) {
      return { canAddMembers: false, canEditGroup: false };
    }
    
    const perms = groupData.memberPermissions[memberId];
    return perms || { canAddMembers: false, canEditGroup: false };
  };

  const openMemberMenu = (member) => {
    setSelectedMember(member);
    setMemberMenuVisible(true);
  };

  const closeMemberMenu = () => {
    setSelectedMember(null);
    setMemberMenuVisible(false);
  };

  const handleRemoveMember = async (memberId) => {  //removeUser to handleRemoveMember
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member from the group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            closeMemberMenu(); //
            try {
              setActionLoading(true); // 
              const token = await SecureStore.getItemAsync("token");

              const response = await axios.put(
                `${API_URL}/chat/groupremove`,
                {
                  chatId: chatId,
                  userId: memberId,  // userId to memberId
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              setGroupData(response.data);
              Alert.alert("Success", "Member removed successfully");
            } catch (error) {
              console.error("Error removing user:", error);
              Alert.alert("Error", error.response?.data?.message || "Failed to remove member");  //
            } finally {   //
              setActionLoading(false);     // 
            }
          },
        },
      ]
    );
  };

  const makeMemberAdmin = async (memberId) => {
    closeMemberMenu();
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.put(
        `${API_URL}/chat/group/make-admin`,
        { chatId: chatId, userId: memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGroupData(response.data);
      Alert.alert("Success", "Member promoted to admin");
    } catch (error) {
      console.error("Error making admin:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to promote member");
    } finally {
      setActionLoading(false);
    }
  };

  const dismissMemberAsAdmin = async (memberId) => {
    closeMemberMenu();
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.put(
        `${API_URL}/chat/group/dismiss-admin`,
        { chatId: chatId, userId: memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGroupData(response.data);
      Alert.alert("Success", "Admin dismissed successfully");
    } catch (error) {
      console.error("Error dismissing admin:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to dismiss admin");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleMemberPermission = async (memberId, permissionType) => {
    closeMemberMenu();
    try {
      setActionLoading(true);
      const token = await SecureStore.getItemAsync("token");

      const currentPerms = getMemberPermissions(memberId);
      const newValue = !currentPerms[permissionType];

      const payload = { chatId, userId: memberId };
      payload[permissionType] = newValue;

      const response = await axios.put(
        `${API_URL}/chat/group/member-permissions`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGroupData(response.data);
      
      const permissionName = permissionType === 'canAddMembers' ? 'add members' : 'edit group info';
      Alert.alert(
        "Success",
        `Member ${newValue ? 'allowed' : 'forbidden'} to ${permissionName}`
      );
    } catch (error) {
      console.error("Error updating permission:", error);
      Alert.alert("Error", "Failed to update permission");
    } finally {
      setActionLoading(false);
    }
  };

  const pickGroupImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const manipResult = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 600, height: 600 } }],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );

      uploadGroupImage(manipResult.uri);
    }
  };

  const uploadGroupImage = async (uri) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append("groupProfilePic", { uri, name: filename, type });

      const response = await axios.put(
        `${API_URL}/chat/group/update-profile/${chatId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setGroupData(response.data.group);
      Alert.alert("Success", "Group profile picture updated!");
      navigation.navigate("ChatPage", { updatedGroup: response.data.group });
    } catch (error) {
      console.error("Error uploading group image:", error);
      Alert.alert("Error", "Failed to upload group picture.");
    }
  };

  const renameGroup = async () => {
    if (!newGroupName.trim() || newGroupName === groupData.chatName) {
      setEditingName(false);
      return;
    }

    try {
      const token = await SecureStore.getItemAsync("token");

      const response = await axios.put(
        `${API_URL}/chat/rename`,
        { chatId: chatId, chatName: newGroupName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGroupData(response.data);
      setEditingName(false);
      Alert.alert("Success", "Group name updated successfully");
    } catch (error) {
      console.error("Error renaming group:", error);
      Alert.alert("Error", "Failed to update group name");
    }
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

  const openAddModal = async () => {
    try {
      setFriendsLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const resp = await axios.get(`${API_URL}/friends/list/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      let list = Array.isArray(resp.data) ? resp.data : resp.data?.friends || resp.data?.data || [];
      const memberIds = new Set((groupData?.users || []).map((u) => u._id));
      list = list.filter((f) => f._id !== user._id && !memberIds.has(f._id));
      setAvailableFriends(list);
      setSelectedNewMembers([]);
      setShowAddModal(true);
    } catch (err) {
      console.error("Error fetching friends for add modal:", err);
      Alert.alert("Error", "Failed to load friends");
    } finally {
      setFriendsLoading(false);
    }
  };

  const toggleNewMember = (friend) => {
    setSelectedNewMembers((prev) => {
      if (prev.find((f) => f._id === friend._id)) {
        return prev.filter((f) => f._id !== friend._id);
      }
      return [...prev, friend];
    });
  };

  const addNewMembers = async () => {
    if (selectedNewMembers.length === 0) {
      Alert.alert("Select members", "Please select at least one member to add.");
      return;
    }
    try {
      const token = await SecureStore.getItemAsync("token");
      const ids = selectedNewMembers.map((f) => f._id);
      const response = await axios.put(
        `${API_URL}/chat/groupadd`,
        { chatId: chatId, userIds: ids },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGroupData(response.data);
      setShowAddModal(false);
      Alert.alert("Success", "Members added successfully");
    } catch (error) {
      console.error("Error adding members:", error);
      Alert.alert("Error", "Failed to add members");
    }
  };

  const renderMember = ({ item }) => {
    const isMemberAdmin = isUserAdmin(item._id);
    const showMenu = isCurrentUserAdmin && item._id !== user._id;

    return (
      <View style={[styles.memberItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.input }]}>
            <User size={24} color={theme.secondaryText} />
          </View>
        )}

        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.text }]}>
            {item.name}
            {isMemberAdmin && (
              <Text style={[styles.adminLabel, { color: theme.accent }]}> (Admin)</Text>
            )}
            {item._id === user._id && <Text style={styles.youLabel}> (You)</Text>}
          </Text>
          <Text style={[styles.memberEmail, { color: theme.secondaryText }]}>{item.email}</Text>
        </View>

        {showMenu && (
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => openMemberMenu(item)}
            disabled={actionLoading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.menuDots, { color: theme.secondaryText }]}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const MemberMenuModal = () => {
    if (!selectedMember) return null;

    const memberPerms = getMemberPermissions(selectedMember._id);
    const isMemberAdmin = isUserAdmin(selectedMember._id);

    return (
      <Modal visible={memberMenuVisible} animationType="fade" transparent>
        <View style={styles.menuOverlay}>
          <View style={[styles.menuContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>{selectedMember.name}</Text>
            
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => handleRemoveMember(selectedMember._id)}
              disabled={actionLoading}
            >
              <Text style={[styles.menuItemText, { color: theme.error }]}>
                Remove from Group
              </Text>
            </TouchableOpacity>

            {isMemberAdmin ? (
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: theme.border }]}
                onPress={() => dismissMemberAsAdmin(selectedMember._id)}
                disabled={actionLoading}
              >
                <Text style={[styles.menuItemText, { color: theme.text }]}>Dismiss as Admin</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: theme.border }]}
                  onPress={() => makeMemberAdmin(selectedMember._id)}
                  disabled={actionLoading}
                >
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Make Group Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: theme.border }]}
                  onPress={() => toggleMemberPermission(selectedMember._id, 'canAddMembers')}
                  disabled={actionLoading}
                >
                  <Text style={[styles.menuItemText, { color: theme.text }]}>
                    {memberPerms.canAddMembers ? 'Forbid to Add Members' : 'Allow to Add Members'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: theme.border }]}
                  onPress={() => toggleMemberPermission(selectedMember._id, 'canEditGroup')}
                  disabled={actionLoading}
                >
                  <Text style={[styles.menuItemText, { color: theme.text }]}>
                    {memberPerms.canEditGroup ? 'Forbid to Edit Group Pic & Name' : 'Allow to Edit Group Pic & Name'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.menuItem, styles.menuClose]}
              onPress={closeMemberMenu}
            >
              <Text style={[styles.menuCloseText, { color: theme.secondaryText }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
          Loading group settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Group Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Group Info */}
      <View style={[styles.groupInfoSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.groupIcon, { borderColor: theme.accent }]}
          onPress={() => canCurrentUserEditGroup() && pickGroupImage()}
          disabled={!canCurrentUserEditGroup()}
        >
          {groupData?.groupProfilePic ? (
            <Image
              source={{ uri: groupData.groupProfilePic }}
              style={{ width: 60, height: 60, borderRadius: 30 }}
            />
          ) : (
            <Users size={32} color={theme.accent} />
          )}

          {canCurrentUserEditGroup() && (
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                backgroundColor: theme.accent,
                borderRadius: 10,
                padding: 3,
                borderWidth: 1,
                borderColor: theme.card,
              }}
            >
              <Edit3 size={12} color={theme.buttonText} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.groupDetails}>
          {editingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={[styles.editNameInput, { color: theme.text, borderBottomColor: theme.accent }]}
                value={newGroupName}
                onChangeText={setNewGroupName}
                onBlur={renameGroup}
                onSubmitEditing={renameGroup}
                autoFocus
                maxLength={50}
                placeholderTextColor={theme.secondaryText}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.groupNameContainer}
              onPress={() => canCurrentUserEditGroup() && setEditingName(true)}
              disabled={!canCurrentUserEditGroup()}
            >
              <Text style={[styles.groupName, { color: theme.text }]}>{groupData?.chatName}</Text>
              {canCurrentUserEditGroup() && <Edit3 size={16} color={theme.secondaryText} />}
            </TouchableOpacity>
          )}

          <Text style={[styles.memberCount, { color: theme.secondaryText }]}>
            {groupData?.users?.length} members
          </Text>
        </View>
      </View>

      {canCurrentUserAddMembers() && (
        <TouchableOpacity
          style={[styles.addMembersButton, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
          onPress={openAddModal}
        >
          <UserPlus size={18} color={theme.accent} />
          <Text style={[styles.addMembersText, { color: theme.accent }]}>Add Members</Text>
        </TouchableOpacity>
      )}

      <View style={styles.membersSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Members</Text>
        <FlatList
          data={groupData?.users || []}
          renderItem={renderMember}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.membersList}
        />
      </View>

      <MemberMenuModal />
      
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Members</Text>
            {friendsLoading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <FlatList
                data={availableFriends}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.friendRow, { borderBottomColor: theme.border }]}
                    onPress={() => toggleNewMember(item)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {item.profileImage ? (
                        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: theme.input }]}>
                          <User size={20} color={theme.secondaryText} />
                        </View>
                      )}
                      <View style={{ marginLeft: 10 }}>
                        <Text style={[styles.memberName, { color: theme.text }]}>{item.name}</Text>
                        <Text style={[styles.memberEmail, { color: theme.secondaryText }]}>{item.email}</Text>
                      </View>
                    </View>
                    <Text style={{ color: theme.accent, fontSize: 18 }}>
                      {selectedNewMembers.find((f) => f._id === item._id) ? "✓" : ""}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.accent }]} 
                onPress={addNewMembers}
              >
                <Text style={{ color: theme.buttonText }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.input }]} 
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.actionsSection, { borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.leaveButton, { backgroundColor: theme.card, borderColor: theme.error }]} 
          onPress={leaveGroup}
        >
          <LogOut size={20} color={theme.error} />
          <Text style={[styles.leaveButtonText, { color: theme.error }]}>Leave Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
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
  headerSpacer: {
    width: 40,
  },
  groupInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  groupIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1e1b4b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginRight: 16,
    position: "relative",
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
    marginRight: 8,
  },
  editNameContainer: {
    marginBottom: 4,
  },
  editNameInput: {
    fontSize: 20,
    fontWeight: "bold",
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    marginTop: 4,
  },
  membersSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  membersList: {
    flexGrow: 1,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  adminLabel: {
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
  },
  actionsSection: {
    padding: 16,
    borderTopWidth: 1,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  addMembersButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  addMembersText: {
    marginLeft: 8,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: { 
    fontSize: 18, 
    marginBottom: 12, 
    fontWeight: "700" 
  },
  friendRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 12, 
    borderBottomWidth: 1,
  },
  modalButtons: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    marginTop: 12 
  },
  modalButton: { 
    padding: 10, 
    borderRadius: 8, 
    marginLeft: 8 
  },
  menuButton: {
    padding: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDots: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: 'bold',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  menuContainer: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuClose: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  menuCloseText: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default GroupChatSettings;

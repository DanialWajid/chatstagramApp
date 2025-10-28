"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Clipboard,
} from "react-native";
import {
  Shield,
  Users,
  Lock,
  LockOpen,
  User,
  ArrowLeft,
  Copy,
} from "lucide-react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  getProfileById,
  getUserStats,
  deleteAccount,
  checkIfBlocked,
} from "../../services/profile.services";
import { useAuthStore } from "../../store/authStore";
import { enable2FA, disable2FA } from "../../services/TwoFactor";
import FriendsListModal from "../../components/FriendListModal";
import FriendProtectedContent from "../../components/FriendStatus";
import EditProfileModal from "../../components/EditProfileModal";
import TwoFactorModal from "../../components/TwoFactorModal";
import SideNav from "../../components/SideNav";
import Navbar from "../../components/Navbar";
import { useTheme } from "../../store/themeContext";

const Profile = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const id = route?.params?.id;
  const [profile, setProfile] = useState({});
  const [stats, setStats] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme } = useTheme();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const userId = user ? user._id : null;

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, statsData, blockedStatus] = await Promise.all([
        getProfileById(id),
        getUserStats(id),
        checkIfBlocked(user._id, id),
      ]);
      setProfile(profileData);
      setStats(statsData);
      setIsBlocked(blockedStatus);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [id, user]);

  const handleDeleteAccount = async () => {
    try {
      setShowDeleteConfirm(false);
      await deleteAccount(id);
      navigation.navigate("Signup");
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  const handleEnable2FA = async () => {
    try {
      const result = await enable2FA(user._id);
      setIs2FAEnabled(true);
      return result;
    } catch (error) {
      console.error("Error enabling 2FA:", error);
      throw error;
    }
  };

  const handleDisable2FA = async () => {
    try {
      await disable2FA(user._id);
      setIs2FAEnabled(false);
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      throw error;
    }
  };
  const handleCopyUserId = () => {
    Clipboard.setString(user._id); // Copy full ID
    setShowCopySuccess(true);
    setTimeout(() => {
      setShowCopySuccess(false);
    }, 3000);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Navbar />
        <ActivityIndicator
          size="large"
          color={theme.accent}
          style={styles.loadingIndicator}
        />
        <SideNav />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Navbar />

      <ScrollView
        style={{ ...styles.scrollView, paddingTop: 95 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
          />
        }
      >
        {/* Profile Header */}
        <View style={[styles.profileSection, { backgroundColor: theme.card }]}>
          <View style={styles.avatarContainer}>
            {profile.profileImage && !isBlocked ? (
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: theme.input },
                ]}
              >
                <User size={40} color={theme.secondaryText} />
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>
              {isBlocked ? "Catstagram User" : profile.name || "User"}
            </Text>

            {profile.bio && !isBlocked && (
              <Text style={[styles.profileBio, { color: theme.secondaryText }]}>
                {profile.bio}
              </Text>
            )}

            {id === userId && !isBlocked && (
              <View style={styles.userIdContainer}>
                <View
                  style={[
                    styles.userIdBox,
                    { backgroundColor: theme.input, borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={[styles.userIdLabel, { color: theme.secondaryText }]}
                  >
                    User ID:
                  </Text>
                  <Text
                    style={[styles.userIdText, { color: theme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {user._id}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: theme.accent }]}
                  onPress={handleCopyUserId}
                >
                  <Copy size={18} color={theme.buttonText} />
                </TouchableOpacity>
              </View>
            )}

            {/* Copy Success Message */}
            {showCopySuccess && (
              <View style={styles.copySuccessContainer}>
                <Text style={styles.copySuccessText}>
                  User ID copied successfully ✅
                </Text>
              </View>
            )}

            {/* Stats Row */}
            <View style={styles.statsContainer}>
              <TouchableOpacity
                style={[
                  styles.statItem,
                  {
                    backgroundColor: "#8B7355",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                  },
                ]}
                onPress={() => setShowFriendsModal(true)}
              >
                <Text
                  style={[
                    styles.statLabel,
                    { color: "#ffffff", fontSize: 16, fontWeight: "600" },
                  ]}
                >
                  Connections: {stats.friendsCount || 0}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Buttons - Only show for own profile */}
        {id === userId && !isBlocked && (
          <View style={styles.actionsSection}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.accent }]}
                onPress={() => setShowEditModal(true)}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.secondaryAccent || "#5856D6" },
                ]}
                onPress={() => setShow2FAModal(true)}
              >
                <Shield size={20} color={theme.buttonText || "#ffffff"} />
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                  {is2FAEnabled ? "Manage 2FA" : "Enable 2FA"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: theme.error }]}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text
                style={[styles.deleteButtonText, { color: theme.buttonText }]}
              >
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Protected Content */}
        <FriendProtectedContent
          userId={id}
          fallbackMessage="Only connections can view this user's connections list"
        />

        {/* Modals */}
        <TwoFactorModal
          isOpen={show2FAModal}
          onClose={() => setShow2FAModal(false)}
          onEnable={handleEnable2FA}
          onDisable={handleDisable2FA}
          isEnabled={is2FAEnabled}
          theme={theme}
        />

        <FriendsListModal
          isOpen={showFriendsModal}
          onClose={() => setShowFriendsModal(false)}
          userId={id}
        />

        {showEditModal && (
          <EditProfileModal
            profile={profile}
            onClose={() => setShowEditModal(false)}
            onUpdate={(updatedProfile) => {
              setProfile(updatedProfile);
              setShowEditModal(false);
            }}
          />
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Confirm Account Deletion
            </Text>
            <Text style={[styles.modalText, { color: theme.secondaryText }]}>
              Are you sure you want to delete your account? This action cannot
              be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.error }]}
                onPress={handleDeleteAccount}
              >
                <Text
                  style={[styles.modalButtonText, { color: theme.buttonText }]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SideNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingIndicator: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 95,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    padding: 24,
    margin: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#3b82f6",
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#3b82f6",
  },
  profileInfo: {
    alignItems: "center",
    width: "100%",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  profileBio: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  userIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  userIdBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    maxWidth: 250,
  },
  userIdLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  userIdText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "monospace",
    flex: 1,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  copySuccessContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  copySuccessText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#10b981",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Profile;

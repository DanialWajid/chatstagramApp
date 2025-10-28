import React, { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { User, X } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../store/themeContext";

const { width } = Dimensions.get("window");

const FriendsListModal = ({ isOpen, onClose, userId }) => {
  const [mutualFriends, setMutualFriends] = useState([]);
  const [otherFriends, setOtherFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const API_URL = "http://192.168.100.15:8000/";

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen, userId]);

  const fetchFriends = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      setLoading(true);

      // Fetch profile's friends
      const profileFriendsResponse = await axios.get(
        `${API_URL}api/friends/list/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Handle different response structures
      let profileFriends = [];
      if (Array.isArray(profileFriendsResponse.data)) {
        profileFriends = profileFriendsResponse.data;
      } else if (profileFriendsResponse.data?.friends) {
        profileFriends = profileFriendsResponse.data.friends;
      } else if (profileFriendsResponse.data?.data) {
        profileFriends = profileFriendsResponse.data.data;
      }

      if (userId !== user._id) {
        const myFriendsResponse = await axios.get(
          `${API_URL}api/friends/list/${user._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        let myFriends = [];
        if (Array.isArray(myFriendsResponse.data)) {
          myFriends = myFriendsResponse.data;
        } else if (myFriendsResponse.data?.friends) {
          myFriends = myFriendsResponse.data.friends;
        } else if (myFriendsResponse.data?.data) {
          myFriends = myFriendsResponse.data.data;
        }

        // Calculate mutual friends
        const mutual = profileFriends.filter((profileFriend) =>
          myFriends.some((myFriend) => myFriend._id === profileFriend._id)
        );

        // Calculate other friends (excluding mutual friends AND current user)
        const others = profileFriends.filter(
          (profileFriend) =>
            !myFriends.some((myFriend) => myFriend._id === profileFriend._id) &&
            profileFriend._id !== user._id // Exclude current user
        );

        setMutualFriends(mutual);
        setOtherFriends(others);
      } else {
        // If viewing own profile, all friends go to otherFriends (excluding self)
        setMutualFriends([]);
        setOtherFriends(
          profileFriends.filter((friend) => friend._id !== user._id)
        );
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      setMutualFriends([]);
      setOtherFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const renderFriendCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.friendCard, { backgroundColor: theme.card }]}
      onPress={() => {
        onClose();
        navigation.navigate("Profile", { id: item._id });
      }}
    >
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
      ) : (
        <View
          style={[styles.avatarFallback, { backgroundColor: theme.border }]}
        >
          <User size={32} color={theme.secondaryText} />
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text
          style={[styles.friendName, { color: theme.text }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.friendEmail, { color: theme.secondaryText }]}
          numberOfLines={1}
        >
          {item.email}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.card, shadowColor: theme.accent },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Friends List
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : (
            <View style={styles.friendsContent}>
              {/* Combined ScrollView for both sections */}
              <FlatList
                ListHeaderComponent={
                  <>
                    {/* Mutual Friends Section */}
                    {mutualFriends.length > 0 && (
                      <View style={styles.sectionContainer}>
                        <Text
                          style={[styles.sectionTitle, { color: theme.text }]}
                        >
                          Mutual Friends ({mutualFriends.length})
                        </Text>
                        <FlatList
                          data={mutualFriends}
                          renderItem={renderFriendCard}
                          keyExtractor={(item) => item._id}
                          scrollEnabled={false}
                          contentContainerStyle={styles.friendsListContent}
                        />
                      </View>
                    )}

                    {/* Other Friends Section Header */}
                    <View style={styles.sectionContainer}>
                      <Text
                        style={[styles.sectionTitle, { color: theme.text }]}
                      >
                        {userId === user._id ? "All Friends" : "Other Friends"}{" "}
                        ({otherFriends.length})
                      </Text>
                    </View>
                  </>
                }
                data={otherFriends}
                renderItem={renderFriendCard}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.mainListContent}
                ListEmptyComponent={
                  <Text
                    style={[styles.emptyText, { color: theme.secondaryText }]}
                  >
                    {userId === user._id
                      ? "You don't have any connections yet"
                      : "No other connections to show"}
                  </Text>
                }
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width * 0.9,
    height: "80%",
    borderRadius: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  friendsContainer: {
    flex: 1,
  },
  friendsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    padding: 16,
    paddingBottom: 8,
  },
  friendsList: {
    paddingHorizontal: 16,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  friendInfo: {
    marginLeft: 12,
    flex: 1,
  },
  friendsContent: {
    flex: 1,
  },
  sectionContainer: {
    paddingHorizontal: 16,
  },
  mainListContent: {
    paddingBottom: 20,
  },
  friendsListContent: {
    paddingBottom: 10,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
  },
  friendEmail: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    padding: 20,
  },
});

export default FriendsListModal;

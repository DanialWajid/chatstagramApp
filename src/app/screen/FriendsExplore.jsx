import React, { useState, useEffect } from "react";
import SideNav from "../../components/SideNav";
import * as SecureStore from "expo-secure-store";
import Navbar from "../../components/Navbar";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import UserCard from "../../components/UserCard";
import { Search, UserPlus } from "lucide-react-native";
import { useTheme } from "../../store/themeContext";
import { LinearGradient } from "expo-linear-gradient";

const FriendsExplore = () => {
  const [potentialFriends, setPotentialFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [quickAddId, setQuickAddId] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddMessage, setQuickAddMessage] = useState({
    text: "",
    type: "",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  const API_URL = "http://192.168.0.110:8000";

  useEffect(() => {
    fetchPotentialFriends();
  }, []);

  const fetchPotentialFriends = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const response = await axios.get(`${API_URL}/api/friends/potential`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPotentialFriends(response.data);
    } catch (error) {
      console.error("Error fetching potential friends:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPotentialFriends();
  };

  const handleSearchChange = (text) => {
    setSearchTerm(text);
  };
  const handleQuickAdd = async () => {
    if (!quickAddId.trim()) {
      setQuickAddMessage({ text: "Please enter a User ID.", type: "error" });
      setTimeout(() => setQuickAddMessage({ text: "", type: "" }), 4000);
      return;
    }

    setQuickAddLoading(true);
    setQuickAddMessage({ text: "", type: "" });

    try {
      const token = await SecureStore.getItemAsync("token");
      const response = await axios.post(
        `${API_URL}/api/friends/quick-add`,
        { targetUserId: quickAddId.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setQuickAddMessage({
        text: response.data.message || "User added successfully!",
        type: "success",
      });
      setQuickAddId("");

      // Refresh potential friends list
      setTimeout(() => {
        fetchPotentialFriends();
      }, 1000);

      setTimeout(() => setQuickAddMessage({ text: "", type: "" }), 4000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to add user. Please try again.";
      setQuickAddMessage({ text: errorMessage, type: "error" });
      setTimeout(() => setQuickAddMessage({ text: "", type: "" }), 4000);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const filteredFriends = potentialFriends.filter((friend) =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderFriendItem = ({ item }) => (
    <UserCard
      key={item._id}
      cardUser={item}
      isPrivate={item.isPrivate}
      isFriend={false}
      onFriendUpdate={fetchPotentialFriends}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Navbar />
      <View style={styles.quickAddSection}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientTitle}
        >
          <Text style={styles.sectionTitle}>Quick Add Friends</Text>
        </LinearGradient>

        <View style={styles.quickAddInputContainer}>
          <View
            style={[
              styles.quickAddInput,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TextInput
              style={[styles.quickAddTextInput, { color: theme.text }]}
              placeholder="Enter User ID..."
              placeholderTextColor={theme.secondaryText}
              value={quickAddId}
              onChangeText={setQuickAddId}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.quickAddButton,
              {
                backgroundColor: theme.accent,
                opacity: quickAddLoading ? 0.6 : 1,
              },
            ]}
            onPress={handleQuickAdd}
            disabled={quickAddLoading}
          >
            {quickAddLoading ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <>
                <UserPlus size={20} color={theme.buttonText} />
                <Text
                  style={[
                    styles.quickAddButtonText,
                    { color: theme.buttonText },
                  ]}
                >
                  Quick Add
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Add Message */}
        {quickAddMessage.text !== "" && (
          <View style={styles.messageContainer}>
            <Text
              style={[
                styles.messageText,
                {
                  color:
                    quickAddMessage.type === "success" ? "#10b981" : "#ef4444",
                },
              ]}
            >
              {quickAddMessage.text}
            </Text>
          </View>
        )}
      </View>

      {/* Explore Friends Section */}
      <View style={styles.exploreFriendsSection}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientTitle}
        >
          <Text style={styles.sectionTitle}>Explore Friends</Text>
        </LinearGradient>
      </View>
      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Search
          size={20}
          color={theme.secondaryText}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by name..."
          placeholderTextColor={theme.secondaryText}
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Friends List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                {searchTerm
                  ? "No friends match your search."
                  : "No potential friends found."}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.accent]}
              tintColor={theme.accent}
              progressBackgroundColor={theme.card}
            />
          }
        />
      )}
      <SideNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 70,
  },
  quickAddSection: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  exploreFriendsSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  gradientTitle: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  quickAddInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  quickAddInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    justifyContent: "center",
  },
  quickAddTextInput: {
    fontSize: 16,
    height: "100%",
  },
  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    height: 48,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  messageContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  searchContainer: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default FriendsExplore;

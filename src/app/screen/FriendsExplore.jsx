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
  ScrollView,
} from "react-native";
import axios from "axios";
import UserCard from "../../components/UserCard";
import { Search, UserPlus } from "lucide-react-native";
import { useTheme } from "../../store/themeContext";

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

  const API_URL = "http://192.168.100.15:8000";

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
            progressBackgroundColor={theme.card}
          />
        }
      >
        {/* Quick Add Section */}
        <View style={styles.quickAddSection}>
          <Text style={[styles.quickAddTitle, { color: theme.text }]}>
            Quick Add by User ID
          </Text>

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
                <UserPlus size={22} color={theme.buttonText} />
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
                      quickAddMessage.type === "success"
                        ? "#10b981"
                        : "#ef4444",
                  },
                ]}
              >
                {quickAddMessage.text}
              </Text>
            </View>
          )}
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
        ) : filteredFriends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              {searchTerm
                ? "No connection match your search."
                : "No potential connection found."}
            </Text>
          </View>
        ) : (
          filteredFriends.map((item) => (
            <UserCard
              key={item._id}
              cardUser={item}
              isPrivate={item.isPrivate}
              isFriend={false}
              onFriendUpdate={fetchPotentialFriends}
            />
          ))
        )}
      </ScrollView>
      <SideNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 95,
    paddingHorizontal: 16,
    paddingBottom: 150,
  },
  quickAddSection: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.2)",
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  quickAddInputContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  quickAddInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    justifyContent: "center",
  },
  quickAddTextInput: {
    fontSize: 15,
    height: "100%",
  },
  quickAddButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 50,
    width: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  messageContainer: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  messageText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
});

export default FriendsExplore;

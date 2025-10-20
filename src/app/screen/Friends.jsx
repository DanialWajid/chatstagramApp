import React, { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import SideNav from "../../components/SideNav";
import Navbar from "../../components/Navbar";
import axios from "axios";
import UserCard from "../../components/UserCard";
import { useAuthStore } from "../../store/authStore";
import { Search } from "lucide-react-native";
import { useTheme } from "../../store/themeContext";

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [activeTab, setActiveTab] = useState("friends");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useTheme();

  const API_URL = "http://192.168.100.15:8000";

  useEffect(() => {
    if (activeTab === "friends") {
      fetchData();
    }
    // eslint-disable-next-line
  }, [activeTab]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = friends.filter((friend) =>
        friend.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFriends(filtered);
    } else {
      setFilteredFriends(friends);
    }
  }, [searchTerm, friends]);

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Error", "Authentication token missing");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const response = await axios.get(
        `${API_URL}/api/friends/list/${user._id}`,
        config
      );
      setFriends(response.data);
      setFilteredFriends(response.data);
    } catch (error) {
      console.error("Full error:", error);
      if (error.response) {
        console.log("Error response:", error.response.data);
        Alert.alert(
          "Error",
          error.response.data.message ||
            `Request failed with status ${error.response.status}`
        );
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSearchChange = (text) => {
    setSearchTerm(text);
  };

  const renderFriendItem = ({ item }) => (
    <UserCard
      key={item._id}
      isPrivate={false}
      cardUser={item}
      isFriend={true}
      onFriendUpdate={fetchData}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Navbar />
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "friends"
              ? [styles.activeTab, { backgroundColor: theme.accent }]
              : styles.inactiveTab,
          ]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "friends"
                ? [styles.activeTabText, { color: theme.buttonText }]
                : [styles.inactiveTabText, { color: theme.secondaryText }],
            ]}
          >
            My Friends
          </Text>
        </TouchableOpacity>
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
          placeholder="Search friends by name..."
          placeholderTextColor={theme.secondaryText}
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredFriends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={
              filteredFriends.length === 0
                ? styles.emptyListContainer
                : styles.listContainer
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: theme.secondaryText }]}
                >
                  {searchTerm
                    ? "No matching friends found"
                    : "No friends found"}
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
      </View>
      <SideNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 70,
  },
  tabContainer: {
    flexDirection: "row",
    paddingTop: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {},
  inactiveTab: {
    backgroundColor: "#4b5563",
  },
  tabText: {
    fontWeight: "600",
    fontSize: 16,
  },
  activeTabText: {},
  inactiveTabText: {},
  searchContainer: {
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
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
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

export default Friends;

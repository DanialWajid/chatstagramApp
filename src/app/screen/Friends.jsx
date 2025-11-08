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
  ScrollView,
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useTheme();

  const API_URL = "http://192.168.0.110:8000";

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

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
            placeholder="Search connections by name..."
            placeholderTextColor={theme.secondaryText}
            value={searchTerm}
            onChangeText={handleSearchChange}
          />
        </View>

        {/* Content Area */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : filteredFriends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              {searchTerm ? "No matching friends found" : "No friends found"}
            </Text>
          </View>
        ) : (
          filteredFriends.map((item) => (
            <UserCard
              key={item._id}
              isPrivate={false}
              cardUser={item}
              isFriend={true}
              onFriendUpdate={fetchData}
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

export default Friends;

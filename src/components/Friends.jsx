import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import axios from "axios";
import UserCard from "../../components/UserCard";
import { useAuthStore } from "../../store/authStore";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "../../store/themeContext";

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("friends");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useTheme();

  const API_URL = "http://192.168.0.104:8000";

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");

      if (activeTab === "friends") {
        const response = await axios.get(
          `${API_URL}/api/friends/list/${user._id}`
        );
        setFriends(response.data);
      } else {
        const response = await axios.get(
          `${API_URL}/api/friends/requests/pending`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setRequests(response.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 404) {
        Alert.alert("Error", "Endpoint not found - check API routes");
      } else {
        Alert.alert("Error", "Failed to fetch data");
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

  const handleRequestAction = async (requestId, action) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const endpoint = action === "approve" ? "approve" : "decline";
      await axios.post(
        `${API_URL}/api/friends/request/${endpoint}/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      Alert.alert("Error", `Failed to ${action} request`);
    }
  };

  const renderFriendItem = ({ item }) => (
    <UserCard
      user={item}
      isFriend={activeTab === "friends"}
      onApprove={() => handleRequestAction(item._id, "approve")}
      onDecline={() => handleRequestAction(item._id, "decline")}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: theme.card, borderColor: theme.border },
            activeTab === "friends" && {
              backgroundColor: theme.accent,
              borderColor: theme.accent,
            },
          ]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.secondaryText },
              activeTab === "friends" && { color: theme.buttonText },
            ]}
          >
            My Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: theme.card, borderColor: theme.border },
            activeTab === "requests" && {
              backgroundColor: theme.accent,
              borderColor: theme.accent,
            },
          ]}
          onPress={() => setActiveTab("requests")}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.secondaryText },
              activeTab === "requests" && { color: theme.buttonText },
            ]}
          >
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : (
          <FlatList
            data={activeTab === "friends" ? friends : requests}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: theme.secondaryText }]}
                >
                  {activeTab === "friends"
                    ? "No friends yet"
                    : "No pending requests"}
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.accent]}
                tintColor={theme.accent}
              />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderWidth: 1.5,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default Friends;

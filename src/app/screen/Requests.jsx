import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import axios from "axios";
import SideNav from "../../components/SideNav";
import Navbar from "../../components/Navbar";
import RequestCard from "../../components/RequestCard";
import { useAuthStore } from "../../store/authStore";
import { Search } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "../../store/themeContext";

const Requests = () => {
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useTheme();

  const API_URL = "http://192.168.100.15:8000";

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
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
        `${API_URL}/api/friends/requests/pending`,
        config
      );

      setReceivedRequests(response.data);
      setFilteredRequests(response.data);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      if (error.response) {
        Alert.alert(
          "Error",
          error.response.data.message ||
            `Request failed with status ${error.response.status}`
        );
      } else {
        Alert.alert("Error", "Failed to fetch friend requests");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleSearchChange = (text) => {
    const term = text.toLowerCase();
    setSearchTerm(term);
    const filtered = receivedRequests.filter((request) =>
      request.sentBy.name.toLowerCase().includes(term)
    );
    setFilteredRequests(filtered);
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      setLoading(true);
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

      const endpoint = action === "approve" ? "approve" : "decline";
      await axios.post(
        `${API_URL}/api/friends/request/${endpoint}/${requestId}`,
        {},
        config
      );

      fetchRequests(); // Refresh the list after action
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      if (error.response) {
        Alert.alert(
          "Error",
          error.response.data.message || `Failed to ${action} request`
        );
      } else {
        Alert.alert("Error", `Failed to ${action} friend request`);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderRequestItem = ({ item }) => (
    <RequestCard
      key={item._id}
      request={item}
      isSentRequest={false}
      onApprove={() => handleRequestAction(item._id, "approve")}
      onDecline={() => handleRequestAction(item._id, "decline")}
      loading={loading}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Navbar />
      <View style={styles.tabContainer}>
        <View
          style={[
            styles.tabButton,
            styles.activeTab,
            { backgroundColor: theme.accent },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              styles.activeTabText,
              { color: theme.buttonText },
            ]}
          >
            Friend Requests
          </Text>
        </View>
      </View>

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
          placeholder="Search requests by name..."
          placeholderTextColor={theme.secondaryText}
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                {searchTerm
                  ? "No matching requests found"
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
  tabText: {
    fontWeight: "600",
    fontSize: 16,
  },
  activeTabText: {},
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
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

export default Requests;

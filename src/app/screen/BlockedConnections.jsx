import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useTheme } from "../../store/themeContext";
import { useAuthStore } from "../../store/authStore";
import { UserX } from "lucide-react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Navbar from "../../components/Navbar";
import SideNav from "../../components/SideNav";
import UserCard from "../../components/UserCard";

const BlockedConnections = () => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = "http://192.168.100.15:8000/api";

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.background,
    },
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");

      // Get current user's full profile with populated blocked users
      const response = await axios.get(
        `${API_URL}/profile/getProfile/${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // The blocked field should contain populated user objects
      const blocked = response.data.blocked || [];

      // Filter out any invalid or null user objects
      const validBlockedUsers = blocked.filter(
        (blockedUser) => blockedUser && blockedUser._id && blockedUser.name
      );

      console.log("Blocked users:", validBlockedUsers);
      setBlockedUsers(validBlockedUsers);
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      Alert.alert("Error", "Failed to load blocked users");
      setBlockedUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBlockedUsers();
  };

  const renderBlockedUser = ({ item }) => (
    <UserCard
      key={item._id}
      cardUser={item}
      isPrivate={item.isPrivate || false}
      isFriend={false}
      onFriendUpdate={fetchBlockedUsers}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <UserX size={64} color={theme.secondaryText} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No Blocked Users
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
        You haven't blocked anyone yet
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={dynamicStyles.container}>
        <Navbar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading blocked users...
          </Text>
        </View>
        <SideNav />
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <Navbar />
      <View style={styles.content}>
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderBlockedUser}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.accent]}
              tintColor={theme.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
      <SideNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 60,
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default BlockedConnections;

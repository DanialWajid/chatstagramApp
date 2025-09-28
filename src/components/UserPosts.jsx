import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import PostCard from "./PostCard";
import { useAuthStore } from "../store/authStore";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "../store/themeContext";

const UserPosts = ({ userId, scrollEnabled = true }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();
  const { theme } = useTheme();

  useEffect(() => {
    const API_URL = "https://catstagram-backend-production.up.railway.app";

    const fetchUserPosts = async () => {
      try {
        setLoading(true);
        const token = await SecureStore.getItemAsync("token");

        const response = await axios.get(
          `${API_URL}/api/posts/${userId}/${user._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPosts(response.data.data.posts || []);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch posts");
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserPosts();
    }
  }, [userId, user._id]);

  const renderItem = ({ item }) => <PostCard post={item} user={user} />;

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            No posts yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.postsList}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  errorContainer: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
  },
  postsList: {
    paddingBottom: 16,
  },
});

export default UserPosts;

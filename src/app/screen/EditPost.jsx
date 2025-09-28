import React, { useEffect, useState } from "react";
import SideNav from "../../components/SideNav";
import Navbar from "../../components/Navbar";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import EditPostForm from "../../components/EditPostForm";
import { useTheme } from "../../store/themeContext";

const EditPost = () => {
  const route = useRoute();
  const { id } = route.params;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.get(
          `https://catstagram-backend-production.up.railway.app/api/posts/edit/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            timeout: 10000, // 10 second timeout
          }
        );

        console.log("API Response Data:", response.data);

        if (response.data?.success) {
          setPost(response.data.post);
        } else {
          throw new Error(response.data?.message || "Invalid response format");
        }
      } catch (err) {
        console.error("Detailed Error:", {
          message: err.message,
          response: err.response?.data,
          config: err.config,
          stack: err.stack,
        });

        let errorMessage = "Failed to load post";
        if (err.response) {
          errorMessage =
            err.response.data?.message ||
            `Server responded with ${err.response.status}`;
        } else if (err.request) {
          errorMessage = "No response from server - check your network";
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

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
      <ScrollView
        contentContainerStyle={[
          styles.errorContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      </ScrollView>
    );
  }

  if (!post) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.errorContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.error }]}>
          Post not found
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Navbar />
      <EditPostForm post={post} />
      <SideNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 70,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
});

export default EditPost;

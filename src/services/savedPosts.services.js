import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = "https://catstagram-backend-production.up.railway.app/api/saved-posts";

export const savePost = async (userId, postId) => {
  try {
    const response = await axios.post(`${API_URL}/save`, {
      userId,
      postId,
    });
    return response.data;
  } catch (error) {
    console.error("Error saving post:", error);
    throw error;
  }
};

export const unsavePost = async (userId, postId) => {
  try {
    const response = await axios.post(`${API_URL}/unsave`, {
      userId,
      postId,
    });
    return response.data;
  } catch (error) {
    console.error("Error unsaving post:", error);
    throw error;
  }
};

export const getSavedPosts = async (userId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await axios.get(`${API_URL}/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    throw error;
  }
};

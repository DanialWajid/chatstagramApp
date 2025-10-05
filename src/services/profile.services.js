import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://192.168.0.104:8000/api/profile";

export const updateProfile = async (formData, id) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    console.log("Update " + id);

    const response = await axios.put(
      `${API_URL}/update-profile/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};
export const verifyTwoFactor = async (code, userId) => {
  set({ isLoading: true, error: null });
  try {
    const response = await axios.post(`${API_URL}/verify-2fa`, {
      token: code,
      userId,
      // if you have one
    });

    const token = response.data.token;
    const user = response.data.user;

    storeToken(token);

    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      twoFactorRequired: false,
    });

    // Return success to trigger navigation
    return { success: true };
  } catch (error) {
    set({
      error: error.response?.data?.message || "Invalid verification code",
      isLoading: false,
    });
    throw error;
  }
};

export const getProfileById = async (id) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    console.log("GetByID " + id);

    const response = await axios.get(`${API_URL}/getProfile/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting profile by ID:", error);
    throw error;
  }
};

export const getUserStats = async (id) => {
  try {
    const token = await SecureStore.getItemAsync("token");

    const response = await axios.get(`${API_URL}/stats/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw error;
  }
};

export const deleteAccount = async (id) => {
  try {
    const token = await SecureStore.getItemAsync("token");

    const response = await axios.delete(`${API_URL}/delete-account/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

export const checkIfBlocked = async (userId, profileId) => {
  try {
    const token = await SecureStore.getItemAsync("token");

    const response = await axios.get(
      `${API_URL}/check-blocked/${userId}/${profileId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.isBlocked;
  } catch (error) {
    console.error("Error checking if blocked:", error);
    throw error;
  }
};

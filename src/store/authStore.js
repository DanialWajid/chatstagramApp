import { create } from "zustand";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Dynamic API URL configuration
const getApiUrl = () => {
  const isEmulator = Constants.manifest?.debuggerHost;

  // Android emulator
  if (isEmulator && isEmulator.includes(":")) {
    return `http://0.0.0.0:8000/api/user`;
  }

  // Physical device (replace with your computer's IP)
  return "http://192.168.0.109:8000/api/user";
};

const API_URL = getApiUrl();

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  message: null,

  setUser: (updatedUser) =>
    set((state) => ({
      user: { ...state.user, ...updatedUser },
    })),

  // Initialize auth state from storage
  initializeAuth: async () => {
    try {
      const [token, user] = await Promise.all([
        SecureStore.getItemAsync("token"),
        AsyncStorage.getItem("userInfo"),
      ]);

      if (token && user) {
        set({
          token,
          user: JSON.parse(user),
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error("Initial auth load error:", error);
    }
  },

  signup: async (email, password, name) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const response = await axios.post(
        `${API_URL}/signup`,
        { email, password, name },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("[Signup] Response:", response.data);

      // Don't look for token yet – just navigate to verification screen
      set({
        isLoading: false,
        message: response.data.message,
      });

      return { email }; // return email to use on Verification screen
    } catch (error) {
      console.error("[Signup] Full error:", {
        message: error.message,
        response: error.response?.data,
        code: error.code,
      });

      let errorMsg = "Network error";
      if (error.response) {
        errorMsg =
          error.response.data?.message || JSON.stringify(error.response.data);
      } else if (error.message.includes("Network Error")) {
        errorMsg = "Cannot connect to server. Check your network.";
      }

      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },
  verifyEmail: async (code) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(
        `${API_URL}/verify-email`,
        { code },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      // Debug log
      console.log("[VerifyEmail] Response:", response.data);

      // Get token from Authorization header
      const authHeader = response.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (token) {
        try {
          await SecureStore.setItemAsync("token", token);
          console.log("✅ Token stored successfully in SecureStore.");
        } catch (error) {
          console.log("❌ Failed to store token in SecureStore:", error);
        }
      }

      if (response.data?.user) {
        await AsyncStorage.setItem(
          "userInfo",
          JSON.stringify(response.data.user)
        );
      }

      set({
        user: response.data.user,
        token,
        isAuthenticated: true,
        isLoading: false,
        message: "Email verified successfully!",
      });

      return response.data;
    } catch (error) {
      console.error("[VerifyEmail] Full error:", {
        message: error.message,
        response: error.response?.data,
      });

      const errorMsg =
        error.response?.data?.message ||
        "Error verifying email. Please try again.";

      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Data", data);

      if (!response.ok) {
        console.log("Login failed:", data.message);
        throw new Error(data.message || "Login failed");
      }

      // Store token securely
      await SecureStore.setItemAsync("token", data.token);
      // Optionally save user data to AsyncStorage
      await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));

      console.log("Login success: token stored");

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error) {
      console.error("Login error:", error.message);
      return { success: false, error: error.message };
    }
  },
  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const token = await SecureStore.getItemAsync("token");
      const response = await axios.post(
        `${API_URL}/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set({ message: "Password changed successfully", isLoading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to change password",
        isLoading: false,
      });
    }
  },
  // Logout function
  logout: async () => {
    try {
      // Retrieve the token from SecureStore or AsyncStorage
      const token = await SecureStore.getItemAsync("token");

      if (token) {
        // Send the logout request to your backend to blacklist the token
        const response = await fetch(`${API_URL}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`, // Send token as Authorization header
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          // Successfully logged out, token blacklisted
          console.log("Logout successful:", data.message);

          // Delete token from SecureStore and AsyncStorage
          await SecureStore.deleteItemAsync("token");
          await AsyncStorage.removeItem("userInfo");

          // Update state to reflect that the user is logged out
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        } else {
          console.log("Logout failed:", data.message);
        }
      }
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  },
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null, message: null });

    try {
      const response = await axios.post(
        `${API_URL}/forgot-password`,
        { email },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("[ForgotPassword] Response:", response.data);

      set({
        isLoading: false,
        message: response.data.message || "Password reset email sent!",
      });

      return response.data;
    } catch (error) {
      console.error("[ForgotPassword] Full error:", {
        message: error.message,
        response: error.response?.data,
      });

      const errorMsg =
        error.response?.data?.message ||
        "Failed to send password reset email. Please try again.";

      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  // Clear error messages
  clearError: () => set({ error: null }),

  // Clear success messages
  clearMessage: () => set({ message: null }),
}));

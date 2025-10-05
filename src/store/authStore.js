import { create } from "zustand";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Dynamic API URL configuration
const getApiUrl = () => {
  const isEmulator = Constants.manifest?.debuggerHost;

  if (isEmulator && isEmulator.includes(":")) {
    // Android emulator
    return `http://0.0.0.0:8000/api/user`;
  }

  // Physical device (replace with your IP)
  return "http://192.168.0.104:8000/api/user";
};

const API_URL = getApiUrl();

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  message: null,
  twoFactorRequired: false,

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

      set({
        isLoading: false,
        message: response.data.message,
      });

      return { email };
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

      console.log("[VerifyEmail] Response:", response.data);

      const authHeader = response.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (token) {
        await SecureStore.setItemAsync("token", token);
        console.log("✅ Token stored successfully.");
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
      console.log("Login response:", data);
      console.log("Two factor detected", data.twoFactorRequired);

      if (!response.ok) {
        throw new Error(data.message || "Invalid Email or Password");
      }

      console.log("userid", data.userId);
      if (data.twoFactorRequired) {
        if (data.userId) {
          await AsyncStorage.setItem("pendingUserId", String(data.userId));
        }

        set({
          user: data.user,
          token: null,
          isAuthenticated: false,
          twoFactorRequired: true,
        });

        return { twoFactorRequired: true, userId: data.userId };
      }

      // Save token securely
      await SecureStore.setItemAsync("token", data.token);
      await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        twoFactorRequired: false,
      });

      return { success: true };
    } catch (error) {
      console.error("Login error:", error.message);
      set({
        isAuthenticated: false,
        twoFactorRequired: false,
      });
      return { success: false, error: error.message };
    }
  },

  verifyTwoFactor: async (code) => {
    try {
      // get stored userId
      console.log("Start of verfiy 2FA");
      const pendingUserId = await AsyncStorage.getItem("pendingUserId");

      if (!pendingUserId) {
        throw new Error("No pending user found. Please login again.");
      }

      const response = await fetch(`${API_URL}/verify-2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: code, userId: pendingUserId }),
      });

      const data = await response.json();
      console.log("Verify 2FA response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Invalid verification code");
      }

      // Clean up
      await AsyncStorage.removeItem("pendingUserId");

      await SecureStore.setItemAsync("token", data.token);
      await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        twoFactorRequired: false,
      });
      console.log("verification success");

      return { success: true, twoFactorEnabled: data.twoFactorEnabled };
    } catch (error) {
      console.error("2FA verification error:", error.message);
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

  logout: async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (token) {
        const response = await fetch(`${API_URL}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Logout successful:", data.message);

          await SecureStore.deleteItemAsync("token");
          await AsyncStorage.removeItem("userInfo");

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

  clearError: () => set({ error: null }),
  clearMessage: () => set({ message: null }),
}));

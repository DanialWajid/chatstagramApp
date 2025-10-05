import axios from "axios";

const API_URL = "http://192.168.0.104:8000/api/user";

export const enable2FA = async (userId) => {
  try {
    const response = await axios.post(`${API_URL}/enable-2fa`, { userId });
    return response.data;
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    throw error;
  }
};

export const disable2FA = async (userId) => {
  try {
    const response = await axios.post(`${API_URL}/disable-2fa`, { userId });
    return response.data;
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    throw error;
  }
};

import AsyncStorage from "@react-native-async-storage/async-storage";

export const getUserInfo = async () => {
  try {
    const storedUser = await AsyncStorage.getItem("userInfo");
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch user info:", error);
    return null;
  }
};

export const clearUserInfo = async () => {
  try {
    await AsyncStorage.removeItem("userInfo");
  } catch (error) {
    console.error("Failed to remove user info:", error);
  }
};

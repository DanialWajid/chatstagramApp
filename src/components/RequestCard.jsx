import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { User, Ban } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../store/themeContext";

const RequestCard = ({
  request,
  isSentRequest,
  onUnsend,
  onApprove,
  onDecline,
  loading,
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const userInfo = isSentRequest ? request.sentTo : request.sentBy;

  const getButtonConfig = () => {
    if (isSentRequest) {
      return [
        {
          text: loading ? "..." : "Unsend Request",
          onPress: () => onUnsend(request._id),
          style: { backgroundColor: theme.error },
          textStyle: { color: theme.buttonText },
        },
        {
          text: "View Profile",
          onPress: () => navigation.navigate("Profile", { id: userInfo?._id }),
          style: { backgroundColor: theme.button },
          textStyle: { color: theme.buttonText },
        },
      ];
    } else {
      return [
        {
          text: loading ? "..." : "Approve",
          onPress: () => onApprove(request._id),
          style: { backgroundColor: theme.success },
          textStyle: { color: theme.buttonText },
        },
        {
          text: loading ? "..." : "Decline",
          onPress: () => onDecline(request._id),
          style: { backgroundColor: theme.error },
          textStyle: { color: theme.buttonText },
        },
      ];
    }
  };

  const buttons = getButtonConfig();

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: theme.card, borderColor: theme.accent, shadowColor: theme.accent },
      ]}
    >
      <View style={styles.cardContent}>
        {userInfo.profileImage ? (
          <Image
            source={{ uri: userInfo.profileImage }}
            style={[styles.avatar, { borderColor: theme.accent }]}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              { backgroundColor: theme.input, borderColor: theme.accent },
            ]}
          >
            <User size={40} color={theme.secondaryText} />
          </View>
        )}

        <View style={styles.userInfo}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile", { id: userInfo?._id })}
          >
            <Text style={[styles.userName, { color: theme.text }]}>
              {userInfo?.name}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
            {userInfo?.email}
          </Text>

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.button, button.style]}
                onPress={button.onPress}
                disabled={loading}
              >
                {loading && index === 0 ? (
                  <ActivityIndicator size="small" color={theme.buttonText} />
                ) : (
                  <Text style={[styles.buttonText, button.textStyle]}>{button.text}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    marginRight: 16,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    marginRight: 8,
    marginBottom: 8,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
});

export default RequestCard;
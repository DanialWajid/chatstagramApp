"use client";

import { View, Text, StyleSheet } from "react-native";
import { Phone, PhoneMissed, Clock } from "lucide-react-native";
import { useTheme } from "../store/themeContext";

export default function CallInfoMessage({ item, isMyMessage }) {
  const { theme } = useTheme();

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getCallStatus = () => {
    if (item.callStatus === "missed") {
      return "Call Missed";
    } else if (item.callStatus === "rejected") {
      return "Call Rejected";
    } else if (item.callStatus === "ended") {
      return "Call Ended";
    }
    return "Call";
  };

  const getCallIcon = () => {
    if (item.callStatus === "missed" || item.callStatus === "rejected") {
      return <PhoneMissed size={20} color="#ef4444" />;
    }
    return <Phone size={20} color="#10b981" />;
  };

  const backgroundColor =
    item.callStatus === "missed" || item.callStatus === "rejected"
      ? "#fee2e2"
      : "#ecfdf5";
  const borderColor =
    item.callStatus === "missed" || item.callStatus === "rejected"
      ? "#fca5a5"
      : "#86efac";
  const textColor =
    item.callStatus === "missed" || item.callStatus === "rejected"
      ? "#991b1b"
      : "#166534";

  return (
    <View
      style={[
        styles.callInfoContainer,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.callHeader}>
        {getCallIcon()}
        <View style={styles.callInfo}>
          <Text style={[styles.callStatus, { color: textColor }]}>
            {getCallStatus()}
          </Text>
          {item.callerName && (
            <Text style={[styles.callerName, { color: textColor }]}>
              {isMyMessage ? "You" : item.callerName}
            </Text>
          )}
        </View>
      </View>

      {item.duration > 0 && (
        <View style={styles.callDuration}>
          <Clock size={14} color={textColor} />
          <Text style={[styles.durationText, { color: textColor }]}>
            Duration: {formatDuration(item.duration)}
          </Text>
        </View>
      )}

      {item.callStatus === "missed" && (
        <Text style={[styles.statusMessage, { color: textColor }]}>
          {isMyMessage ? "📞 Missed incoming call" : "📞 You missed this call"}
        </Text>
      )}

      {item.callStatus === "rejected" && (
        <Text style={[styles.statusMessage, { color: textColor }]}>
          {isMyMessage ? "❌ You rejected the call" : "❌ Call was rejected"}
        </Text>
      )}

      {item.callStatus === "ended" && item.duration > 0 && (
        <Text style={[styles.statusMessage, { color: textColor }]}>
          ✓ Call completed
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  callInfoContainer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    minWidth: 200,
    gap: 10,
    marginVertical: 4,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  callInfo: {
    flex: 1,
    gap: 2,
  },
  callStatus: {
    fontSize: 15,
    fontWeight: "700",
  },
  callerName: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.8,
  },
  callDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 32,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusMessage: {
    fontSize: 12,
    fontWeight: "500",
    paddingLeft: 32,
    fontStyle: "italic",
  },
});

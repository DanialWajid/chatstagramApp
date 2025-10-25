"use client";

import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
} from "react-native";
import { Mic, Phone, PhoneOff } from "lucide-react-native";
import { useTheme } from "../store/themeContext";
import { useEffect, useRef } from "react";

export default function VoiceCallModal({
  visible,
  inCall,
  isRinging,
  isCalling,
  displayName,
  isMuted,
  speakerOn,
  remoteUid,
  onToggleMute,
  onToggleSpeaker,
  onEnd,
  onAccept,
  onReject,
}) {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRinging || isCalling) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isRinging, isCalling]);

  const safeDisplayName =
    typeof displayName === "object"
      ? JSON.stringify(displayName)
      : String(displayName ?? "");

  const safeRemoteUid =
    typeof remoteUid === "object"
      ? JSON.stringify(remoteUid)
      : String(remoteUid ?? "");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onEnd}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            (isRinging || isCalling) && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {isRinging
              ? "Incoming Call"
              : isCalling
              ? "Calling..."
              : inCall
              ? "In Call"
              : "Calling..."}
          </Text>

          <Text
            style={[styles.subtitle, { color: theme.secondaryText }]}
            numberOfLines={1}
          >
            {safeDisplayName}
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isRinging
                    ? "#f59e0b"
                    : isCalling
                    ? "#3b82f6"
                    : inCall
                    ? "#10b981"
                    : "#f59e0b",
                },
              ]}
            />
            <Text style={{ color: theme.secondaryText }}>
              {isRinging
                ? "Ringing..."
                : isCalling
                ? "Calling..."
                : inCall
                ? safeRemoteUid &&
                  safeRemoteUid !== "null" &&
                  safeRemoteUid !== ""
                  ? `Connected • User ${safeRemoteUid}`
                  : "Connected"
                : "Calling..."}
            </Text>
          </View>

          {isRinging && !inCall ? (
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: "#10b981" }]}
                onPress={onAccept}
              >
                <Phone size={24} color="#fff" />
                <Text
                  style={{ color: "#fff", marginTop: 4, fontWeight: "600" }}
                >
                  Accept
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rejectBtn, { backgroundColor: "#ef4444" }]}
                onPress={onReject}
              >
                <PhoneOff size={24} color="#fff" />
                <Text
                  style={{ color: "#fff", marginTop: 4, fontWeight: "600" }}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          ) : isCalling && !inCall ? (
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.endBtn, { backgroundColor: "#ef4444" }]}
                onPress={onEnd}
              >
                <PhoneOff size={24} color="#fff" />
                <Text
                  style={{ color: "#fff", marginTop: 4, fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: theme.input }]}
                onPress={onToggleMute}
              >
                <Mic size={24} color={theme.text} />
                <Text style={{ color: theme.text, marginTop: 4 }}>
                  {isMuted ? "Unmute" : "Mute"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: theme.input }]}
                onPress={onToggleSpeaker}
              >
                <Text style={{ color: theme.text }}>
                  {speakerOn ? "Earpiece" : "Speaker"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.endBtn, { backgroundColor: "#ef4444" }]}
                onPress={onEnd}
              >
                <Text style={{ color: "#fff" }}>End</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: { width: "85%", borderRadius: 16, padding: 16, borderWidth: 1 },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 12 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ctrlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  endBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});

"use client";

import { Modal, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Mic } from "lucide-react-native";
import { useTheme } from "../store/themeContext";
import { useEffect } from "react";

export default function VoiceCallModal({
  visible,
  inCall,
  displayName,
  isMuted,
  speakerOn,
  remoteUid,
  onToggleMute,
  onToggleSpeaker,
  onEnd,
}) {
  const { theme } = useTheme();

  // Debug once to confirm received props
  useEffect(() => {
    console.log("VoiceCallModal props:", {
      visible,
      inCall,
      displayName,
      isMuted,
      speakerOn,
      remoteUid,
    });
  }, [visible, inCall, displayName, isMuted, speakerOn, remoteUid]);

  // Safely format props (avoid crashing if they're objects or undefined)
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
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {inCall ? "In Call" : "Calling..."}
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
                { backgroundColor: inCall ? "#10b981" : "#f59e0b" },
              ]}
            />
            <Text style={{ color: theme.secondaryText }}>
              {inCall
                ? safeRemoteUid &&
                  safeRemoteUid !== "null" &&
                  safeRemoteUid !== ""
                  ? `Connected • User ${safeRemoteUid}`
                  : "Connected"
                : "Ringing"}
            </Text>
          </View>

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
        </View>
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
  endBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});

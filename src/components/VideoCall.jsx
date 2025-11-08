"use client";

import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
} from "react-native";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react-native";
import { useTheme } from "../store/themeContext";
import { useEffect, useRef } from "react";
import { RtcSurfaceView, RenderModeType } from "react-native-agora"; // ✅ Fixed import

export default function VideoCallModal({
  visible,
  inCall,
  isRinging,
  isCalling,
  displayName,
  isVideoMuted,
  isCameraOn,
  speakerOn,
  remoteUid,
  localUid = 0,
  agoraEngine,
  onToggleMute,
  onToggleCamera,
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
  const showVideoStreams = inCall && isCameraOn && agoraEngine;

  useEffect(() => {
    if (showVideoStreams) {
      console.log(
        "[v0] Rendering video streams - Remote UID:",
        remoteUid,
        "Local UID:",
        localUid
      );
    }
  }, [showVideoStreams, remoteUid, localUid]);

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
            showVideoStreams && styles.videoCard,
          ]}
        >
          {showVideoStreams ? (
            <View style={styles.videoContainer}>
              {/* Remote video (full screen) */}
              {remoteUid && remoteUid !== null && remoteUid !== 0 ? (
                <View style={styles.remoteVideo}>
                  <RtcSurfaceView
                    canvas={{
                      uid: remoteUid,
                      renderMode: RenderModeType.RenderModeHidden, // ✅ Fixed enum
                    }}
                    style={styles.videoStream}
                  />
                  <Text style={styles.videoLabel}>{safeDisplayName}</Text>
                </View>
              ) : (
                <View
                  style={[styles.remoteVideo, { backgroundColor: theme.input }]}
                >
                  <Text
                    style={[styles.waitingText, { color: theme.secondaryText }]}
                  >
                    Waiting for {safeDisplayName} to join...
                  </Text>
                </View>
              )}

              {/* Local video */}
              <View
                style={[styles.localVideo, { backgroundColor: theme.input }]}
              >
                <RtcSurfaceView
                  canvas={{
                    uid: 0,
                    renderMode: RenderModeType.RenderModeHidden, // ✅ Fixed enum
                  }}
                  zOrderMediaOverlay={true}
                  style={styles.videoStream}
                />
                <Text style={styles.localVideoLabel}>You</Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.text }]}>
                {isRinging
                  ? "Incoming Video Call"
                  : isCalling
                  ? "Calling..."
                  : inCall
                  ? "In Video Call"
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
            </>
          )}

          {/* Buttons */}
          {isRinging && !inCall ? (
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: "#10b981" }]}
                onPress={onAccept}
              >
                <Video size={24} color="#fff" />
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
            <View
              style={[
                styles.controls,
                showVideoStreams && styles.videoControls,
              ]}
            >
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: theme.input }]}
                onPress={onToggleMute}
              >
                {isVideoMuted ? (
                  <MicOff size={20} color={theme.text} />
                ) : (
                  <Mic size={20} color={theme.text} />
                )}
                <Text style={{ color: theme.text, marginTop: 2, fontSize: 11 }}>
                  {isVideoMuted ? "Unmute" : "Mute"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: theme.input }]}
                onPress={onToggleCamera}
              >
                {isCameraOn ? (
                  <Video size={20} color={theme.text} />
                ) : (
                  <VideoOff size={20} color={theme.text} />
                )}
                <Text style={{ color: theme.text, marginTop: 2, fontSize: 11 }}>
                  {isCameraOn ? "Camera On" : "Camera Off"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: theme.input }]}
                onPress={onToggleSpeaker}
              >
                <Text style={{ color: theme.text, fontSize: 11 }}>
                  {speakerOn ? "Earpiece" : "Speaker"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.endBtn, { backgroundColor: "#ef4444" }]}
                onPress={onEnd}
              >
                <PhoneOff size={20} color="#fff" />
                <Text style={{ color: "#fff", marginTop: 2, fontSize: 11 }}>
                  End
                </Text>
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
  card: {
    width: "85%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  videoCard: {
    width: "95%",
    height: "80%",
    padding: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  videoControls: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    padding: 12,
  },
  ctrlBtn: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  endBtn: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  videoContainer: {
    flex: 1,
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  remoteVideo: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  localVideo: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  videoStream: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  videoLabel: {
    position: "absolute",
    bottom: 10,
    left: 10,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  localVideoLabel: {
    position: "absolute",
    bottom: 5,
    left: 5,
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  waitingText: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
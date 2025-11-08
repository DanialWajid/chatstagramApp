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
import { RtcSurfaceView, RenderModeType } from "react-native-agora";

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
                      renderMode: RenderModeType.RenderModeHidden,
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
                    renderMode: RenderModeType.RenderModeHidden,
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
              <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
                <Video size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
                <PhoneOff size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : isCalling && !inCall ? (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.endBtn} onPress={onEnd}>
                <PhoneOff size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.controls,
                showVideoStreams && styles.videoControls,
              ]}
            >
              <TouchableOpacity style={styles.ctrlBtn} onPress={onToggleMute}>
                {isVideoMuted ? (
                  <MicOff size={20} color="#fff" />
                ) : (
                  <Mic size={20} color="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.ctrlBtn} onPress={onToggleCamera}>
                {isCameraOn ? (
                  <Video size={20} color="#fff" />
                ) : (
                  <VideoOff size={20} color="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={onToggleSpeaker}
              >
                <Text style={styles.ctrlLabel}>
                  {speakerOn ? "Ear" : "Spk"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.endBtn} onPress={onEnd}>
                <PhoneOff size={20} color="#fff" />
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
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 16,
  },
  videoControls: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 50,
    padding: 12,
  },
  ctrlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#333",
  },
  ctrlLabel: {
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
  },
  acceptBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10b981",
  },
  rejectBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ef4444",
  },
  endBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ef4444",
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

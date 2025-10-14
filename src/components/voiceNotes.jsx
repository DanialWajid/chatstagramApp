"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Audio } from "expo-av";
import { Pause, Play, StopCircle, Send } from "lucide-react-native";
import { useTheme } from "../store/themeContext";

export const AudioMessagePlayer = ({ uri, isMyMessage }) => {
  const { theme } = useTheme();
  const soundRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatMillis = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        try {
          soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }
    };
  }, []);

  const ensureLoaded = async () => {
    if (soundRef.current) return;
    setIsLoading(true);
    const s = new Audio.Sound();
    s.setOnPlaybackStatusUpdate((status) => {
      if (!status) return;
      if ("positionMillis" in status && "durationMillis" in status) {
        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);
      }
      if ("isPlaying" in status) {
        setIsPlaying(status.isPlaying);
      }
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(status.durationMillis || 0);
      }
    });
    try {
      await s.loadAsync({ uri }, {}, true);
    } catch (e) {
      console.log("[v0] load sound error:", e?.message);
      Alert.alert("Playback Error", "Unable to load audio.");
    } finally {
      setIsLoading(false);
      soundRef.current = s;
    }
  };

  const togglePlay = async () => {
    await ensureLoaded();
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const pct =
    duration > 0 ? Math.min(100, (position / Math.max(1, duration)) * 100) : 0;

  return (
    <View
      style={[
        styles.audioPlayerContainer,
        {
          backgroundColor: isMyMessage ? "transparent" : theme.input,
          borderColor: isMyMessage ? "rgba(255,255,255,0.35)" : theme.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={togglePlay}
        style={[
          styles.audioPlayButton,
          {
            backgroundColor: isMyMessage ? "rgba(0,0,0,0.15)" : theme.card,
            borderColor: isMyMessage ? "rgba(255,255,255,0.25)" : theme.border,
          },
        ]}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            size={14}
            color={isMyMessage ? "#fff" : theme.text}
          />
        ) : isPlaying ? (
          <Pause size={16} color={isMyMessage ? "#fff" : theme.text} />
        ) : (
          <Play size={16} color={isMyMessage ? "#fff" : theme.text} />
        )}
      </TouchableOpacity>
      <View style={styles.audioMeta}>
        <View
          style={[
            styles.audioProgressTrack,
            {
              backgroundColor: isMyMessage
                ? "rgba(255,255,255,0.25)"
                : theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.audioProgressFill,
              {
                width: `${pct}%`,
                backgroundColor: isMyMessage ? "#ffffff" : theme.accent,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.audioTimeLabel,
            {
              color: isMyMessage
                ? theme.buttonText || "#fff"
                : theme.secondaryText,
            },
          ]}
        >
          {formatMillis(position)} / {formatMillis(duration)}
        </Text>
      </View>
    </View>
  );
};

export const VoiceRecorderControls = ({
  isRecording,
  recordingDuration,
  onStop,
  onStopAndSend,
  onCancel,
}) => {
  const { theme } = useTheme();
  const formatMillis = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isRecording) return null;

  return (
    <View
      style={[
        styles.recordingIndicator,
        { backgroundColor: "transparent", borderColor: "transparent" },
      ]}
    >
      <ActivityIndicator size={16} color={theme.accent} />
      <Text style={[styles.recordingDuration, { color: theme.text }]}>
        {formatMillis(recordingDuration)}
      </Text>
      <TouchableOpacity
        onPress={onStop}
        accessibilityRole="button"
        accessibilityLabel="Stop recording"
      >
        <StopCircle size={32} color="#ef4444" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onStopAndSend}
        accessibilityRole="button"
        accessibilityLabel="Send voice message"
      >
        <Send size={28} color={theme.accent} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel recording"
      >
        <Text
          style={[styles.cancelRecordingText, { color: theme.secondaryText }]}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // reused from original
  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginRight: 12,
    height: 44,
    borderRadius: 22,
  },
  recordingDuration: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  cancelRecordingText: { fontSize: 14, fontWeight: "600", marginLeft: 16 },

  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: 260,
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 12,
  },
  audioMeta: { flex: 1, justifyContent: "center" },
  audioProgressTrack: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  audioProgressFill: { height: "100%", borderRadius: 3 },
  audioTimeLabel: { fontSize: 11, marginTop: 4 },
});

export default AudioMessagePlayer;

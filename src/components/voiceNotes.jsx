"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Audio } from "expo-av";
import { Pause, Play, StopCircle, Send } from "lucide-react-native";
import { useTheme } from "../store/themeContext";

export const AudioMessagePlayer = ({ uri, isMyMessage }) => {
  const { theme } = useTheme();
  const soundRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [barWidth, setBarWidth] = useState(1);

  const formatMillis = (millis) => {
    if (!millis) return "00:00";
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // Cleanup sound on unmount
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

  // Ensure sound is loaded once
  const ensureLoaded = async () => {
    if (soundRef.current) return;
    setIsLoading(true);
    const s = new Audio.Sound();

    s.setOnPlaybackStatusUpdate(async (status) => {
      if (!status) return;

      if ("positionMillis" in status && "durationMillis" in status) {
        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);
      }
      if ("isPlaying" in status) {
        setIsPlaying(status.isPlaying);
      }

      //  Reset when playback finishes
      if (status.didJustFinish) {
        try {
          await s.stopAsync();
          await s.setPositionAsync(0);
        } catch (e) {
          console.warn("Error resetting after finish:", e);
        }
        setIsPlaying(false);
        setPosition(0);
      }
    });

    try {
      await s.loadAsync({ uri }, {}, true);
      soundRef.current = s;
    } catch (e) {
      console.log("[AudioPlayer] load error:", e?.message);
      Alert.alert("Playback Error", "Unable to load audio.");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Play / Pause / Replay
  const togglePlay = async () => {
    await ensureLoaded();
    if (!soundRef.current) return;

    const status = await soundRef.current.getStatusAsync();

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      if (
        status.didJustFinish ||
        status.positionMillis >= status.durationMillis
      ) {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
      }
      await soundRef.current.playAsync();
    }
  };

  // Tap-to-seek progress bar
  const handleSeek = async (e) => {
    if (!soundRef.current || duration === 0) return;
    const { locationX } = e.nativeEvent;
    const pct = Math.max(0, Math.min(1, locationX / barWidth));
    const newPos = pct * duration;
    try {
      await soundRef.current.setPositionAsync(newPos);
      setPosition(newPos);
    } catch (err) {
      console.warn("Seek error:", err);
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
      {/* Play / Pause button */}
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

      {/* Progress bar + time display */}
      <View style={styles.audioMeta}>
        <TouchableWithoutFeedback onPress={handleSeek}>
          <View
            style={[
              styles.audioProgressTrack,
              {
                backgroundColor: isMyMessage
                  ? "rgba(255,255,255,0.25)"
                  : theme.border,
              },
            ]}
            ref={progressBarRef}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
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
        </TouchableWithoutFeedback>

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

// 🎙 Voice Recorder Controls
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
      <TouchableOpacity onPress={onStop}>
        <StopCircle size={32} color="#ef4444" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onStopAndSend}>
        <Send size={28} color={theme.accent} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel}>
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
  audioTimeLabel: { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
});

export default AudioMessagePlayer;

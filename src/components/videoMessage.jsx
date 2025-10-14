"use client";

import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Download } from "lucide-react-native";
import { useTheme } from "../store/themeContext";

export default function VideoMessage({
  item,
  isMyMessage,
  localInfo,
  onOpenLocal,
  onDownload,
}) {
  const { theme } = useTheme();
  const ref = useRef(null);
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      <View>
        <Video
          ref={ref}
          source={{ uri: item.fileUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          onLoadStart={() => setLoading(true)}
          onReadyForDisplay={() => setLoading(false)}
          onError={(e) => {
            console.log("[v0] video error:", e?.nativeEvent || e);
            setLoading(false);
          }}
        />
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator
              size="small"
              color={isMyMessage ? "#fff" : theme.text}
            />
          </View>
        )}

        {item.content ? (
          <Text
            style={[
              styles.caption,
              isMyMessage
                ? { color: theme.buttonText || "#FFFFFF" }
                : { color: theme.text },
            ]}
          >
            {item.content}
          </Text>
        ) : null}

        <View style={styles.inlineActions}>
          {localInfo?.exists ? (
            <TouchableOpacity
              style={[
                styles.inlineActionBtn,
                {
                  backgroundColor: isMyMessage
                    ? "rgba(255,255,255,0.2)"
                    : "#00000020",
                },
              ]}
              onPress={onOpenLocal}
            >
              <Text
                style={[
                  styles.inlineActionText,
                  { color: isMyMessage ? "#fff" : "#000" },
                ]}
              >
                Open
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.inlineActionBtn,
                {
                  backgroundColor: isMyMessage
                    ? "rgba(255,255,255,0.2)"
                    : "#00000020",
                },
              ]}
              onPress={onDownload}
            >
              <Download size={16} color={isMyMessage ? "#fff" : "#000"} />
              <Text
                style={[
                  styles.inlineActionText,
                  { color: isMyMessage ? "#fff" : "#000" },
                ]}
              >
                Download
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minWidth: 200, maxWidth: 280 },
  video: { width: 220, height: 220, borderRadius: 12, backgroundColor: "#000" },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: { marginTop: 8, fontSize: 16, lineHeight: 20 },
  inlineActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  inlineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  inlineActionText: { fontSize: 12, fontWeight: "600" },
});

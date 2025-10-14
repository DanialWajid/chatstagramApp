"use client";

import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Download, File as ImageIcon } from "lucide-react-native";
import { useTheme } from "../store/themeContext";

export default function FileMessage({
  item,
  isMyMessage,
  localInfo,
  onPreview,
  onDownload,
  onOpenLocal,
  getDisplayFileName,
  formatFileSize,
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.documentContainer}>
      <View style={styles.documentIcon}>
        <ImageIcon size={20} color={theme.accent} />
      </View>
      <View style={styles.documentInfo}>
        <Text
          style={[
            styles.documentName,
            isMyMessage
              ? { color: theme.buttonText || "#FFFFFF" }
              : { color: theme.text },
          ]}
          numberOfLines={1}
        >
          {getDisplayFileName(item)}
        </Text>
        <Text
          style={[
            styles.documentSize,
            isMyMessage
              ? { color: theme.buttonText || "#FFFFFF", opacity: 0.7 }
              : { color: theme.secondaryText },
          ]}
        >
          {formatFileSize(item.fileSize || 0)}
        </Text>
      </View>
      <View style={styles.docActions}>
        <TouchableOpacity onPress={onPreview} style={styles.docActionBtn}>
          <Text
            style={[
              styles.docActionText,
              { color: isMyMessage ? "#fff" : theme.text },
            ]}
          >
            Preview
          </Text>
        </TouchableOpacity>
        {localInfo?.exists ? (
          <TouchableOpacity onPress={onOpenLocal} style={styles.docActionBtn}>
            <Text
              style={[
                styles.docActionText,
                { color: isMyMessage ? "#fff" : theme.text },
              ]}
            >
              Open
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onDownload} style={styles.docActionBtn}>
            {localInfo?.isDownloading ? (
              <ActivityIndicator
                size={14}
                color={isMyMessage ? "#fff" : theme.text}
              />
            ) : (
              <Download size={20} color={isMyMessage ? "#fff" : theme.text} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  documentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    minWidth: 200,
    gap: 8,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentInfo: { flex: 1 },
  documentName: { fontSize: 14, fontWeight: "500" },
  documentSize: { fontSize: 12, marginTop: 2 },
  docActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 8,
  },
  docActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  docActionText: { fontSize: 12, fontWeight: "600" },
});

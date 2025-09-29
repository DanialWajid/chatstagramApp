import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { User, Edit, Trash2, Send } from "lucide-react-native";
import { format } from "date-fns";
import { useTheme } from "../store/themeContext";

const CommentSection = ({ postId, userId, onCommentCountChange }) => {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    fetchComments();

    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardOffset(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardOffset(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://192.168.0.109:8000/api/comment/${postId}`
      );
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();
      setComments(data.comments);
      onCommentCountChange(data.comments.length);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load comments");
    }
  };

  const handleSubmit = async () => {
    if (commentText.trim() === "") return;

    if (editingCommentId) {
      await handleEditComment();
    } else {
      await handleAddComment();
    }
  };

  const handleAddComment = async () => {
    try {
      const response = await fetch(
        `http://192.168.0.109:8000/api/comment/add-comment/${postId}/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: commentText }),
        }
      );

      if (!response.ok) throw new Error("Failed to add comment");

      setCommentText("");
      await fetchComments();
      onCommentCountChange(comments.length + 1);
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    }
  };

  const handleEditComment = async () => {
    try {
      const response = await fetch(
        `http://192.168.0.109:8000/api/comment/edit-comment/${editingCommentId}/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: commentText }),
        }
      );

      if (!response.ok) throw new Error("Failed to edit comment");

      setCommentText("");
      setEditingCommentId(null);
      await fetchComments();
    } catch (error) {
      console.error("Error editing comment:", error);
      Alert.alert("Error", "Failed to edit comment");
    }
  };

  const handleRemoveComment = async (commentId) => {
    try {
      Alert.alert(
        "Remove Comment",
        "Are you sure you want to remove this comment?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            onPress: async () => {
              const response = await fetch(
                `http://192.168.0.109:8000/api/comment/remove-comment/${commentId}/${userId}`,
                {
                  method: "GET",
                }
              );

              if (!response.ok) throw new Error("Failed to remove comment");

              await fetchComments();
              onCommentCountChange(comments.length - 1);
            },
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      console.error("Error removing comment:", error);
      Alert.alert("Error", "Failed to remove comment");
    }
  };

  const startEditing = async (commentId) => {
    try {
      const response = await fetch(
        `http://192.168.0.109:8000/api/comment/get-one/${commentId}`
      );
      if (!response.ok) throw new Error("Failed to fetch comment");

      const data = await response.json();
      setCommentText(data.comment.text);
      setEditingCommentId(commentId);
    } catch (error) {
      console.error("Error fetching comment for edit:", error);
      Alert.alert("Error", "Failed to edit comment");
    }
  };

  const cancelEditing = () => {
    setCommentText("");
    setEditingCommentId(null);
  };

  const renderCommentItem = ({ item }) => (
    <View style={[styles.commentItem, { backgroundColor: theme.card }]}>
      <View style={styles.commentHeader}>
        {item.user.profileImage ? (
          <Image
            source={{ uri: item.user.profileImage }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[styles.avatarFallback, { backgroundColor: theme.border }]}
          >
            <User size={20} color={theme.text} />
          </View>
        )}

        <View style={styles.commentContent}>
          <View style={styles.commentMeta}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.user.name}
            </Text>
            <Text style={[styles.timestamp, { color: theme.secondaryText }]}>
              {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}
            </Text>
          </View>

          <Text style={[styles.commentText, { color: theme.text }]}>
            {item.text}
          </Text>

          {item.user._id === userId && (
            <View style={styles.commentActions}>
              <TouchableOpacity
                onPress={() => startEditing(item._id)}
                style={styles.actionButton}
              >
                <Edit size={16} color="#60a5fa" />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleRemoveComment(item._id)}
                style={styles.actionButton}
              >
                <Trash2 size={16} color="#f87171" />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderCommentItem}
          keyExtractor={(item) => item._id}
          style={styles.commentsList}
          contentContainerStyle={[
            styles.commentsListContent,
            { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 100 : 16 },
          ]}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No comments yet. Be the first to comment!
            </Text>
          }
        />
      )}

      <View
        style={[
          styles.inputContainer,
          {
            bottom: keyboardOffset > 0 ? keyboardOffset : 0,
            borderTopColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
      >
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder={
            editingCommentId ? "Edit your comment..." : "Add a comment..."
          }
          placeholderTextColor={theme.secondaryText}
          style={[
            styles.input,
            {
              borderColor: theme.border,
              backgroundColor: theme.input,
              color: theme.inputText,
            },
          ]}
          multiline
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.sendButton}
            disabled={commentText.trim() === ""}
          >
            <Send
              size={20}
              color={
                commentText.trim() === "" ? theme.secondaryText : "#3b82f6"
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 350,
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    padding: 16,
  },
  commentItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  commentContent: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  userName: {
    fontWeight: "600",
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    marginTop: 4,
  },
  commentActions: {
    flexDirection: "row",
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  inputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlignVertical: "center",
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CommentSection;

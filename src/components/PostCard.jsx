import React, { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Edit,
  Trash2,
  User,
  Bookmark,
} from "lucide-react-native";
import { format } from "date-fns";
import { savePost, unsavePost } from "../services/savedPosts.services";
import { likePost, unlikePost } from "../services/likedPosts.services";
import axios from "axios";
import CommentSection from "./CommentSection";
import { useTheme } from "../store/themeContext";

const PostCard = ({ post, user }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(post.comments?.length || 0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const navigation = useNavigation();
  const { theme } = useTheme();

  useEffect(() => {
    if (user?._id) {
      setIsSaved(
        post.savedBy?.some(
          (savedId) => savedId.toString() === user._id.toString()
        ) || false
      );
      setIsLiked(post.likes?.includes(user._id) || false);
    }
  }, [user, post.savedBy, post.likes]);

  const toggleSavePost = async () => {
    try {
      if (isSaved) {
        await unsavePost(user._id, post._id);
        setIsSaved(false);
      } else {
        await savePost(user._id, post._id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      Alert.alert("Error", "Failed to save/unsave post");
    }
  };

  const toggleLikePost = async () => {
    try {
      if (isLiked) {
        await unlikePost(user._id, post._id);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await likePost(user._id, post._id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to like/unlike post");
    }
  };

  const handleDeletePost = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const response = await axios.delete(
                `https://catstagram-backend-production.up.railway.app/api/posts/${post._id}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.data.success) {
                Alert.alert("Success", "Post deleted successfully");
                // Add any state update or navigation here
                // navigation.goBack(); or update local state
              }
            } catch (error) {
              console.error(
                "Delete error:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete post"
              );
            }
          },
          style: "destructive",
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const formatCount = (count, singular) =>
    `${count} ${count === 1 ? singular : `${singular}s`}`;

  if (!post || !post.user) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate("Profile", { id: post.user._id })}
        >
          {post.user.profileImage ? (
            <Image
              source={{ uri: post.user.profileImage }}
              style={[styles.userImage, { borderColor: theme.accent }]}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
          ) : (
            <View
              style={[
                styles.userImageFallback,
                { backgroundColor: theme.input, borderColor: theme.accent },
              ]}
            >
              <User size={24} color={theme.secondaryText} />
            </View>
          )}
          <View>
            <Text style={[styles.userName, { color: theme.text }]}>
              {post.user.name || "User Name"}
            </Text>
            <Text style={[styles.timestamp, { color: theme.secondaryText }]}>
              {format(new Date(post.createdAt), "dd MMMM, yyyy, hh:mm a")}
            </Text>
          </View>
        </TouchableOpacity>

        {user?._id === post.user._id && (
          <View style={styles.dropdownContainer}>
            <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
              <MoreVertical size={20} color={theme.secondaryText} />
            </TouchableOpacity>

            {showDropdown && (
              <View
                style={[
                  styles.dropdown,
                  { backgroundColor: theme.card, shadowColor: theme.accent },
                ]}
              >
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    navigation.navigate("EditPost", { id: post._id });
                  }}
                >
                  <Edit size={16} color={theme.accent} />
                  <Text style={[styles.dropdownText, { color: theme.text }]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowDropdown(false);
                    handleDeletePost();
                  }}
                >
                  <Trash2 size={16} color={theme.error} />
                  <Text style={[styles.deleteText, { color: theme.error }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.imageContainer}>
        {imageLoading && (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        )}
        <Image
          source={{ uri: post.image || "https://via.placeholder.com/600x600" }}
          style={styles.postImage}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
      </View>

      <Text style={[styles.caption, { color: theme.text }]}>
        {post.caption || "Caption"}
      </Text>

      <View style={styles.actions}>
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={toggleLikePost}
            style={styles.actionButton}
          >
            <Heart
              size={20}
              color={isLiked ? theme.error : theme.secondaryText}
              fill={isLiked ? theme.error : "transparent"}
            />
          </TouchableOpacity>
          <Text style={[styles.actionText, { color: theme.secondaryText }]}>
            {formatCount(likeCount, "Like")}
          </Text>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={() => setIsCommentModalOpen(true)}
            style={styles.actionButton}
          >
            <MessageCircle size={20} color={theme.secondaryText} />
          </TouchableOpacity>
          <Text style={[styles.actionText, { color: theme.secondaryText }]}>
            {formatCount(commentCount, "Comment")}
          </Text>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={toggleSavePost}
            style={styles.actionButton}
          >
            <Bookmark
              filled={isSaved}
              color={isSaved ? theme.success : theme.secondaryText}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.actionText,
              { color: isSaved ? theme.success : theme.secondaryText },
            ]}
          >
            {isSaved ? "Saved" : "Save"}
          </Text>
        </View>
      </View>

      <Modal
        visible={isCommentModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCommentModalOpen(false)}
      >
        <View style={styles.commentModalContainer}>
          <View
            style={[
              styles.commentModalContent,
              { backgroundColor: theme.card },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsCommentModalOpen(false)}
            >
              <Text style={[styles.closeButtonText, { color: theme.text }]}>
                Close
              </Text>
            </TouchableOpacity>
            <CommentSection
              postId={post._id}
              userId={user._id}
              onCommentCountChange={setCommentCount}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PostCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 16,
    marginBottom: 16,
    transform: [{ scale: 1 }],
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
  },
  userImageFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  userName: {
    fontWeight: "600",
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 16,
  },
  dropdown: {
    width: 120,
    borderRadius: 8,
    overflow: "hidden",
    position: "absolute",
    top: 60,
    right: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  dropdownText: {
    marginLeft: 8,
    fontSize: 14,
  },
  deleteText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "bold",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  caption: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  commentModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentModalContent: {
    height: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dropdownContainer: {
    position: "relative",
    zIndex: 1,
  },
});

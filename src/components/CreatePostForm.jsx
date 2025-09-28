import axios from "axios";
import React, { useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Camera, Check } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../store/themeContext";

const CreatePostForm = ({ navigation }) => {
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need camera roll permissions to upload images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8, // Good balance between quality and file size
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];

        // Check file size (limit to 10MB)
        try {
          const fileInfo = await FileSystem.getInfoAsync(selectedImage.uri);
          if (fileInfo.size > 10 * 1024 * 1024) {
            Alert.alert(
              "File Too Large",
              "Please select an image smaller than 10MB."
            );
            return;
          }
        } catch (fileError) {
          console.log("Could not check file size:", fileError);
        }

        setImage(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!caption.trim()) {
      Alert.alert("Missing Information", "Please provide a caption.");
      return;
    }

    if (!image) {
      Alert.alert("Missing Image", "Please select an image for your post.");
      return;
    }

    setLoading(true);

    try {
      // Create FormData properly
      const formData = new FormData();
      formData.append("caption", caption.trim());

      // Fix the image field name and MIME type
      const filename = image.split("/").pop() || `post_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const fileExtension = match ? match[1].toLowerCase() : "jpg";

      // Correct MIME type
      const mimeType = `image/${
        fileExtension === "jpg" ? "jpeg" : fileExtension
      }`;

      formData.append("profileImage", {
        // Changed from "profileImage" to "image"
        uri: Platform.OS === "ios" ? image.replace("file://", "") : image,
        name: filename,
        type: mimeType, // Fixed MIME type
      });

      console.log("Uploading post with image:", filename, "Type:", mimeType);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please log in again."
        );
        return;
      }

      const response = await axios.post(
        "https://catstagram-backend-production.up.railway.app/api/posts", // Make sure this matches your backend endpoint
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          timeout: 60000, // 60 second timeout for large uploads
        }
      );

      console.log("Post creation response:", response.data);

      if (
        response.data.success ||
        response.status === 200 ||
        response.status === 201
      ) {
        Alert.alert("Success", "Post created successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Clear form
              setCaption("");
              setImage(null);
              // Navigate back
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);

      let errorMessage = "An error occurred while creating the post.";

      if (error.response) {
        // Server responded with error
        console.error("Server error:", error.response.data);
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error
        console.error("Network error:", error.request);
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.code === "ECONNABORTED") {
        // Timeout error
        errorMessage = "Upload timeout. Please try again with a smaller image.";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          Create New Post
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Caption</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.input,
                borderColor: theme.border,
                color: theme.inputText,
              },
            ]}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.secondaryText}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500} // Add character limit
          />
          <Text style={[styles.characterCount, { color: theme.secondaryText }]}>
            {caption.length}/500
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Image</Text>

          <TouchableOpacity
            style={[
              styles.imagePickerButton,
              {
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
            onPress={pickImage}
            disabled={loading}
          >
            <Camera size={24} color={theme.text} />
            <Text style={[styles.imagePickerText, { color: theme.text }]}>
              {image ? "Change Image" : "Select Image"}
            </Text>
          </TouchableOpacity>

          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: image }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <View
                style={[
                  styles.imageSelectedIndicator,
                  { backgroundColor: theme.success || "#4CAF50" },
                ]}
              >
                <Check size={16} color="#ffffff" />
              </View>
              <TouchableOpacity
                style={[
                  styles.removeImageButton,
                  { backgroundColor: theme.error || "#F44336" },
                ]}
                onPress={() => setImage(null)}
              >
                <Text style={styles.removeImageText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Animated.View style={[animatedStyle, styles.buttonContainer]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.button },
              (!caption.trim() || !image || loading) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!caption.trim() || !image || loading}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.buttonText} />
                <Text style={[styles.loadingText, { color: theme.buttonText }]}>
                  Creating Post...
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.submitButtonText, { color: theme.buttonText }]}
              >
                Create Post
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  formContainer: {
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  imagePickerText: {
    marginLeft: 8,
    fontSize: 16,
  },
  imagePreviewContainer: {
    marginTop: 16,
    alignItems: "center",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 300,
    borderRadius: 8,
  },
  imageSelectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonContainer: {
    marginTop: 8,
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreatePostForm;

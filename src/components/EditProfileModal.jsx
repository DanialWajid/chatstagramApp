import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { updateProfile } from "../services/profile.services";
import { useAuthStore } from "../store/authStore";
import { Upload, User, Lock, Unlock } from "lucide-react-native";
import { useTheme } from "../store/themeContext";

const EditProfileModal = ({ profile, onClose, onUpdate }) => {
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate || false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(profile.profileImage || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuthStore(); // Make sure to get setUser from the store
  const { theme } = useTheme();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

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
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        // Check file size
        const fileInfo = await fetch(result.assets[0].uri).then((res) => {
          return {
            size: res.headers.get("Content-Length"),
            type: res.headers.get("Content-Type"),
          };
        });

        if (fileInfo.size && parseInt(fileInfo.size) > 5 * 1024 * 1024) {
          setErrorMessage("File size should be less than 5MB");
          return;
        }

        // Process the image
        const manipResult = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { format: SaveFormat.JPEG, compress: 0.8 }
        );

        setProfileImage(manipResult.uri);
        setImagePreview(manipResult.uri);
        setErrorMessage("");
      } catch (error) {
        console.error("Error processing image:", error);
        setErrorMessage("Error processing image. Please try again.");
      }
    }
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", bio);
      formData.append("isPrivate", isPrivate.toString());

      if (profileImage) {
        const filename = profileImage.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";

        formData.append("profileImage", {
          uri:
            Platform.OS === "ios"
              ? profileImage.replace("file://", "")
              : profileImage,
          name: filename,
          type,
        });
      }

      const updatedProfile = await updateProfile(formData, user._id);

      // Update the auth store with the new profile data
      if (updatedProfile) {
        // Update the user in the auth store with the new profile image
        setUser({
          ...user,
          profileImage: updatedProfile.profileImage || user.profileImage,
          name: updatedProfile.name || user.name,
          bio: updatedProfile.bio || user.bio,
          isPrivate:
            updatedProfile.isPrivate !== undefined
              ? updatedProfile.isPrivate
              : user.isPrivate,
        });
      }

      // Call onUpdate if provided
      if (onUpdate) {
        onUpdate(updatedProfile);
      }

      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      const msg = error.response?.data?.error || "Failed to update profile";

      // If it's the username‑exists case, show a dedicated alert
      if (msg === "Username already exists") {
        Alert.alert(
          "Username Taken",
          "That username is already in use. Please choose another one."
        );
      } else {
        Alert.alert("Error", msg);
      }

      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyPress = (value) => {
    setIsPrivate(value);
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <TouchableOpacity
          style={[
            styles.modalContainer,
            { backgroundColor: theme.card, shadowColor: theme.accent },
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Edit Profile
            </Text>

            {errorMessage ? (
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: theme.error },
                ]}
              >
                <Text style={[styles.errorText, { color: theme.buttonText }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Profile Image */}
            <View style={styles.imageContainer}>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.imagePickerContainer}
                activeOpacity={0.7}
              >
                {imagePreview ? (
                  <Image
                    source={{ uri: imagePreview }}
                    style={[styles.profileImage, { borderColor: theme.accent }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.profileImageFallback,
                      {
                        borderColor: theme.accent,
                        backgroundColor: theme.input,
                      },
                    ]}
                  >
                    <User size={40} color={theme.secondaryText} />
                  </View>
                )}
                <View
                  style={[
                    styles.uploadIconContainer,
                    { backgroundColor: theme.button, borderColor: theme.card },
                  ]}
                >
                  <Upload size={20} color={theme.buttonText} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.inputText,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.secondaryText}
              />
            </View>

            {/* Bio Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.inputText,
                  },
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor={theme.secondaryText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Profile Privacy */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.text }]}>
                Profile Privacy
              </Text>
              <View style={styles.privacyOptions}>
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    {
                      backgroundColor: !isPrivate ? theme.input : theme.card,
                      borderColor: theme.border,
                    },
                    !isPrivate && { borderWidth: 2, borderColor: theme.accent },
                  ]}
                  onPress={() => handlePrivacyPress(false)}
                  activeOpacity={0.7}
                >
                  <Unlock size={20} color={theme.secondaryText} />
                  <Text
                    style={[styles.privacyOptionText, { color: theme.text }]}
                  >
                    Public
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    {
                      backgroundColor: isPrivate ? theme.input : theme.card,
                      borderColor: theme.border,
                    },
                    isPrivate && { borderWidth: 2, borderColor: theme.accent },
                  ]}
                  onPress={() => handlePrivacyPress(true)}
                  activeOpacity={0.7}
                >
                  <Lock size={20} color={theme.secondaryText} />
                  <Text
                    style={[styles.privacyOptionText, { color: theme.text }]}
                  >
                    Private
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: theme.button },
                  loading && styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.buttonText} />
                ) : (
                  <Text
                    style={[styles.buttonText, { color: theme.buttonText }]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: theme.border },
                ]}
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContent: {
    padding: 8,
  },
  // header: {
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   alignItems: "center",
  //   marginBottom: 24,
  // },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#dc2626",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  errorText: {
    color: "#ffffff",
    textAlign: "center",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  imagePickerContainer: {
    position: "relative",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#3b82f6",
  },
  profileImageFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#374151",
  },
  uploadIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#3b82f6",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1f2937",
  },
  // closeButton: {
  //   padding: 4,
  // },
  // profileImageContainer: {
  //   alignItems: "center",
  //   marginBottom: 24,
  // },
  // imageWrapper: {
  //   marginBottom: 12,
  // },
  // profileImage: {
  //   width: 100,
  //   height: 100,
  //   borderRadius: 50,
  // },
  // imagePlaceholder: {
  //   width: 100,
  //   height: 100,
  //   borderRadius: 50,
  //   alignItems: "center",
  //   justifyContent: "center",
  // },
  // changeImageButton: {
  //   paddingHorizontal: 16,
  //   paddingVertical: 8,
  //   borderRadius: 16,
  // },
  // changeImageText: {
  //   fontSize: 14,
  //   fontWeight: "500",
  // },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  bioInput: {
    minHeight: 80,
  },
  privacyOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 3,
  },
  selectedOption: {},
  privacyOptionText: {
    marginLeft: 6,
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  button: {
    flex: 1,
    height: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    marginRight: 4,
  },
  saveButton: {
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default EditProfileModal;

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Navbar from "../../components/Navbar";
import SideNav from "../../components/SideNav";
import { getSavedPosts } from "../../services/savedPosts.services";
import PostCard from "../../components/PostCard";
import { Search } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../store/themeContext";

const SavedPosts = () => {
  const [savedPosts, setSavedPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { theme } = useTheme();

  const fetchSavedPosts = async () => {
    try {
      const posts = await getSavedPosts(user._id);
      setSavedPosts(posts);
    } catch (error) {
      console.error("Error fetching saved posts", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
  }, [user._id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSavedPosts();
  };

  const handleUnsavePost = (postId) => {
    setSavedPosts((prevPosts) =>
      prevPosts.filter((post) => post._id !== postId)
    );
  };

  const handleSearchChange = (text) => {
    setSearchTerm(text.toLowerCase());
  };

  const filteredPosts = savedPosts.filter(
    (post) =>
      post.user.name?.toLowerCase().includes(searchTerm) ||
      post.caption?.toLowerCase().includes(searchTerm)
  );

  const renderItem = ({ item }) => (
    <PostCard
      post={item}
      user={user}
      onUnsave={handleUnsavePost}
      viewMode="list"
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Navbar />
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Search
          size={20}
          color={theme.secondaryText}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search posts by title or caption..."
          placeholderTextColor={theme.secondaryText}
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : filteredPosts.length > 0 ? (
        <FlatList
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          numColumns={1}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.accent]}
              tintColor={theme.accent}
              progressBackgroundColor={theme.card}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            No Saved Posts Found.
          </Text>
        </View>
      )}
      <View style={styles.sideNavWrapper}>
        <SideNav />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 70,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  sideNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default SavedPosts;

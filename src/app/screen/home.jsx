"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronUp } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import SideNav from "../../components/SideNav";
import Navbar from "../../components/Navbar";
import PostCard from "../../components/PostCard";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../store/themeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [initialScrollOffset, setInitialScrollOffset] = useState(0);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { user } = useAuthStore();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const currentScrollPosition = useRef(0);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef("up");
  const bottomNavOpacity = useRef(new Animated.Value(1)).current;
  const scrollPositionKey = `home_scroll_${user._id}`;
  const postsDataKey = `home_posts_${user._id}`;
  const API_URL = "https://catstagram-backend-production.up.railway.app/api";
  const LIMIT = 5;

  // Save scroll position
  const saveScrollPosition = useCallback(
    async (position) => {
      try {
        await AsyncStorage.setItem(scrollPositionKey, position.toString());
        console.log("✅ Scroll position saved:", position);
      } catch (error) {
        console.error("❌ Error saving scroll position:", error);
      }
    },
    [scrollPositionKey]
  );

  // Load scroll position
  const loadScrollPosition = useCallback(async () => {
    try {
      const savedPosition = await AsyncStorage.getItem(scrollPositionKey);
      if (savedPosition !== null) {
        const position = Number.parseFloat(savedPosition);
        console.log("📍 Loaded scroll position:", position);
        return position;
      }
    } catch (error) {
      console.error("❌ Error loading scroll position:", error);
    }
    return 0;
  }, [scrollPositionKey]);

  // Save posts data
  const savePostsData = useCallback(
    async (postsData, pageNum, hasMoreData) => {
      try {
        const dataToSave = {
          posts: postsData,
          page: pageNum,
          hasMore: hasMoreData,
          timestamp: Date.now(),
          searchQuery: searchQuery,
        };
        await AsyncStorage.setItem(postsDataKey, JSON.stringify(dataToSave));
        console.log("💾 Posts data cached");
      } catch (error) {
        console.error("❌ Error saving posts data:", error);
      }
    },
    [postsDataKey, searchQuery]
  );

  // Load posts data
  const loadPostsData = useCallback(async () => {
    try {
      const savedData = await AsyncStorage.getItem(postsDataKey);
      if (savedData !== null) {
        const parsedData = JSON.parse(savedData);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (
          now - parsedData.timestamp < fiveMinutes &&
          parsedData.searchQuery === searchQuery
        ) {
          console.log("📦 Loading cached posts data");
          return parsedData;
        }
      }
    } catch (error) {
      console.error("❌ Error loading posts data:", error);
    }
    return null;
  }, [postsDataKey, searchQuery]);

  // Animate bottom navigation visibility
  const animateBottomNav = useCallback(
    (show) => {
      Animated.timing(bottomNavOpacity, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [bottomNavOpacity]
  );

  // Initialize data and scroll position (KEEPING EXACTLY THE SAME)
  useEffect(() => {
    const initializeData = async () => {
      console.log("🚀 Initializing Home screen data");

      // Load scroll position first
      const savedScrollPosition = await loadScrollPosition();
      console.log("📍 Setting initial scroll offset:", savedScrollPosition);
      setInitialScrollOffset(savedScrollPosition);

      // Load cached data
      const cachedData = await loadPostsData();

      if (cachedData && cachedData.posts.length > 0) {
        console.log("📦 Using cached data");
        setPosts(cachedData.posts);
        setPage(cachedData.page);
        setHasMore(cachedData.hasMore);
        setHasInitiallyLoaded(true);

        // Set flag to restore scroll after data is set
        if (savedScrollPosition > 0) {
          setShouldRestoreScroll(true);
        }
      } else {
        console.log("🌐 Fetching fresh data");
        await fetchInitialPosts(false);
      }
    };

    initializeData();
  }, []);

  // Restore scroll position after posts are loaded (KEEPING EXACTLY THE SAME)
  useEffect(() => {
    if (shouldRestoreScroll && posts.length > 0 && flatListRef.current) {
      console.log("🔄 Restoring scroll to:", initialScrollOffset);

      // Use multiple attempts with increasing delays
      const restoreAttempts = [100, 300, 500, 1000, 2000];

      restoreAttempts.forEach((delay, index) => {
        setTimeout(() => {
          if (flatListRef.current && shouldRestoreScroll) {
            try {
              flatListRef.current.scrollToOffset({
                offset: initialScrollOffset,
                animated: false,
              });

              if (index === restoreAttempts.length - 1) {
                // Last attempt, update current position and show button if needed
                currentScrollPosition.current = initialScrollOffset;
                setShowScrollToTop(initialScrollOffset > 200);
                setShouldRestoreScroll(false);
                console.log("✅ Final scroll restoration attempt completed");
              }
            } catch (error) {
              console.log(
                `❌ Scroll restoration attempt ${index + 1} failed:`,
                error
              );
            }
          }
        }, delay);
      });
    }
  }, [shouldRestoreScroll, posts.length, initialScrollOffset]);

  // Save position before navigation (KEEPING EXACTLY THE SAME)
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      console.log(
        "🚪 Navigation beforeRemove - saving scroll position:",
        currentScrollPosition.current
      );
      saveScrollPosition(currentScrollPosition.current);
    });
    return unsubscribe;
  }, [navigation, saveScrollPosition]);

  // Focus effect for when returning to screen (KEEPING EXACTLY THE SAME)
  useFocusEffect(
    useCallback(() => {
      console.log("👁️ Home screen focused");

      // If we have posts and a saved position, restore it
      if (posts.length > 0 && hasInitiallyLoaded) {
        loadScrollPosition().then((savedPosition) => {
          if (savedPosition > 0 && flatListRef.current) {
            console.log("🔄 Focus restoration to position:", savedPosition);

            setTimeout(() => {
              if (flatListRef.current) {
                try {
                  flatListRef.current.scrollToOffset({
                    offset: savedPosition,
                    animated: false,
                  });
                  currentScrollPosition.current = savedPosition;
                  setShowScrollToTop(savedPosition > 200);
                } catch (error) {
                  console.log("❌ Focus restoration failed:", error);
                }
              }
            }, 200);
          }
        });
      }

      return () => {
        console.log(
          "👁️ Home screen unfocused - saving scroll position:",
          currentScrollPosition.current
        );
        saveScrollPosition(currentScrollPosition.current);
      };
    }, [
      posts.length,
      hasInitiallyLoaded,
      loadScrollPosition,
      saveScrollPosition,
    ])
  );

  // Fetch initial posts
  const fetchInitialPosts = async (shouldResetPosition = false) => {
    try {
      setLoading(true);
      console.log("🌐 Fetching posts from API");

      const timestamp = new Date().getTime();
      const response = await axios.get(
        `${API_URL}/posts/${user._id}?page=1&limit=${LIMIT}&search=${searchQuery}&_t=${timestamp}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      const newPosts = response.data.data;
      const newPage = 2;
      const newHasMore = newPosts.length >= LIMIT;

      setPosts(newPosts);
      setPage(newPage);
      setHasMore(newHasMore);
      setHasInitiallyLoaded(true);

      await savePostsData(newPosts, newPage, newHasMore);

      if (shouldResetPosition) {
        currentScrollPosition.current = 0;
        setInitialScrollOffset(0);
        setShouldRestoreScroll(false);
        await saveScrollPosition(0);
        setShowScrollToTop(false);
      }
    } catch (error) {
      console.error("❌ Error fetching initial posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearchLoading(false);
    }
  };

  // Enhanced fetch more posts with loading state
  const fetchMorePosts = async () => {
    if (!hasMore || loading || loadingMore) return;

    try {
      setLoadingMore(true);
      console.log("📄 Fetching more posts, page:", page);

      const response = await axios.get(
        `${API_URL}/posts/${user._id}?page=${page}&limit=${LIMIT}&search=${searchQuery}`
      );

      const newPosts = response.data.data;
      const newHasMore = newPosts.length >= LIMIT;

      setPosts((prevPosts) => {
        const existingIds = new Set(prevPosts.map((post) => post._id));
        const uniqueNewPosts = newPosts.filter(
          (post) => !existingIds.has(post._id)
        );

        const updatedPosts = [...prevPosts, ...uniqueNewPosts];
        savePostsData(updatedPosts, page + 1, newHasMore);
        return updatedPosts;
      });

      setPage((prevPage) => prevPage + 1);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("❌ Error fetching more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    console.log("🔍 Search initiated");
    setSearchLoading(true);
    setShouldRestoreScroll(false);
    fetchInitialPosts(true);
  };

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh initiated");
    setRefreshing(true);
    setShouldRestoreScroll(false);
    await fetchInitialPosts(true);
  };

  const handleScrollToTop = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ animated: true, offset: 0 });
      setShowScrollToTop(false);
      currentScrollPosition.current = 0;
      saveScrollPosition(0);
      // Show bottom nav when scrolling to top
      animateBottomNav(true);
    }
  };

  // Enhanced scroll handler with bottom navigation animation
  const handleScroll = useCallback(
    (event) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      currentScrollPosition.current = scrollY;

      // Determine scroll direction
      const currentDirection = scrollY > lastScrollY.current ? "down" : "up";

      // Only animate if direction changed and we've scrolled a meaningful amount
      if (
        currentDirection !== scrollDirection.current &&
        Math.abs(scrollY - lastScrollY.current) > 1
      ) {
        scrollDirection.current = currentDirection;

        // Hide bottom nav when scrolling down, show when scrolling up
        if (scrollY > 10) {
          animateBottomNav(currentDirection === "up");
        } else {
          animateBottomNav(true); // Always show bottom nav at the top
        }
      }

      lastScrollY.current = scrollY;
      setShowScrollToTop(scrollY > 200);

      // Clear any existing timeout for scroll stop detection
      clearTimeout(handleScroll.scrollStopTimeoutId);

      // Set timeout to detect when scrolling stops
      handleScroll.scrollStopTimeoutId = setTimeout(() => {
        // Show navbar when scrolling stops
        animateBottomNav(true);
      }, 10); // Show navbar 150ms after scrolling stops

      // Debounced save
      clearTimeout(handleScroll.timeoutId);
      handleScroll.timeoutId = setTimeout(() => {
        saveScrollPosition(scrollY);
      }, 300);
    },
    [saveScrollPosition, animateBottomNav]
  );

  // Immediate save on scroll end and show navbar
  const handleScrollEnd = useCallback(
    (event) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      currentScrollPosition.current = scrollY;
      console.log("💾 Immediate save on scroll end:", scrollY);
      saveScrollPosition(scrollY);

      // Immediately show navbar when scroll ends
      animateBottomNav(true);
    },
    [saveScrollPosition, animateBottomNav]
  );

  // Enhanced PostCard with proper sizing
  const renderPostItem = useCallback(
    ({ item }) => (
      <View style={styles.postCardContainer}>
        <PostCard post={item} user={user} />
      </View>
    ),
    [user]
  );

  const getUniqueKey = useCallback((item, index) => {
    return item._id ? `post-${item._id}` : `post-${index}-${Date.now()}`;
  }, []);

  // Loading more indicator
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.loadingMoreText, { color: theme.secondaryText }]}>
          Loading more posts...
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Navbar - Always visible */}
      <View style={styles.navbarContainer}>
        <Navbar />
      </View>

      {/* Search Bar */}
      <View
        style={[styles.searchBarContainer, { backgroundColor: theme.card }]}
      >
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.input,
              color: theme.inputText,
              borderColor: theme.border,
            },
          ]}
          placeholder="Search posts..."
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.accent }]}
          onPress={handleSearch}
        >
          {searchLoading ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <Text
              style={[styles.searchButtonText, { color: theme.buttonText }]}
            >
              Search
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* FlatList with proper spacing */}
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={getUniqueKey}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 120 }]} // Extra padding for bottom nav
        onEndReached={fetchMorePosts}
        onEndReachedThreshold={0.3} // Trigger earlier for smoother loading
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading &&
          !searchLoading && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {hasInitiallyLoaded
                  ? "No posts found. Be the first to create a post!"
                  : "Loading your timeline..."}
              </Text>
            </View>
          )
        }
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        showsVerticalScrollIndicator={false} // Hide scroll indicator for cleaner look
      />

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <TouchableOpacity
          style={[
            styles.scrollToTopButton,
            {
              backgroundColor: theme.accent,
              shadowColor: theme.accent,
            },
          ]}
          onPress={handleScrollToTop}
          activeOpacity={0.8}
        >
          <ChevronUp width={24} height={24} color={theme.buttonText} />
        </TouchableOpacity>
      )}

      {/* Animated Bottom Navigation */}
      <Animated.View
        style={[styles.sideNavWrapper, { opacity: bottomNavOpacity }]}
      >
        <SideNav />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingTop: 10, // Reduced from 100 to 10 to minimize gap
  },
  postCardContainer: {
    marginVertical: 6,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  searchBarContainer: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    marginTop: 100, // Keep this to clear the topbar
    marginBottom: 5, // Small margin to reduce gap with first post
    zIndex: 999,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchButton: {
    marginLeft: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    fontWeight: "bold",
  },
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  sideNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  scrollToTopButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
});

export default Home;

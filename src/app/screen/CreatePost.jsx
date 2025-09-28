import React from 'react';
import { View, StyleSheet } from 'react-native';
import CreatePostForm from '../../components/CreatePostForm';
import SideNav from "../../components/SideNav";
import Navbar from "../../components/Navbar";
import { useTheme } from "../../store/themeContext";

const CreatePost = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Navbar />
      <CreatePostForm navigation={navigation} />
      <SideNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 70,
  },
});

export default CreatePost;
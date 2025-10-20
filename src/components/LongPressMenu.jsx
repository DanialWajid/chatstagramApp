import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useTheme } from "../store/themeContext";
import { AlertTriangle } from "lucide-react-native";

const LongPressMenu = ({
  visible,
  onClose,
  onReportUser,
  chatData,
  position,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = {
    overlay: {
      ...styles.overlay,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    menu: {
      ...styles.menu,
      backgroundColor: theme.card,
      borderColor: theme.border,
      position: 'absolute',
      top: position.y,
      left: position.x,
    },
    menuItem: {
      ...styles.menuItem,
      borderBottomColor: theme.border,
    },
    menuText: {
      ...styles.menuText,
      color: theme.text,
    },
    dangerText: {
      ...styles.menuText,
      color: "#ef4444",
    },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={dynamicStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={dynamicStyles.menu}>
              <TouchableOpacity
                style={[dynamicStyles.menuItem, styles.lastMenuItem]}
                onPress={() => {
                  onClose();
                  onReportUser();
                }}
              >
                <AlertTriangle size={20} color="#ef4444" />
                <Text style={dynamicStyles.dangerText}>Report User</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  menu: {
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
});

export default LongPressMenu;
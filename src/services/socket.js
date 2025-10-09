import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentUser = null;
  }

  connect(userId, userName) {
    if (!this.socket) {
      console.log("Connecting to socket server...");
      this.currentUser = { _id: userId, name: userName };

      this.socket = io("http://192.168.0.105:8000", {
        transports: ["websocket"],
        timeout: 60000,
        forceNew: true,
      });

      this.socket.on("connect", () => {
        console.log("Connected to server with socket ID:", this.socket.id);
        this.isConnected = true;
        this.socket.emit("setup", { _id: userId, name: userName });
      });

      this.socket.on("connected", () => {
        console.log("User setup complete for:", userName);
      });

      this.socket.on("disconnect", () => {
        console.log("Disconnected from server");
        this.isConnected = false;
      });

      this.socket.on("connect_error", (error) => {
        console.log("Connection error:", error);
        this.isConnected = false;
      });
    }
  }

  disconnect() {
    if (this.socket) {
      console.log("Disconnecting socket...");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUser = null;
    }
  }

  joinChat(chatId) {
    if (this.socket && this.isConnected) {
      console.log("Joining chat:", chatId);
      this.socket.emit("join chat", chatId);
    } else {
      console.log("Socket not connected, cannot join chat");
    }
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      console.log("Sending message via socket:", message);
      this.socket.emit("new message", message);
    } else {
      console.log("Socket not connected, cannot send message");
    }
  }

  onMessageReceived(callback) {
    if (this.socket) {
      this.socket.on("message recieved", (message) => {
        console.log("Message received via socket:", message);
        callback(message);
      });
    }
  }

  offMessageReceived() {
    if (this.socket) {
      this.socket.off("message recieved");
    }
  }

  startTyping(chatId) {
    if (this.socket && this.isConnected && this.currentUser) {
      console.log("Start typing in chat:", chatId);
      this.socket.emit("typing", {
        chatId,
        user: this.currentUser,
      });
    }
  }

  stopTyping(chatId) {
    if (this.socket && this.isConnected && this.currentUser) {
      console.log("Stop typing in chat:", chatId);
      this.socket.emit("stop typing", {
        chatId,
        user: this.currentUser,
      });
    }
  }

  onTyping(callback) {
    if (this.socket) {
      this.socket.on("typing", (data) => {
        console.log("Typing event received:", data);
        callback(data);
      });
    }
  }

  onStopTyping(callback) {
    if (this.socket) {
      this.socket.on("stop typing", (data) => {
        console.log("Stop typing event received:", data);
        callback(data);
      });
    }
  }

  offTyping() {
    if (this.socket) {
      this.socket.off("typing");
      this.socket.off("stop typing");
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default new SocketService();

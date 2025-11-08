import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentUser = null;
    this.hasJoinedChat = false; // helps avoid duplicate join events
  }

  // ---------------------- CONNECTION ----------------------
  connect(userId, userName) {
    if (!this.socket) {
      console.log("Connecting to socket server...");
      this.currentUser = { _id: userId, name: userName };

      this.socket = io("http://192.168.100.15:8000", {
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
        this.hasJoinedChat = false;
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
      this.hasJoinedChat = false;
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  // ---------------------- CHAT ----------------------
  joinChat(chatId) {
    if (this.socket && this.isConnected) {
      console.log("Joining chat:", chatId);
      this.socket.emit("join chat", chatId);
      this.hasJoinedChat = true;
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
      this.socket.on("message received", (message) => {
        console.log("Message received via socket:", message);
        callback(message);
      });
    }
  }

  offMessageReceived() {
    if (this.socket) {
      this.socket.off("message received");
    }
  }

  // ---------------------- TYPING ----------------------
  startTyping(chatId) {
    if (this.socket && this.isConnected && this.currentUser) {
      console.log("Start typing in chat:", chatId);
      this.socket.emit("typing", { chatId, user: this.currentUser });
    }
  }

  stopTyping(chatId) {
    if (this.socket && this.isConnected && this.currentUser) {
      console.log("Stop typing in chat:", chatId);
      this.socket.emit("stop typing", { chatId, user: this.currentUser });
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

  // ---------------------- VOICE CALLS ----------------------
  initiateVoiceCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Initiating voice call:", callData);
      this.socket.emit("call:initiate", callData);
    }
  }

  acceptVoiceCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Accepting voice call:", callData);
      this.socket.emit("call:accept", callData);
    }
  }

  rejectVoiceCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Rejecting voice call:", callData);
      this.socket.emit("call:reject", callData);
    }
  }

  endVoiceCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Ending voice call:", callData);
      this.socket.emit("call:end", callData);
    }
  }

  // ---------------------- VIDEO CALLS ----------------------
  initiateVideoCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Initiating video call:", callData);
      this.socket.emit("videocall:initiate", callData);
    }
  }

  acceptVideoCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Accepting video call:", callData);
      this.socket.emit("videocall:accept", callData);
    }
  }

  rejectVideoCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Rejecting video call:", callData);
      this.socket.emit("videocall:reject", callData);
    }
  }

  endVideoCall(callData) {
    if (this.socket && this.isConnected) {
      console.log("[v0] Ending video call:", callData);
      this.socket.emit("videocall:end", callData);
    }
  }

  // ---------------------- LISTENERS ----------------------
  onVoiceCallEvents(callbacks) {
    if (this.socket) {
      this.socket.on("call:initiate", callbacks.onInitiate);
      this.socket.on("call:accept", callbacks.onAccept);
      this.socket.on("call:reject", callbacks.onReject);
      this.socket.on("call:end", callbacks.onEnd);
      this.socket.on("call:timeout", callbacks.onTimeout);
    }
  }

  onVideoCallEvents(callbacks) {
    if (this.socket) {
      this.socket.on("videocall:initiate", callbacks.onInitiate);
      this.socket.on("videocall:accept", callbacks.onAccept);
      this.socket.on("videocall:reject", callbacks.onReject);
      this.socket.on("videocall:end", callbacks.onEnd);
      this.socket.on("videocall:timeout", callbacks.onTimeout);
    }
  }

  offCallEvents() {
    if (this.socket) {
      // Voice
      this.socket.off("call:initiate");
      this.socket.off("call:accept");
      this.socket.off("call:reject");
      this.socket.off("call:end");
      this.socket.off("call:timeout");

      // Video
      this.socket.off("videocall:initiate");
      this.socket.off("videocall:accept");
      this.socket.off("videocall:reject");
      this.socket.off("videocall:end");
      this.socket.off("videocall:timeout");
    }
  }
}

export default new SocketService();
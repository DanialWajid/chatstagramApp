import "react-native-get-random-values"; // polyfill must be first
import CryptoJS from "crypto-js";

// Helper to derive a key from chatId
export const getKey = (chatId) => CryptoJS.SHA256(chatId).toString();

// Encrypt message
export const encryptMessage = (message, chatId) => {
  const key = CryptoJS.enc.Hex.parse(getKey(chatId)); // Use Hex encoding
  const iv = CryptoJS.lib.WordArray.random(16); // secure random IV
  const ciphertext = CryptoJS.AES.encrypt(message, key, { iv }).toString();
  // Store IV with ciphertext for decryption
  return iv.toString() + ":" + ciphertext;
};

// Decrypt message
export const decryptMessage = (ciphertextWithIv, chatId) => {
  const key = CryptoJS.enc.Hex.parse(getKey(chatId));
  const [ivHex, ciphertext] = ciphertextWithIv.split(":");
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv });
  return bytes.toString(CryptoJS.enc.Utf8);
};

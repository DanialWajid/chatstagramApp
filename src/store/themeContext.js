import { createContext, useContext, useState, useMemo } from "react"

const ThemeContext = createContext()

export const themes = {
  dark: {
    mode: "dark",
    background: "#111827",
    card: "#1f2937",
    text: "#f9fafb",
    secondaryText: "#9ca3af",
    accent: "#7c3aed",
    border: "#374151",
    input: "#374151",
    inputText: "#f9fafb",
    button: "#2563eb",
    buttonText: "#fff",
    error: "#ef4444",
    success: "#10b981",
    navbar: "#1a202c",
    gradient: ["#4c1d95", "#7e22ce", "#6b21a8"],
    // Add more as needed
  },
  light: {
    mode: "light",
    background: "#ffffff",
    card: "#f3f4f6",
    text: "#111827",
    secondaryText: "#6b7280",
    accent: "#7c3aed",
    border: "#e5e7eb",
    input: "#f1f5f9",
    inputText: "#111827",
    button: "#2563eb",
    buttonText: "#fff",
    error: "#ef4444",
    success: "#10b981",
    navbar: "#1a202c",
    gradient: ["#f0f9ff", "#e0e7ff", "#c7d2fe"],
    // Add more as needed
  },
}

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState("dark") // Default to dark as requested

  const toggleTheme = () => setThemeName((prev) => (prev === "dark" ? "light" : "dark"))

  const value = useMemo(
    () => ({
      theme: themes[themeName],
      themeName,
      toggleTheme,
    }),
    [themeName],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

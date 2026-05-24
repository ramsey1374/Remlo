import { darkTheme } from "@rainbow-me/rainbowkit";

// Remlo brand palette
const ACCENT = "#6366f1"; // indigo
const ACCENT_HOVER = "#7c83ff";
const FOREGROUND = "#ffffff";
const BACKDROP_BLUR = "8px";

export const remloDarkTheme = darkTheme({
  accentColor: ACCENT,
  accentColorForeground: FOREGROUND,
  borderRadius: "large",
  overlayBlur: "large",
  fontStack: "system",
  // Additional subtle overrides supported by RainbowKit
  // Note: darkTheme returns theme object compatible with RainbowKitProvider
});

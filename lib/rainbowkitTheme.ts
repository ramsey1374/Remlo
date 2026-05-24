import { darkTheme } from "@rainbow-me/rainbowkit";

// Remlo brand palette
const ACCENT = "#6366f1"; // indigo
const ACCENT_HOVER = "#7c83ff";
const ACCENT_LIGHT = "#818cf8"; // lighter indigo
const FOREGROUND = "#ffffff";
const BACKGROUND = "#0d0d14";
const SURFACE = "rgba(255,255,255,0.02)";
const SURFACE_SECONDARY = "rgba(255,255,255,0.06)";

// Premium fintech theme inspired by Stripe, Coinbase, Linear
export const remloDarkTheme = darkTheme({
  accentColor: ACCENT,
  accentColorForeground: FOREGROUND,
  borderRadius: "large",
  overlayBlur: "large",
  fontStack: "system",
});

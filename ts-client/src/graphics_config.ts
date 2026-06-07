export const GRID_CONFIG = {
  size: 40,
  majorStep: 200,
  minorColor: "rgba(15, 23, 42, 0.15)",
  majorColor: "rgba(30, 41, 59, 0.35)",
  minorWidth: 1,
  majorWidth: 1.5,
};

export const CARD_LAYOUT = {
  overlayBg: "rgba(5, 5, 8, 0.85)",
  titleColor: "#00f0ff",
  cardWidth: 200,
  cardHeight: 280,
  gap: 30,
  startXOffset: -330,
  startYOffset: -140,
  bgHovered: "rgba(30, 41, 59, 0.65)",
  bgDefault: "rgba(15, 23, 42, 0.45)",
  borderDefault: "rgba(255, 255, 255, 0.15)",
  textMuted: "#94a3b8",
  interactiveColor: "#00f0ff",
  nonInteractiveColor: "#64748b",
};

export const UPGRADE_PANEL_LAYOUT = {
  startY: 120,
  slotWidth: 44,
  slotHeight: 44,
  gap: 6,
  leftX: 22,
  width: 214,
  bg: "rgba(5, 5, 8, 0.65)",
  border: "rgba(255, 255, 255, 0.12)",
  titleColor: "#64748b",
  slotBgHovered: "rgba(30, 41, 59, 0.75)",
  slotBgDefault: "rgba(10, 15, 26, 0.75)",
  tooltipBg: "rgba(5, 5, 8, 0.95)",
  textWhite: "#ffffff",
  textMuted: "#94a3b8",
};

export const INVENTORY_HUD_LAYOUT = {
  startY: 120,
  slotWidth: 44,
  slotHeight: 44,
  gap: 6,
  rightXOffset: -210,
  bg: "rgba(5, 5, 8, 0.65)",
  border: "rgba(255, 255, 255, 0.12)",
  titleColor: "#64748b",
  slotBgHovered: "rgba(30, 41, 59, 0.75)",
  slotBgDefault: "rgba(10, 15, 26, 0.75)",
  tooltipBg: "rgba(5, 5, 8, 0.95)",
  textWhite: "#ffffff",
  textMuted: "#94a3b8",
  deleteTextColors: "#ef4444",
};

export const ITEM_RARITY_BORDER_COLORS: Record<string, string> = {
  "Common": "#10b981",
  "Rare": "#3b82f6",
  "Unique": "#f97316",
  "Legendary": "#f97316",
};

export const HUD_LAYOUT = {
  barWidth: 350,
  barHeight: 16,
  bottomYOffset: -30,
  bg: "rgba(5, 5, 8, 0.85)",
  border: "rgba(255, 255, 255, 0.12)",
  hpGradColors: ["#00f0ff", "#6366f1"],
  xpGradColors: ["#fbbf24", "#f59e0b"],
  textWhite: "#ffffff",
  textMuted: "#94a3b8",
  textMuted2: "#64748b",
};

export const MENU_LAYOUT = {
  bgColor: "#050508",
  titleColor: "#00f0ff",
  subtitleColor: "#64748b",
  inputBg: "rgba(5, 5, 8, 0.75)",
  inputBorder: "rgba(255, 255, 255, 0.12)",
  inputTextActive: "#ffffff",
  inputTextPlaceholder: "#64748b",
  btnBgHovered: "rgba(0, 240, 255, 0.15)",
  btnBgDefault: "rgba(0, 240, 255, 0.05)",
  btnBorderHovered: "#00f0ff",
  btnBorderDefault: "rgba(0, 240, 255, 0.4)",
  btnTextHovered: "#00f0ff",
  btnTextDefault: "#ffffff",
  footerColor: "#475569",
};

export const GAMEOVER_LAYOUT = {
  bgColor: "rgba(5, 5, 8, 0.95)",
  titleColor: "#ff2a5f",
  subtitleColor: "#64748b",
  metricsColor: "#ffffff",
  metricsMuted: "#94a3b8",
  btnBgHovered: "rgba(0, 240, 255, 0.15)",
  btnBgDefault: "rgba(0, 240, 255, 0.05)",
  btnBorderHovered: "#00f0ff",
  btnBorderDefault: "rgba(0, 240, 255, 0.4)",
  btnTextHovered: "#00f0ff",
  btnTextDefault: "#ffffff",
  footerColor: "#475569",
};

export const PAUSE_LAYOUT = {
  bgColor: "rgba(5, 5, 8, 0.65)",
  titleColor: "#00f0ff",
  subtitleColor: "#94a3b8",
};

export const RARITY_COLORS: Record<number, { fill: string; stroke: string }> = {
  0: { fill: "#990022", stroke: "#ff2a5f" },
  1: { fill: "#1e3a8a", stroke: "#3b82f6" },
  2: { fill: "#78350f", stroke: "#fbbf24" },
  3: { fill: "#581c87", stroke: "#d946ef" },
};

import { state, renderEntities } from "./state";
import { drawAndUpdateParticles } from "./particles";
import localizationData from "./items_localization.json";
import { TextRenderer } from "./text";

export const shapeCache = new Map<string, HTMLCanvasElement>();

interface UpgradeCardDetail {
  title: string;
  color: string;
  desc: string;
  rarity: string;
  abbrev: string;
}

const UPGRADE_DETAILS: Record<number, UpgradeCardDetail> = {
  1: { title: "ОПТИМИЗАЦИЯ СКОРОСТИ", color: "#3b82f6", desc: "Увеличение скорости на +10%", rarity: "Common", abbrev: "Move\nSpd" },
  2: { title: "СОПРОЦЕССОР", color: "#fbbf24", desc: "Увеличение мощности и +5% вампиризм", rarity: "Rare", abbrev: "Vamp" },
  3: { title: "СТАБИЛИЗАТОР ЯДРА", color: "#22c55e", desc: "Увеличение макс здоровья на +25", rarity: "Common", abbrev: "Max\nHP" },
  4: { title: "РЕГЕНЕРАЦИЯ", color: "#10b981", desc: "Увеличение регенерации здоровья", rarity: "Common", abbrev: "HP\nReg" },
  5: { title: "ДРОНЫ: ВЫЧИСЛЕНИЯ", color: "#ef4444", desc: "Увеличение урона дронов на +15%", rarity: "Common", abbrev: "Drn\nDmg" },
  6: { title: "ДРОНЫ: ЧАСТОТА", color: "#f97316", desc: "Увеличение скорости дронов на +15%", rarity: "Common", abbrev: "Drn\nSpd" },
  7: { title: "ДРОНЫ: СТАБИЛЬНОСТЬ", color: "#06b6d4", desc: "Увеличение макс. ХП дронов на +15%", rarity: "Common", abbrev: "Drn\nHP" },
  8: { title: "ДРОНЫ: ПРОБИТИЕ", color: "#8b5cf6", desc: "Дроны пробивают на +1 цель больше", rarity: "Common", abbrev: "Drn\nPrc" },
  9: { title: "ДРОНЫ: РЕГЕНЕРАЦИЯ", color: "#a3e635", desc: "Увеличение регенерации дронов на +15%", rarity: "Common", abbrev: "Drn\nReg" },
  10: { title: "МИКРО-ЩИТЫ", color: "#00f0ff", desc: "Запуск защитного орбитального щита (макс 4)", rarity: "Rare", abbrev: "Shld" },
  11: { title: "ЯДРО НЕКРОЗА", color: "#d946ef", desc: "Все ваши снаряды взрывают убитые вирусы", rarity: "Unique", abbrev: "Necr\nCore" },
  12: { title: "УСИЛИТЕЛЬ УРОНА", color: "#ef4444", desc: "Увеличение урона снарядов на +5%", rarity: "Common", abbrev: "Dmg" },
  13: { title: "РАЗГОН ОРУЖИЯ", color: "#f97316", desc: "Снижение задержки выстрела на 1%", rarity: "Common", abbrev: "Fire\nRate" },
  14: { title: "ВЕРОЯТНОСТЬ КРИТА", color: "#f59e0b", desc: "Шанс крит. урона +5%", rarity: "Common", abbrev: "Crit\nChn" },
  15: { title: "СИЛА КРИТА", color: "#eab308", desc: "Множитель крит. урона +5%", rarity: "Common", abbrev: "Crit\nDmg" },
  16: { title: "КИНЕТИЧЕСКИЙ БАРЬЕР", color: "#84cc16", desc: "Снижение получаемого урона на 5%", rarity: "Common", abbrev: "Def" },
  17: { title: "МНОЖИТЕЛЬ СНАРЯДОВ", color: "#22c55e", desc: "+1 доп. снаряд", rarity: "Rare", abbrev: "Proj" },
  18: { title: "БРОНЕБОЙНОСТЬ", color: "#10b981", desc: "+1 пробитие снарядов", rarity: "Rare", abbrev: "Prc" },
  19: { title: "УГОЛ АТАКИ", color: "#14b8a6", desc: "Увеличение разброса на +5%", rarity: "Common", abbrev: "Sprd" },
  20: { title: "ОБУЧЕНИЕ НЕЙРОСЕТИ", color: "#0ea5e9", desc: "Получаемый опыт +1%", rarity: "Common", abbrev: "XP\nMod" },
  21: { title: "КВАНТОВЫЙ АНАЛИЗАТОР", color: "#6366f1", desc: "Шанс дропа предметов +5%", rarity: "Common", abbrev: "Loot\nQty" }
};

const UPGRADE_STATE_KEYS: Record<number, keyof typeof state> = {
  1: "statSpeed",
  2: "statVampirism",
  3: "statMaxHP",
  4: "statRegen",
  5: "statMinionDmg",
  6: "statMinionSpeed",
  7: "statMinionHP",
  8: "statMinionPierce",
  9: "statMinionRegen",
  10: "statOrbitShield",
  11: "statFlagUnlock",
  12: "statDamageMod",
  13: "statCooldownMod",
  14: "statCritChance",
  15: "statCritDamage",
  16: "statCritDefiance",
  17: "statAddProjectiles",
  18: "statPierceCount",
  19: "statSpread",
  20: "statExpMod",
  21: "statLootQuantity",
};

const GRID_CONFIG = {
  size: 40,
  majorStep: 200,
  minorColor: "rgba(15, 23, 42, 0.15)",
  majorColor: "rgba(30, 41, 59, 0.35)",
  minorWidth: 1,
  majorWidth: 1.5,
};

const CARD_LAYOUT = {
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

const UPGRADE_PANEL_LAYOUT = {
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

const INVENTORY_HUD_LAYOUT = {
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

const ITEM_RARITY_BORDER_COLORS: Record<string, string> = {
  "Common": "#10b981",
  "Rare": "#3b82f6",
  "Unique": "#f97316",
  "Legendary": "#f97316",
};

const HUD_LAYOUT = {
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

const MENU_LAYOUT = {
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

const GAMEOVER_LAYOUT = {
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

const PAUSE_LAYOUT = {
  bgColor: "rgba(5, 5, 8, 0.65)",
  titleColor: "#00f0ff",
  subtitleColor: "#94a3b8",
};

const RARITY_COLORS: Record<number, { fill: string; stroke: string }> = {
  0: { fill: "#990022", stroke: "#ff2a5f" },
  1: { fill: "#1e3a8a", stroke: "#3b82f6" },
  2: { fill: "#78350f", stroke: "#fbbf24" },
  3: { fill: "#581c87", stroke: "#d946ef" },
};

function drawRegularPolygonPath(ctx: CanvasRenderingContext2D, radius: number, sides: number, startAngle: number) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides + startAngle;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
}

export function getShapeCanvas(key: string, radius: number, drawFn: (ctx: CanvasRenderingContext2D, r: number) => void): HTMLCanvasElement {
  if (shapeCache.has(key)) return shapeCache.get(key)!;
  const c = document.createElement("canvas");
  const padding = 6;
  c.width = (radius + padding) * 2;
  c.height = (radius + padding) * 2;
  const x = c.getContext("2d");
  if (x) {
    x.translate(radius + padding, radius + padding);
    drawFn(x, radius);
  }
  shapeCache.set(key, c);
  return c;
}

export function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

export function drawGrid(ctx: CanvasRenderingContext2D, cx: number, cy: number, canvasWidth: number, canvasHeight: number) {
  const startX = Math.floor((cx - canvasWidth / 2) / GRID_CONFIG.size) * GRID_CONFIG.size;
  const endX = cx + canvasWidth / 2;
  const startY = Math.floor((cy - canvasHeight / 2) / GRID_CONFIG.size) * GRID_CONFIG.size;
  const endY = cy + canvasHeight / 2;

  ctx.strokeStyle = GRID_CONFIG.minorColor;
  ctx.lineWidth = GRID_CONFIG.minorWidth;
  for (let x = startX; x < endX; x += GRID_CONFIG.size) {
    if (x % GRID_CONFIG.majorStep === 0) continue;
    ctx.beginPath();
    ctx.moveTo(x - cx + canvasWidth / 2, 0);
    ctx.lineTo(x - cx + canvasWidth / 2, canvasHeight);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += GRID_CONFIG.size) {
    if (y % GRID_CONFIG.majorStep === 0) continue;
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvasHeight / 2);
    ctx.lineTo(canvasWidth, y - cy + canvasHeight / 2);
    ctx.stroke();
  }

  ctx.strokeStyle = GRID_CONFIG.majorColor;
  ctx.lineWidth = GRID_CONFIG.majorWidth;
  for (let x = Math.floor(startX / GRID_CONFIG.majorStep) * GRID_CONFIG.majorStep; x < endX; x += GRID_CONFIG.majorStep) {
    ctx.beginPath();
    ctx.moveTo(x - cx + canvasWidth / 2, 0);
    ctx.lineTo(x - cx + canvasWidth / 2, canvasHeight);
    ctx.stroke();
  }
  for (let y = Math.floor(startY / GRID_CONFIG.majorStep) * GRID_CONFIG.majorStep; y < endY; y += GRID_CONFIG.majorStep) {
    ctx.beginPath();
    ctx.moveTo(0, y - cy + canvasHeight / 2);
    ctx.lineTo(canvasWidth, y - cy + canvasHeight / 2);
    ctx.stroke();
  }
}

export function drawUpgradeCardsOverlay(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  ctx.fillStyle = CARD_LAYOUT.overlayBg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  TextRenderer.draw(ctx, "ДОСТУПНО ОБНОВЛЕНИЕ ПО", cx, cy - 200 * uiScale, CARD_LAYOUT.titleColor, { fontSize: 24, align: "center", bold: true }, canvasWidth, canvasHeight);

  const cardW = CARD_LAYOUT.cardWidth * uiScale;
  const cardH = CARD_LAYOUT.cardHeight * uiScale;
  const gap = CARD_LAYOUT.gap * uiScale;
  const startX = cx + CARD_LAYOUT.startXOffset * uiScale;
  const startY = cy + CARD_LAYOUT.startYOffset * uiScale;

  const cards = [state.card1, state.card2, state.card3];

  for (let i = 0; i < 3; i++) {
    const cardId = cards[i];
    const details = UPGRADE_DETAILS[cardId] || { title: "UNKNOWN", color: "#64748b", desc: "Unknown mod", rarity: "Common", abbrev: "???" };
    const x = startX + i * (cardW + gap);
    const y = startY;

    const hovered = state.mouseX >= x && state.mouseX <= x + cardW && state.mouseY >= y && state.mouseY <= y + cardH;

    ctx.fillStyle = hovered ? CARD_LAYOUT.bgHovered : CARD_LAYOUT.bgDefault;
    ctx.strokeStyle = hovered ? details.color : CARD_LAYOUT.borderDefault;
    ctx.lineWidth = hovered ? 3 : 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    TextRenderer.draw(ctx, details.rarity.toUpperCase(), x + cardW / 2, y + 30 * uiScale, details.color, { fontSize: 10, align: "center", bold: true }, canvasWidth, canvasHeight);

    const titleWords = details.title.split(" ");
    let titleY = y + 70 * uiScale;
    for (const w of titleWords) {
      TextRenderer.draw(ctx, w, x + cardW / 2, titleY, "#ffffff", { fontSize: 12, align: "center", bold: true }, canvasWidth, canvasHeight);
      titleY += 16 * uiScale;
    }

    const descWords = details.desc.split(" ");
    let descLine = "";
    let descY = y + 170 * uiScale;
    ctx.font = `${Math.max(6, 10 * uiScale)}px 'JetBrains Mono', monospace`;
    for (let n = 0; n < descWords.length; n++) {
      const testLine = descLine + descWords[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardW - 24 * uiScale && n > 0) {
        TextRenderer.draw(ctx, descLine, x + cardW / 2, descY, CARD_LAYOUT.textMuted, { fontSize: 10, align: "center" }, canvasWidth, canvasHeight);
        descLine = descWords[n] + " ";
        descY += 14 * uiScale;
      } else {
        descLine = testLine;
      }
    }
    TextRenderer.draw(ctx, descLine, x + cardW / 2, descY, CARD_LAYOUT.textMuted, { fontSize: 10, align: "center" }, canvasWidth, canvasHeight);

    TextRenderer.draw(ctx, `[НАЖМИТЕ ${i + 1}]`, x + cardW / 2, y + cardH - 25 * uiScale, hovered ? CARD_LAYOUT.interactiveColor : CARD_LAYOUT.nonInteractiveColor, { fontSize: 11, align: "center", bold: true }, canvasWidth, canvasHeight);
  }
}

export function drawUpgradePanel(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  interface UpgradeDetail {
    id: string;
    name: string;
    count: number;
    color: string;
    abbrev: string;
    desc: string;
  }

  const activeUpgrades: UpgradeDetail[] = [];

  for (const [idStr, stateKey] of Object.entries(UPGRADE_STATE_KEYS)) {
    const id = Number(idStr);
    const details = UPGRADE_DETAILS[id];
    if (details) {
      const count = state[stateKey] as number;
      activeUpgrades.push({
        id: String(id),
        name: details.title,
        count: count,
        color: details.color,
        abbrev: details.abbrev,
        desc: details.desc
      });
    }
  }

  if (activeUpgrades.length === 0) {
    return;
  }

  const startY = UPGRADE_PANEL_LAYOUT.startY * uiScale;
  const slotW = UPGRADE_PANEL_LAYOUT.slotWidth * uiScale;
  const slotH = UPGRADE_PANEL_LAYOUT.slotHeight * uiScale;
  const gap = UPGRADE_PANEL_LAYOUT.gap * uiScale;
  const leftX = UPGRADE_PANEL_LAYOUT.leftX * uiScale;

  const rows = Math.max(1, Math.ceil(activeUpgrades.length / 4));
  const height = rows * (slotH + gap) + 50 * uiScale;

  ctx.fillStyle = UPGRADE_PANEL_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(leftX - 10 * uiScale, startY - 30 * uiScale, UPGRADE_PANEL_LAYOUT.width * uiScale, height, 10 * uiScale);
  ctx.fill();
  ctx.strokeStyle = UPGRADE_PANEL_LAYOUT.border;
  ctx.lineWidth = 1.5 * uiScale;
  ctx.stroke();

  TextRenderer.draw(ctx, "УСИЛЕНИЯ ПЕРСОНАЖА", leftX + 97 * uiScale, startY - 10 * uiScale, UPGRADE_PANEL_LAYOUT.titleColor, { fontSize: 10, align: "center", bold: true }, canvasWidth, canvasHeight);

  for (let i = 0; i < activeUpgrades.length; i++) {
    const upg = activeUpgrades[i];
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = leftX + c * (slotW + gap);
    const y = startY + r * (slotH + gap);

    const hovered = state.mouseX >= x && state.mouseX <= x + slotW && state.mouseY >= y && state.mouseY <= y + slotH;

    ctx.fillStyle = hovered ? UPGRADE_PANEL_LAYOUT.slotBgHovered : UPGRADE_PANEL_LAYOUT.slotBgDefault;
    ctx.strokeStyle = upg.color;
    ctx.lineWidth = hovered ? 2.5 * uiScale : 1.5 * uiScale;

    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 6 * uiScale);
    ctx.fill();
    ctx.stroke();

    const lines = upg.abbrev.split("\n");
    TextRenderer.draw(ctx, lines[0], x + slotW / 2, y + 18 * uiScale, upg.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
    if (lines[1]) {
      TextRenderer.draw(ctx, lines[1], x + slotW / 2, y + 28 * uiScale, upg.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
    }

    TextRenderer.draw(ctx, `v${upg.count}`, x + slotW - 4 * uiScale, y + slotH - 4 * uiScale, upg.count > 0 ? UPGRADE_PANEL_LAYOUT.textWhite : UPGRADE_PANEL_LAYOUT.textMuted, { fontSize: 11, align: "right", bold: true }, canvasWidth, canvasHeight);

    if (hovered) {
      ctx.save();
      ctx.fillStyle = UPGRADE_PANEL_LAYOUT.tooltipBg;
      ctx.strokeStyle = upg.color;
      ctx.lineWidth = 1.5 * uiScale;
      const popW = 180 * uiScale;
      const popH = 64 * uiScale;
      const popX = leftX + UPGRADE_PANEL_LAYOUT.width * uiScale + 10 * uiScale;
      const popY = y - 5 * uiScale;
      ctx.beginPath();
      ctx.roundRect(popX, popY, popW, popH, 8 * uiScale);
      ctx.fill();
      ctx.stroke();

      TextRenderer.draw(ctx, upg.name, popX + 10 * uiScale, popY + 18 * uiScale, UPGRADE_PANEL_LAYOUT.textWhite, { fontSize: 11, align: "left", bold: true }, canvasWidth, canvasHeight);

      const descLines = upg.desc.split("\n");
      TextRenderer.draw(ctx, descLines[0], popX + 10 * uiScale, popY + 34 * uiScale, UPGRADE_PANEL_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
      if (descLines[1]) {
        TextRenderer.draw(ctx, descLines[1], popX + 10 * uiScale, popY + 46 * uiScale, UPGRADE_PANEL_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
      }
      ctx.restore();
    }
  }
}

export function drawInventoryHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  const startY = INVENTORY_HUD_LAYOUT.startY * uiScale;
  const slotW = INVENTORY_HUD_LAYOUT.slotWidth * uiScale;
  const slotH = INVENTORY_HUD_LAYOUT.slotHeight * uiScale;
  const gap = INVENTORY_HUD_LAYOUT.gap * uiScale;
  const rightX = canvasWidth + INVENTORY_HUD_LAYOUT.rightXOffset * uiScale;

  const itemDetails: Record<string, { name: string; color: string; desc: string; abbrev: string; rarity: string }> = localizationData.items;

  const itemCounts = new Map<number, number>();
  for (let i = 0; i < 100; i++) {
    const itemID = state.inventory[2 * i];
    const count = state.inventory[2 * i + 1];
    if (itemID && itemID !== 0 && count > 0) {
      itemCounts.set(itemID, count);
    }
  }

  const uniqueItems = Array.from(itemCounts.keys());
  const rows = Math.max(1, Math.ceil(uniqueItems.length / 4));
  const height = rows * (slotH + gap) + 50 * uiScale;

  ctx.fillStyle = INVENTORY_HUD_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(rightX - 10 * uiScale, startY - 30 * uiScale, 214 * uiScale, height, 10 * uiScale);
  ctx.fill();
  ctx.strokeStyle = INVENTORY_HUD_LAYOUT.border;
  ctx.lineWidth = 1.5 * uiScale;
  ctx.stroke();

  TextRenderer.draw(ctx, localizationData.ui.module_title, rightX + 97 * uiScale, startY - 10 * uiScale, INVENTORY_HUD_LAYOUT.titleColor, { fontSize: 10, align: "center", bold: true }, canvasWidth, canvasHeight);

  for (let i = 0; i < uniqueItems.length; i++) {
    const itemID = uniqueItems[i];
    const count = itemCounts.get(itemID) || 1;
    const c = i % 4;
    const r = Math.floor(i / 4);
    const x = rightX + c * (slotW + gap);
    const y = startY + r * (slotH + gap);

    const hovered = state.mouseX >= x && state.mouseX <= x + slotW && state.mouseY >= y && state.mouseY <= y + slotH;

    let borderColor = "rgba(255, 255, 255, 0.15)";
    const details = itemDetails[itemID];
    if (details) {
      borderColor = ITEM_RARITY_BORDER_COLORS[details.rarity] || borderColor;
    }

    ctx.fillStyle = hovered ? INVENTORY_HUD_LAYOUT.slotBgHovered : INVENTORY_HUD_LAYOUT.slotBgDefault;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = hovered ? 2.5 * uiScale : 1.5 * uiScale;

    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 6 * uiScale);
    ctx.fill();
    ctx.stroke();

    if (details) {
      const lines = details.abbrev.split("\n");
      TextRenderer.draw(ctx, lines[0], x + slotW / 2, y + 18 * uiScale, details.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
      if (lines[1]) {
        TextRenderer.draw(ctx, lines[1], x + slotW / 2, y + 28 * uiScale, details.color, { fontSize: 8, align: "center", bold: true }, canvasWidth, canvasHeight);
      }

      if (count > 1) {
        TextRenderer.draw(ctx, `x${count}`, x + slotW - 4 * uiScale, y + slotH - 4 * uiScale, INVENTORY_HUD_LAYOUT.textWhite, { fontSize: 11, align: "right", bold: true }, canvasWidth, canvasHeight);
      }

      if (hovered) {
        ctx.save();
        ctx.fillStyle = INVENTORY_HUD_LAYOUT.tooltipBg;
        ctx.strokeStyle = details.color;
        ctx.lineWidth = 1.5 * uiScale;
        const popW = 180 * uiScale;
        const popH = 80 * uiScale;
        const popX = rightX - popW - 15 * uiScale;
        const popY = y - 5 * uiScale;
        ctx.beginPath();
        ctx.roundRect(popX, popY, popW, popH, 8 * uiScale);
        ctx.fill();
        ctx.stroke();

        TextRenderer.draw(ctx, details.name, popX + 10 * uiScale, popY + 18 * uiScale, INVENTORY_HUD_LAYOUT.textWhite, { fontSize: 11, align: "left", bold: true }, canvasWidth, canvasHeight);

        const descLines = details.desc.split("\n");
        TextRenderer.draw(ctx, descLines[0], popX + 10 * uiScale, popY + 34 * uiScale, INVENTORY_HUD_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
        if (descLines[1]) {
          TextRenderer.draw(ctx, descLines[1], popX + 10 * uiScale, popY + 46 * uiScale, INVENTORY_HUD_LAYOUT.textMuted, { fontSize: 9, align: "left" }, canvasWidth, canvasHeight);
        }

        TextRenderer.draw(ctx, "[НАЖМИТЕ X ДЛЯ УДАЛЕНИЯ]", popX + 10 * uiScale, popY + popH - 12 * uiScale, INVENTORY_HUD_LAYOUT.deleteTextColors, { fontSize: 9, align: "left", bold: true }, canvasWidth, canvasHeight);
        ctx.restore();
      }
    }
  }
}

export function drawHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  const barWidth = HUD_LAYOUT.barWidth * uiScale;
  const barHeight = HUD_LAYOUT.barHeight * uiScale;
  const centerX = canvasWidth / 2;
  const bottomY = canvasHeight + HUD_LAYOUT.bottomYOffset * uiScale;

  ctx.fillStyle = HUD_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY - 24 * uiScale, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = HUD_LAYOUT.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const hpPct = Math.min(1.0, state.playerHealth / Math.max(1, state.playerMaxHealth));
  if (hpPct > 0) {
    const hpGrad = ctx.createLinearGradient(centerX - barWidth / 2, 0, centerX + barWidth / 2, 0);
    hpGrad.addColorStop(0, HUD_LAYOUT.hpGradColors[0]);
    hpGrad.addColorStop(1, HUD_LAYOUT.hpGradColors[1]);
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, bottomY - 24 * uiScale, barWidth * hpPct, barHeight, 6);
    ctx.fill();
  }

  ctx.fillStyle = HUD_LAYOUT.bg;
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, bottomY, barWidth, barHeight, 6);
  ctx.fill();
  ctx.strokeStyle = HUD_LAYOUT.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const xpPct = Math.min(1.0, state.currentXP / Math.max(1, state.maxXP));
  if (xpPct > 0) {
    const xpGrad = ctx.createLinearGradient(centerX - barWidth / 2, 0, centerX + barWidth / 2, 0);
    xpGrad.addColorStop(0, HUD_LAYOUT.xpGradColors[0]);
    xpGrad.addColorStop(1, HUD_LAYOUT.xpGradColors[1]);
    ctx.fillStyle = xpGrad;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, bottomY, barWidth * xpPct, barHeight, 6);
    ctx.fill();
  }

  TextRenderer.draw(ctx, `ПРОШИВКА ЯДРА: v${state.currentLevel}`, centerX, bottomY - 28 * uiScale, HUD_LAYOUT.textWhite, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, `ПАКЕТОВ ДАННЫХ: ${state.currentScore}`, 20 * uiScale, canvasHeight - 25 * uiScale, HUD_LAYOUT.textMuted, { fontSize: 16, align: "left", bold: true }, canvasWidth, canvasHeight);

  let activeMinions = 0;
  for (const ent of renderEntities.values()) {
    if (ent.type === 4) activeMinions++;
  }
  TextRenderer.draw(ctx, `АКТИВНЫЕ ДРОНЫ: ${activeMinions}`, canvasWidth - 20 * uiScale, 35 * uiScale, HUD_LAYOUT.textMuted, { fontSize: 16, align: "right", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, `${localizationData.ui.sector_prefix}${state.waveNumber}`, centerX, bottomY - 54 * uiScale, HUD_LAYOUT.textMuted2, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  drawInventoryHUD(ctx, canvasWidth, canvasHeight, uiScale);
}

export function drawMenuShape(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  drawRegularPolygonPath(ctx, radius, sides, -Math.PI / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function renderMenu(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const uiScale = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  ctx.fillStyle = MENU_LAYOUT.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  state.menuAnimAngle += 0.008;
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  for (let i = 0; i < 12; i++) {
    const a = state.menuAnimAngle + (i / 12) * Math.PI * 2;
    const r = 280 + Math.sin(state.menuAnimAngle * 2 + i) * 40;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r;
    const sides = [3, 4, 5, 6][i % 4];
    const colors = ["rgba(255, 42, 95, 0.12)", "rgba(168, 85, 247, 0.12)", "rgba(0, 240, 255, 0.12)", "rgba(250, 204, 21, 0.12)"];
    drawMenuShape(ctx, sx, sy, 20 + (i % 3) * 8, sides, state.menuAnimAngle * (i % 2 === 0 ? 1 : -1), colors[i % 4]);
  }

  ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 250, cy - 260);
  ctx.lineTo(cx + 250, cy - 260);
  ctx.stroke();

  TextRenderer.draw(ctx, "NECRO-GEOMETRY", cx, cy - 220 * uiScale, MENU_LAYOUT.titleColor, { fontSize: 44, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, "[СИНХРОНИЗАЦИЯ КОГНИТИВНОГО ЯДРА // АКТИВНО]", cx, cy - 185 * uiScale, MENU_LAYOUT.subtitleColor, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  const inputW = 320;
  const inputH = 44;
  const inputX = cx - inputW / 2;
  const inputY = cy - 30 * uiScale;

  ctx.fillStyle = MENU_LAYOUT.inputBg;
  ctx.beginPath();
  ctx.roundRect(inputX, inputY, inputW, inputH, 8);
  ctx.fill();
  ctx.strokeStyle = MENU_LAYOUT.inputBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const displayText = state.usernameInput.length > 0 ? `>> ID: ${state.usernameInput}` : ">> ВВЕДИТЕ ИДЕНТИФИКАТОР...";
  const blink = Math.floor(Date.now() / 500) % 2 === 0 && state.usernameInput.length > 0 ? "|" : "";
  TextRenderer.draw(ctx, displayText + blink, cx, inputY + 27, state.usernameInput.length > 0 ? MENU_LAYOUT.inputTextActive : MENU_LAYOUT.inputTextPlaceholder, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 50 * uiScale;

  const hovered = state.mouseX >= btnX && state.mouseX <= btnX + btnW && state.mouseY >= btnY && state.mouseY <= btnY + btnH;

  ctx.fillStyle = hovered ? MENU_LAYOUT.btnBgHovered : MENU_LAYOUT.btnBgDefault;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? MENU_LAYOUT.btnBorderHovered : MENU_LAYOUT.btnBorderDefault;
  ctx.lineWidth = 2;
  ctx.stroke();

  TextRenderer.draw(ctx, "[ЗАПУСТИТЬ ЯДРО]", cx, btnY + 32, hovered ? MENU_LAYOUT.btnTextHovered : MENU_LAYOUT.btnTextDefault, { fontSize: 15, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, "WASD/ДВИЖЕНИЕ | МЫШЬ/ПРИЦЕЛ | ЛКМ/СТРЕЛЬБА | ПРОБЕЛ/ПРИЗЫВ", cx, canvasHeight - 40 * uiScale, MENU_LAYOUT.footerColor, { fontSize: 11, align: "center", bold: true }, canvasWidth, canvasHeight);
}

export function renderGameOver(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const uiScale = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  ctx.fillStyle = GAMEOVER_LAYOUT.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  TextRenderer.draw(ctx, "КРИТИЧЕСКИЙ СБОЙ ЯДРА", cx, cy - 100 * uiScale, GAMEOVER_LAYOUT.titleColor, { fontSize: 40, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, "ОТЧЕТ МЕТРИК СЕКТОРА // АВАРИЙНЫЙ КОЛЛАПС", cx, cy - 65 * uiScale, GAMEOVER_LAYOUT.subtitleColor, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, `СОБРАНО ДАННЫХ: ${state.gameOverScore}`, cx, cy - 10 * uiScale, GAMEOVER_LAYOUT.metricsColor, { fontSize: 18, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, `СТАБИЛЬНЫХ ЦИКЛОВ: ${state.gameOverWave}`, cx, cy + 25 * uiScale, GAMEOVER_LAYOUT.metricsMuted, { fontSize: 16, align: "center" }, canvasWidth, canvasHeight);

  const btnW = 260;
  const btnH = 52;
  const btnX = cx - btnW / 2;
  const btnY = cy + 90;

  const hovered = state.mouseX >= btnX && state.mouseX <= btnX + btnW && state.mouseY >= btnY && state.mouseY <= btnY + btnH;

  ctx.fillStyle = hovered ? GAMEOVER_LAYOUT.btnBgHovered : GAMEOVER_LAYOUT.btnBgDefault;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? GAMEOVER_LAYOUT.btnBorderHovered : GAMEOVER_LAYOUT.btnBorderDefault;
  ctx.lineWidth = 2;
  ctx.stroke();

  TextRenderer.draw(ctx, "[ПЕРЕЗАПУСК ЯДРА]", cx, btnY + 32, hovered ? GAMEOVER_LAYOUT.btnTextHovered : GAMEOVER_LAYOUT.btnTextDefault, { fontSize: 15, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, localizationData.ui.restart_prompt, cx, canvasHeight - 40 * uiScale, GAMEOVER_LAYOUT.footerColor, { fontSize: 11, align: "center", bold: true }, canvasWidth, canvasHeight);
}

export function drawPauseUI(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, uiScale: number) {
  ctx.fillStyle = PAUSE_LAYOUT.bgColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  TextRenderer.draw(ctx, "СИСТЕМА НА ПАУЗЕ", cx, cy - 20 * uiScale, PAUSE_LAYOUT.titleColor, { fontSize: 28, align: "center", bold: true }, canvasWidth, canvasHeight);

  TextRenderer.draw(ctx, "[НАЖМИТЕ ESC ДЛЯ ПРОДОЛЖЕНИЯ]", cx, cy + 20 * uiScale, PAUSE_LAYOUT.subtitleColor, { fontSize: 13, align: "center", bold: true }, canvasWidth, canvasHeight);
}

export function renderGame(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  let px = state.arenaWidth / 2;
  let py = state.arenaHeight / 2;

  if (state.playerId !== null) {
    const me = renderEntities.get(state.playerId);
    if (me) {
      me.x = lerp(me.x, me.targetX, 0.2);
      me.y = lerp(me.y, me.targetY, 0.2);
      me.angle = lerpAngle(me.angle, me.targetAngle, 0.2);
      px = me.x;
      py = me.y;
    }
  }

  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(state.cameraZoom, state.cameraZoom);
  ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

  drawGrid(ctx, px, py, canvasWidth, canvasHeight);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.strokeRect(canvasWidth / 2 - px, canvasHeight / 2 - py, state.arenaWidth, state.arenaHeight);

  for (const ent of renderEntities.values()) {
    if (ent.id !== state.playerId) {
      ent.x = lerp(ent.x, ent.targetX, 0.2);
      ent.y = lerp(ent.y, ent.targetY, 0.2);
      ent.angle = lerpAngle(ent.angle, ent.targetAngle, 0.2);
    }

    const rx = ent.x - px + canvasWidth / 2;
    const ry = ent.y - py + canvasHeight / 2;

    if (rx < -50 || rx > canvasWidth + 50 || ry < -50 || ry > canvasHeight + 50) {
      continue;
    }

    if (ent.type === 4) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2, canvasHeight / 2);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(ent.angle);

    if (ent.type === 0) {
      if (ent.subtype === 3 && (ent.stateFlags & 1) !== 0) {
        ctx.globalAlpha = 0.3;
      }

      const isFlashing = (ent.stateFlags & 2) !== 0;

      if (ent.subtype === 1) {
        const cacheKey = `p_ranger_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#0a1e2b";
          c.strokeStyle = isFlashing ? "#ffffff" : "#00f0ff";
          c.lineWidth = 3;
          drawRegularPolygonPath(c, r, 6, 0);
          c.fill();
          c.stroke();
          c.fillStyle = isFlashing ? "#ffffff" : "#00f0ff";
          c.beginPath();
          c.arc(0, 0, 4, 0, Math.PI * 2);
          c.fill();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 2) {
        const cacheKey = `p_technomage_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#1e1e0a";
          c.strokeStyle = isFlashing ? "#ffffff" : "#fbbf24";
          c.lineWidth = 3;
          drawRegularPolygonPath(c, r, 5, -Math.PI / 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 3) {
        const cacheKey = `p_necromancer_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#1e0a2b";
          c.strokeStyle = isFlashing ? "#ffffff" : "#a855f7";
          c.lineWidth = 3;
          drawRegularPolygonPath(c, r, 8, 0);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else {
        const cacheKey = `p_default_${ent.radius}${isFlashing ? "_flash" : ""}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = isFlashing ? "rgba(255, 255, 255, 0.95)" : "#0a1e2b";
          c.strokeStyle = isFlashing ? "#ffffff" : "#00f0ff";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      }

      const numShields = (ent.stateFlags >> 4) & 0xF;
      if (numShields > 0) {
        for (let i = 0; i < numShields; i++) {
          const orbitAngle = (Date.now() / 350) + (i / numShields) * Math.PI * 2;
          const sx = Math.cos(orbitAngle) * 55;
          const sy = Math.sin(orbitAngle) * 55;
          ctx.fillStyle = "#00f0ff";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;

      if (ent.health < ent.maxHealth) {
        ctx.rotate(-ent.angle);
        const barW = ent.radius * 2;
        const barH = 4;
        const barY = -ent.radius - 10;
        ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
        ctx.beginPath();
        ctx.roundRect(-ent.radius, barY, barW, barH, 2);
        ctx.fill();

        const pct = Math.min(1, Math.max(0, ent.health / ent.maxHealth));
        if (pct > 0) {
          ctx.fillStyle = "#00f0ff";
          ctx.beginPath();
          ctx.roundRect(-ent.radius, barY, barW * pct, barH, 2);
          ctx.fill();
        }
      }
    } else if (ent.type === 1) {
      const rarity = ent.stateFlags & 0xFF;
      const modifiers = (ent.stateFlags >> 8) & 0xFF;
      
      const rColors = RARITY_COLORS[rarity] || RARITY_COLORS[0];
      const fillColor = rColors.fill;
      const strokeColor = rColors.stroke;

      if ((modifiers & 4) !== 0) {
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(34, 197, 94, 0.5)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if ((modifiers & 8) !== 0) {
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.save();
      if (ent.subtype === 10 || ent.subtype === 11 || ent.subtype === 12) {
        ctx.rotate(Date.now() / 600);
      }

      if (ent.subtype === 1) {
        const cacheKey = `m_1_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 3;
          drawRegularPolygonPath(c, r, 5, -Math.PI / 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 2) {
        const cacheKey = `m_2_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 3;
          drawRegularPolygonPath(c, r, 6, 0);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 3) {
        const cacheKey = `m_3_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 3;
          drawRegularPolygonPath(c, r, 3, -Math.PI / 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 10) {
        const cacheKey = `m_boss_10_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 4;
          drawRegularPolygonPath(c, r, 10, 0);
          c.fill();
          c.stroke();
          c.strokeStyle = "#ffffff";
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(0, 0, r * 0.4, 0, Math.PI * 2);
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 11) {
        const cacheKey = `m_boss_11_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 4;
          c.beginPath();
          for (let i = 0; i < 16; i++) {
            const a = (i * 2 * Math.PI) / 16;
            const curR = i % 2 === 0 ? r : r * 0.65;
            c.lineTo(Math.cos(a) * curR, Math.sin(a) * curR);
          }
          c.closePath();
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else if (ent.subtype === 12) {
        const cacheKey = `m_boss_12_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 4;
          drawRegularPolygonPath(c, r, 8, 0);
          c.fill();
          c.stroke();
          c.strokeStyle = "#ffffff";
          c.lineWidth = 2;
          drawRegularPolygonPath(c, r * 0.6, 8, Math.PI / 8);
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      } else {
        const cacheKey = `m_0_${ent.radius}_${rarity}`;
        const sc = getShapeCanvas(cacheKey, ent.radius, (c, r) => {
          c.fillStyle = fillColor;
          c.strokeStyle = strokeColor;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
      }
      ctx.restore();

      if (ent.health < ent.maxHealth) {
        ctx.rotate(-ent.angle);
        const barW = ent.radius * 2;
        const barH = 4;
        const barY = -ent.radius - 10;
        ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
        ctx.beginPath();
        ctx.roundRect(-ent.radius, barY, barW, barH, 2);
        ctx.fill();

        const pct = Math.min(1, Math.max(0, ent.health / ent.maxHealth));
        if (pct > 0) {
          ctx.fillStyle = "#ff2a5f";
          ctx.beginPath();
          ctx.roundRect(-ent.radius, barY, barW * pct, barH, 2);
          ctx.fill();
        }
      }
    } else if (ent.type === 2) {
      if (ent.subtype === 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
        ctx.lineWidth = ent.radius * 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-ent.radius * 3, 0);
        ctx.lineTo(ent.radius * 2, 0);
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = ent.radius * 0.8;
        ctx.beginPath();
        ctx.moveTo(-ent.radius * 3, 0);
        ctx.lineTo(ent.radius * 2, 0);
        ctx.stroke();
        ctx.restore();
      } else if (ent.subtype === 2) {
        ctx.save();
        const grad = ctx.createRadialGradient(-ent.radius * 0.2, -ent.radius * 0.2, ent.radius * 0.1, 0, 0, ent.radius);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, "#00f0ff");
        grad.addColorStop(0.8, "rgba(0, 240, 255, 0.3)");
        grad.addColorStop(1, "rgba(0, 240, 255, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(-ent.radius * 0.1, -ent.radius * 0.1, ent.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (ent.subtype === 3) {
        ctx.save();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(-ent.radius, 0, ent.radius * 2, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-ent.radius, 0, ent.radius * 2, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

    } else if (ent.type === 4) {
      ctx.save();
      ctx.fillStyle = "#1e0a2b";
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const numTriangles = 3;
      const orbitRadius = ent.radius * 1.4;
      const orbitAngle = Date.now() / 400;
      ctx.fillStyle = "#c084fc";
      for (let j = 0; j < numTriangles; j++) {
        const a = orbitAngle + (j * Math.PI * 2) / numTriangles;
        const tx = Math.cos(a) * orbitRadius;
        const ty = Math.sin(a) * orbitRadius;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(3.5, 3);
        ctx.lineTo(-3.5, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      if (ent.health < ent.maxHealth) {
        ctx.save();
        ctx.rotate(-ent.angle);
        const barW = ent.radius * 2;
        const barH = 4;
        const barY = -ent.radius - 8;
        ctx.fillStyle = "rgba(5, 5, 8, 0.75)";
        ctx.beginPath();
        ctx.roundRect(-ent.radius, barY, barW, barH, 2);
        ctx.fill();
        const pct = Math.min(1, Math.max(0, ent.health / ent.maxHealth));
        if (pct > 0) {
          ctx.fillStyle = "#a855f7";
          ctx.beginPath();
          ctx.roundRect(-ent.radius, barY, barW * pct, barH, 2);
          ctx.fill();
        }
        ctx.restore();
      }
    } else if (ent.type === 5) {
      ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(139, 92, 246, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (ent.type === 6) {
      ctx.save();
      ctx.rotate(Date.now() / 1000);
      const itemKey = String(ent.subtype);
      const itemInfo = (localizationData.items as any)[itemKey];
      const color = itemInfo ? itemInfo.color : "#10b981";
      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-ent.radius, -ent.radius, ent.radius * 2, ent.radius * 2, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-ent.radius + 2, -ent.radius + 2);
      ctx.lineTo(ent.radius - 2, -ent.radius + 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawAndUpdateParticles(ctx, px, py, canvasWidth, canvasHeight);
  ctx.restore();

  const grad = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    0,
    canvasWidth / 2,
    canvasHeight / 2,
    Math.max(canvasWidth, canvasHeight) * 0.8
  );
  grad.addColorStop(0, "rgba(5, 5, 8, 0)");
  grad.addColorStop(1, "rgba(5, 5, 8, 0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const uiScale = Math.min(canvasWidth / 1920, canvasHeight / 1080);
  drawHUD(ctx, canvasWidth, canvasHeight, uiScale);
  drawUpgradePanel(ctx, canvasWidth, canvasHeight, uiScale);

  if (state.upgradePoints > 0) {
    drawUpgradeCardsOverlay(ctx, canvasWidth, canvasHeight, uiScale);
  }

  if (state.isGamePaused && state.upgradePoints === 0) {
    drawPauseUI(ctx, canvasWidth, canvasHeight, uiScale);
  }
}

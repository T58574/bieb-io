import { state } from "./state";
import { TextRenderer } from "./text";
import { GAMEOVER_LAYOUT } from "./graphics_config";
import localizationData from "./items_localization.json";

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

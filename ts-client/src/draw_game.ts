import { state, renderEntities } from "./state";
import { drawAndUpdateParticles } from "./particles";
import {
  lerp,
  lerpAngle
} from "./draw_helpers";
import {
  drawHUD,
  drawUpgradePanel,
  drawUpgradeCardsOverlay,
  drawPauseUI
} from "./draw_hud";
import { drawGrid } from "./draw_grid";
import { drawEntity, Entity } from "./draw_entities";

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

    drawEntity(ctx, ent as Entity, rx, ry);
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

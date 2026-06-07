import { state, renderEntities } from "./state";
import { drawAndUpdateParticles } from "./particles";
import localizationData from "../../config/items_localization.json";
import {
  GRID_CONFIG,
  RARITY_COLORS
} from "./graphics_config";
import {
  lerp,
  lerpAngle,
  getShapeCanvas,
  drawRegularPolygonPath
} from "./draw_helpers";
import {
  drawHUD,
  drawUpgradePanel,
  drawUpgradeCardsOverlay,
  drawPauseUI
} from "./draw_hud";

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

      if ((ent.stateFlags & 0x100000) !== 0) {
        ctx.save();
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = ent.radius * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-ent.radius * 3, 0);
        ctx.stroke();
        ctx.restore();
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
    } else if (ent.type === 7) {
      ctx.save();

      const time = Date.now() / 1000;

      // Pull-in radius visualization
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, ent.radius);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.9)");
      grad.addColorStop(0.3, "rgba(50, 0, 100, 0.5)");
      grad.addColorStop(0.8, "rgba(100, 0, 200, 0.1)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
      ctx.fill();

      // Swirling core
      ctx.rotate(time * 2);
      const coreRadius = ent.radius * 0.2; // approx 150 / 800
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius + Math.sin(time * 5 + i) * 10, i * Math.PI / 2, (i + 1) * Math.PI / 2 - 0.2);
        ctx.stroke();
      }

      // Debris/Accretion disk rings
      ctx.rotate(-time * 1.5);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, coreRadius * i * 1.5, coreRadius * i * 1.5 + Math.sin(time) * 10, time * i, 0, Math.PI * 2);
        ctx.stroke();
      }

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

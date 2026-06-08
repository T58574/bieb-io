import { RARITY_COLORS } from "./graphics_config";
import {
  getShapeCanvas,
  drawRegularPolygonPath
} from "./draw_helpers";
import localizationData from "../../config/items_localization.json";

export interface Entity {
  id: number;
  type: number;
  subtype: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  targetAngle: number;
  health: number;
  maxHealth: number;
  radius: number;
  stateFlags: number;
}

export function drawPolygonEntity(
  ctx: CanvasRenderingContext2D,
  cacheKey: string,
  radius: number,
  sides: number,
  angle: number,
  fillColor: string,
  strokeColor: string,
  lineWidth: number = 3
) {
  const sc = getShapeCanvas(cacheKey, radius, (c, r) => {
    c.fillStyle = fillColor;
    c.strokeStyle = strokeColor;
    c.lineWidth = lineWidth;
    drawRegularPolygonPath(c, r, sides, angle);
    c.fill();
    c.stroke();
  });
  ctx.drawImage(sc, -sc.width / 2, -sc.height / 2);
}

export function drawEntity(ctx: CanvasRenderingContext2D, ent: Entity, rx: number, ry: number) {
  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(ent.angle);

  if (ent.type === 0) {
    drawPlayerEntity(ctx, ent);
  } else if (ent.type === 1) {
    drawMobEntity(ctx, ent);
  } else if (ent.type === 2) {
    drawBulletEntity(ctx, ent);
  } else if (ent.type === 4) {
    drawMinionEntity(ctx, ent);
  } else if (ent.type === 5) {
    drawFieldEntity(ctx, ent);
  } else if (ent.type === 6) {
    drawLootEntity(ctx, ent);
  }

  ctx.restore();
}

function drawPlayerEntity(ctx: CanvasRenderingContext2D, ent: Entity) {
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
    drawPolygonEntity(ctx, cacheKey, ent.radius, 5, -Math.PI / 2, isFlashing ? "rgba(255, 255, 255, 0.95)" : "#1e1e0a", isFlashing ? "#ffffff" : "#fbbf24");
  } else if (ent.subtype === 3) {
    const cacheKey = `p_necromancer_${ent.radius}${isFlashing ? "_flash" : ""}`;
    drawPolygonEntity(ctx, cacheKey, ent.radius, 8, 0, isFlashing ? "rgba(255, 255, 255, 0.95)" : "#1e0a2b", isFlashing ? "#ffffff" : "#a855f7");
  } else if (ent.subtype === 4) {
    const cacheKey = `p_biotank_${ent.radius}${isFlashing ? "_flash" : ""}`;
    drawPolygonEntity(ctx, cacheKey, ent.radius, 4, 0, isFlashing ? "rgba(255, 255, 255, 0.95)" : "#0a2b0a", isFlashing ? "#ffffff" : "#22c55e", 4);
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
}

function drawMobEntity(ctx: CanvasRenderingContext2D, ent: Entity) {
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
    drawPolygonEntity(ctx, cacheKey, ent.radius, 5, -Math.PI / 2, fillColor, strokeColor);
  } else if (ent.subtype === 2) {
    const cacheKey = `m_2_${ent.radius}_${rarity}`;
    drawPolygonEntity(ctx, cacheKey, ent.radius, 6, 0, fillColor, strokeColor);
  } else if (ent.subtype === 3) {
    const cacheKey = `m_3_${ent.radius}_${rarity}`;
    drawPolygonEntity(ctx, cacheKey, ent.radius, 3, -Math.PI / 2, fillColor, strokeColor);
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
}

function drawBulletEntity(ctx: CanvasRenderingContext2D, ent: Entity) {
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
}

function drawMinionEntity(ctx: CanvasRenderingContext2D, ent: Entity) {
  ctx.save();
  if (ent.subtype === 1) {
    ctx.fillStyle = "#0a2b0a";
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ent.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.moveTo(0, -3);
    ctx.lineTo(0, 3);
    ctx.stroke();

    const orbitRadius = ent.radius * 1.4;
    const orbitAngle = Date.now() / 300;
    ctx.fillStyle = "#22c55e";
    for (let j = 0; j < 4; j++) {
      const a = orbitAngle + (j * Math.PI * 2) / 4;
      const tx = Math.cos(a) * orbitRadius;
      const ty = Math.sin(a) * orbitRadius;
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
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
}

function drawFieldEntity(ctx: CanvasRenderingContext2D, ent: Entity) {
  ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
  ctx.beginPath();
  ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(139, 92, 246, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLootEntity(ctx: CanvasRenderingContext2D, ent: Entity) {
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

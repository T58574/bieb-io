import { state, renderEntities } from "./state";
import { socket, sendPauseToggle, sendClassUpgrade, connectToServer } from "./network";
import { serializeInput } from "./protocol";
import localizationData from "./items_localization.json";

export const keys = { w: false, a: false, s: false, d: false, space: false, mouseLeft: false };

export function setupInputListeners(canvas: HTMLCanvasElement) {
  window.addEventListener("keydown", (e) => {
    if (state.gameState === "menu") {
      if (e.key === "Backspace") {
        state.usernameInput = state.usernameInput.slice(0, -1);
      } else if (e.key === "Enter") {
        if (state.usernameInput.length > 0) {
          state.playerUsername = state.usernameInput;
          connectToServer();
        }
      } else if (e.key.length === 1 && state.usernameInput.length < 16) {
        state.usernameInput += e.key;
      }
      return;
    }

    if (state.gameState === "gameover") {
      if (e.key === "Enter") {
        state.gameState = "menu";
      }
      return;
    }

    if (e.key === "Escape") {
      if (state.gameState === "playing") {
        sendPauseToggle();
      }
      return;
    }

    if (e.code === "KeyW" || e.key === "w" || e.key === "W" || e.key === "ц" || e.key === "Ц") keys.w = true;
    if (e.code === "KeyA" || e.key === "a" || e.key === "A" || e.key === "ф" || e.key === "Ф") keys.a = true;
    if (e.code === "KeyS" || e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") keys.s = true;
    if (e.code === "KeyD" || e.key === "d" || e.key === "D" || e.key === "в" || e.key === "В") keys.d = true;
    if (e.code === "Space" || e.key === " ") keys.space = true;

    if (state.upgradePoints > 0) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 3) {
        state.selectedUpgradeChoice = num;
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW" || e.key === "w" || e.key === "W" || e.key === "ц" || e.key === "Ц") keys.w = false;
    if (e.code === "KeyA" || e.key === "a" || e.key === "A" || e.key === "ф" || e.key === "Ф") keys.a = false;
    if (e.code === "KeyS" || e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") keys.s = false;
    if (e.code === "KeyD" || e.key === "d" || e.key === "D" || e.key === "в" || e.key === "В") keys.d = false;
    if (e.code === "Space" || e.key === " ") keys.space = false;
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "x" || e.key === "X") {
      const itemCounts = new Map<number, number>();
      for (let i = 0; i < 16; i++) {
        const itemID = state.inventory[2 * i];
        const count = state.inventory[2 * i + 1];
        if (itemID && itemID !== 0 && count > 0) {
          itemCounts.set(itemID, count);
        }
      }
      const uniqueItems = Array.from(itemCounts.keys());
      const rightX = canvas.width - 210;
      const startY = 120;
      const slotW = 44;
      const slotH = 44;
      const gap = 6;
      for (let i = 0; i < uniqueItems.length; i++) {
        const c = i % 4;
        const r = Math.floor(i / 4);
        const sx = rightX + c * (slotW + gap);
        const sy = startY + r * (slotH + gap);
        if (state.mouseX >= sx && state.mouseX <= sx + slotW && state.mouseY >= sy && state.mouseY <= sy + slotH) {
          state.selectedDeleteChoice = uniqueItems[i];
          break;
        }
      }
    }
  });

  window.addEventListener("mousemove", (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    if (state.gameState === "playing") {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      state.mouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    }
  });

  window.addEventListener("mousedown", (e) => {
    if (state.gameState === "menu") {
      const uiScale = Math.min(canvas.width / 1920, canvas.height / 1080);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const cardW = 180 * uiScale;
      const cardH = 200 * uiScale;
      const gap = 20 * uiScale;
      const numClasses = localizationData.classes.length;
      const totalWidth = numClasses * cardW + (numClasses - 1) * gap;
      const startX = cx - totalWidth / 2;
      const startY = cy - 130 * uiScale;

      for (let i = 0; i < numClasses; i++) {
        const x = startX + i * (cardW + gap);
        if (e.clientX >= x && e.clientX <= x + cardW && e.clientY >= startY && e.clientY <= startY + cardH) {
          state.selectedClass = i + 1;
          return;
        }
      }

      const btnW = 260;
      const btnH = 56;
      const btnX = cx - btnW / 2;
      const btnY = cy + 180 * uiScale;
      if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
        if (state.usernameInput.length > 0) {
          state.playerUsername = state.usernameInput;
          connectToServer();
        }
      }
      return;
    }

    if (state.gameState === "gameover") {
      const cx = canvas.width / 2;
      const btnW = 260;
      const btnH = 56;
      const btnX = cx - btnW / 2;
      const btnY = canvas.height / 2 + 100;
      if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
        state.gameState = "menu";
      }
      return;
    }

    if (state.gameState === "playing") {
      if (state.playerId !== null) {
        const me = renderEntities.get(state.playerId);
        if (me && me.subtype === 0 && state.currentLevel >= 10) {
          const uiScale = Math.min(canvas.width / 1920, canvas.height / 1080);
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const cardW = 200 * uiScale;
          const cardH = 260 * uiScale;
          const gap = 24 * uiScale;
          const numClasses = localizationData.classes.length;
          const totalWidth = numClasses * cardW + (numClasses - 1) * gap;
          const startX = cx - totalWidth / 2;
          const startY = cy - 120 * uiScale;
          for (let i = 0; i < numClasses; i++) {
            const x = startX + i * (cardW + gap);
            if (e.clientX >= x && e.clientX <= x + cardW && e.clientY >= startY && e.clientY <= startY + cardH) {
              sendClassUpgrade(i + 1);
              return;
            }
          }
          return;
        }

        if (state.upgradePoints > 0) {
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const cardW = 200;
          const cardH = 280;
          const gap = 30;
          const startX = cx - 330;
          const startY = cy - 140;
          for (let i = 0; i < 3; i++) {
            const x = startX + i * (cardW + gap);
            if (e.clientX >= x && e.clientX <= x + cardW && e.clientY >= startY && e.clientY <= startY + cardH) {
              state.selectedUpgradeChoice = i + 1;
              return;
            }
          }
        }
      }
      if (e.button === 0) keys.mouseLeft = true;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (state.gameState === "playing") {
      if (e.button === 0) keys.mouseLeft = false;
    }
  });

  window.setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN && state.gameState === "playing") {
      let mask = 0;
      const me = state.playerId !== null ? renderEntities.get(state.playerId) : null;
      const isUpgrading = me && me.subtype === 0 && state.currentLevel >= 10;
      if (!isUpgrading) {
        if (keys.w) mask |= 0x01;
        if (keys.a) mask |= 0x02;
        if (keys.s) mask |= 0x04;
        if (keys.d) mask |= 0x08;
        if (keys.space) mask |= 0x10;
        if (keys.mouseLeft) mask |= 0x20;
      }
      socket.send(serializeInput(mask, state.mouseAngle, state.selectedUpgradeChoice, state.selectedDeleteChoice || 0));
      if (state.selectedUpgradeChoice !== 0) {
        state.selectedUpgradeChoice = 0;
      }
      if (state.selectedDeleteChoice !== 0) {
        state.selectedDeleteChoice = 0;
      }
    }
  }, 1000 / 60);
}

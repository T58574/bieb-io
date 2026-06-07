import { state, renderEntities } from "./state";
import { socket, sendPauseToggle, sendClassUpgrade, connectToServer } from "./network";
import { serializeInput } from "./protocol";

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

    if (e.key === "w" || e.key === "W") keys.w = true;
    if (e.key === "a" || e.key === "A") keys.a = true;
    if (e.key === "s" || e.key === "S") keys.s = true;
    if (e.key === "d" || e.key === "D") keys.d = true;
    if (e.key === " ") keys.space = true;

    if (state.upgradePoints > 0) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        state.selectedUpgradeChoice = num;
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "W") keys.w = false;
    if (e.key === "a" || e.key === "A") keys.a = false;
    if (e.key === "s" || e.key === "S") keys.s = false;
    if (e.key === "d" || e.key === "D") keys.d = false;
    if (e.key === " ") keys.space = false;
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
      const cx = canvas.width / 2;
      const btnW = 260;
      const btnH = 56;
      const btnX = cx - btnW / 2;
      const btnY = canvas.height / 2 + 80;
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
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const cardW = 180;
          const cardH = 240;
          const gap = 20;
          const startX = cx - 390;
          const startY = cy - 120;
          for (let i = 0; i < 4; i++) {
            const x = startX + i * (cardW + gap);
            if (e.clientX >= x && e.clientX <= x + cardW && e.clientY >= startY && e.clientY <= startY + cardH) {
              sendClassUpgrade(i + 1);
              return;
            }
          }
          return;
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
      socket.send(serializeInput(mask, state.mouseAngle, state.selectedUpgradeChoice));
      if (state.selectedUpgradeChoice !== 0) {
        state.selectedUpgradeChoice = 0;
      }
    }
  }, 1000 / 60);
}

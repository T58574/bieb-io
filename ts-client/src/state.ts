export interface RenderEntity {
  id: number;
  type: number;
  subtype: number;
  x: number;
  y: number;
  angle: number;
  targetX: number;
  targetY: number;
  targetAngle: number;
  health: number;
  maxHealth: number;
  radius: number;
  stateFlags: number;
}

export type GameState = "menu" | "playing" | "gameover";

const initialUsername = "Player" + Math.floor(Math.random() * 9000 + 1000);

export const state = {
  gameState: "menu" as GameState,
  playerId: null as number | null,
  arenaWidth: 2000,
  arenaHeight: 2000,
  currentXP: 0,
  maxXP: 100,
  currentLevel: 1,
  currentScore: 0,
  playerHealth: 100,
  playerMaxHealth: 100,
  upgradePoints: 0,
  waveNumber: 0,
  isGamePaused: false,
  selectedUpgradeChoice: 0,
  statRegen: 0,
  statMaxHP: 0,
  statSpeed: 0,
  statMinionDmg: 0,
  statMinionSpeed: 0,
  statMinionHP: 0,
  statMinionPierce: 0,
  statMinionRegen: 0,
  gameOverScore: 0,
  gameOverWave: 0,
  playerUsername: initialUsername,
  usernameInput: initialUsername,
  menuAnimAngle: 0,
  mouseX: 0,
  mouseY: 0,
  mouseAngle: 0,
};

export const renderEntities = new Map<number, RenderEntity>();

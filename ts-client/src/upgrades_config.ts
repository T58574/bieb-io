import { state } from "./state";

export interface UpgradeCardDetail {
  title: string;
  color: string;
  desc: string;
  rarity: string;
  abbrev: string;
}

export const UPGRADE_DETAILS: Record<number, UpgradeCardDetail> = {
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

export const UPGRADE_STATE_KEYS: Record<number, keyof typeof state> = {
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

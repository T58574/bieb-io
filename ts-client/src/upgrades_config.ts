import { state } from "./state";
import upgradesData from "../../config/upgrades_localization.json";

export interface UpgradeCardDetail {
  title: string;
  color: string;
  desc: string;
  rarity: string;
  abbrev: string;
}

const rawData = upgradesData as Record<string, { title: string; color: string; desc: string; rarity: string; abbrev: string; stateKey: string }>;

export const UPGRADE_DETAILS: Record<number, UpgradeCardDetail> = {};
export const UPGRADE_STATE_KEYS: Record<number, keyof typeof state> = {};

for (const [idStr, entry] of Object.entries(rawData)) {
  const id = Number(idStr);
  UPGRADE_DETAILS[id] = {
    title: entry.title,
    color: entry.color,
    desc: entry.desc,
    rarity: entry.rarity,
    abbrev: entry.abbrev,
  };
  UPGRADE_STATE_KEYS[id] = entry.stateKey as keyof typeof state;
}

## Necro-Geometry Implementation Backlog

### TICKET 1 (Jules_Coder): Align Class System Backend & Frontend
**Priority**: High
**Context**: `.ai_docs/class_system.json` specifies branches like Warrior, Archer, Rogue, Mage. However, the client (`graphics.ts`) hardcodes classes "РЕЙНДЖЕР", "ТЕХНОМАГ", "НЕКРОМАНТ". Furthermore, `go-server/game/player.go` (`UpgradePlayerClass`) only sets `p.ClassID = classID` and hardcodes `p.Mass = 2.5` for class 1 without fully implementing mechanics.
**Task**:
1. Remove hardcoded classes in `ts-client/src/graphics.ts`.
2. Sync `.ai_docs/class_system.json` logic into Go-server (e.g., Archer charge shot, Rogue stealth, Mage drones).
3. Ensure the variable names across `structures.yaml` (`class_type`), Go (`ClassID`), and TypeScript (`subtype`/`classId`) are consistent.

### TICKET 2 (Jules_Coder): Extract Hardcoded Text to Localization Dictionary
**Priority**: Medium
**Context**: `ts-client/src/graphics.ts` contains hardcoded Russian text for `itemDetails` (e.g. "КОНДЕНСАТОР") and UI elements (e.g. "ВЫБЕРИТЕ СПЕЦИФИКАЦИЮ АРХИТЕКТУРЫ").
**Task**:
1. Create `ts-client/src/items_localization.json`.
2. Move all `itemDetails`, `classes`, and static HUD text strings into the JSON dictionary.
3. Update `graphics.ts` to import and consume this dictionary dynamically (`resolveJsonModule: true` in `tsconfig.json`).

### TICKET 3 (Jules_Balancer): Re-balance Item & Class Stats
**Priority**: High
**Context**: Class selections currently don't apply proper baseline stat changes. Drops (in `mob.go`) use arbitrary multipliers for Rarity 1-3. `items_config.go` has basic modifiers but lacks synergy with specific classes.
**Task**:
1. Balance `mob.go` `dropLoot` probabilities based on mob difficulty (Type 10, 11, 12 vs standard).
2. Tune `items_config.go` stat modifiers to have clear trade-offs.
3. Determine baseline health, speed, and damage adjustments for Warrior, Archer, Rogue, and Mage, and implement these rules in Go upon class selection.
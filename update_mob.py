import re

with open('go-server/game/mob.go', 'r') as f:
    content = f.read()

# Update signature
content = content.replace('func (w *GameWorld) dropLoot(pos physics.Vector2D, rarity uint8, mobType uint8) {', 'func (w *GameWorld) dropLoot(pos physics.Vector2D, rarity uint8, mobType uint8, killerID uint16) {')

# Read killer stat
loot_quantity_code = """	roll := w.rand.Float64()

	if killer, ok := w.Players[killerID]; ok && killer.Alive {
		roll += roll * float64(killer.StatLootQuantity) * 0.05
	}
"""
content = content.replace('	roll := w.rand.Float64()', loot_quantity_code)

# Replace loot tables
old_loot_code = """	if mobType == 10 || mobType == 11 || mobType == 12 {
		if roll < 0.5 {
			itemID = 3
		} else {
			itemID = 4
		}
	} else {
		if roll < 0.10 {
			itemID = 1
		} else if roll < 0.11 {
			itemID = 2
		} else if roll < 0.14 {
			if w.rand.Float64() < 0.5 {
				itemID = 3
			} else {
				itemID = 4
			}
		}
	}"""

new_loot_code = """	commonItems := []uint8{1, 5, 6}
	rareItems := []uint8{2, 7, 8}
	uniqueItems := []uint8{3, 4, 9, 10, 11}
	legendaryItems := []uint8{12, 13, 14}

	if mobType == 10 || mobType == 11 || mobType == 12 {
		// Bosses drop rare, unique, or legendary
		if roll < 0.2 {
			itemID = rareItems[w.rand.Intn(len(rareItems))]
		} else if roll < 0.8 {
			itemID = uniqueItems[w.rand.Intn(len(uniqueItems))]
		} else {
			itemID = legendaryItems[w.rand.Intn(len(legendaryItems))]
		}
	} else {
		// Normal mobs
		if rarity == 3 {
			if roll < 0.5 {
				itemID = uniqueItems[w.rand.Intn(len(uniqueItems))]
			} else if roll < 0.95 {
				itemID = rareItems[w.rand.Intn(len(rareItems))]
			} else {
				itemID = legendaryItems[w.rand.Intn(len(legendaryItems))]
			}
		} else if rarity == 2 {
			if roll < 0.1 {
				itemID = uniqueItems[w.rand.Intn(len(uniqueItems))]
			} else if roll < 0.4 {
				itemID = rareItems[w.rand.Intn(len(rareItems))]
			} else if roll < 0.8 {
				itemID = commonItems[w.rand.Intn(len(commonItems))]
			}
		} else if rarity == 1 {
			if roll < 0.05 {
				itemID = rareItems[w.rand.Intn(len(rareItems))]
			} else if roll < 0.25 {
				itemID = commonItems[w.rand.Intn(len(commonItems))]
			}
		} else {
			if roll < 0.08 {
				itemID = commonItems[w.rand.Intn(len(commonItems))]
			} else if roll < 0.09 {
				itemID = rareItems[w.rand.Intn(len(rareItems))]
			} else if roll < 0.095 {
				itemID = uniqueItems[w.rand.Intn(len(uniqueItems))]
			}
		}
	}"""
content = content.replace(old_loot_code, new_loot_code)

# Replace all calls to dropLoot in mob.go
# There is one call in mob.go: w.dropLoot(m.Pos, m.Rarity, m.Type)
# We need to change it to w.dropLoot(m.Pos, m.Rarity, m.Type, 0)
# But wait, we want to know the killer. In updateMobs, mobs die mostly from Health <= 0, which could be anything.
# The caller of dropLoot in updateMobs doesn't know the killer. Let's see updateMobs.
content = content.replace('w.dropLoot(m.Pos, m.Rarity, m.Type)', 'w.dropLoot(m.Pos, m.Rarity, m.Type, 0)')

with open('go-server/game/mob.go', 'w') as f:
    f.write(content)

print("mob updated")

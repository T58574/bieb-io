package game

import (
	"math/rand"
	"testing"
)

func TestLootDistribution(t *testing.T) {
	err := LoadLootConfig("../config/loot_tables.json")
	if err != nil {
		err = LoadLootConfig("../../config/loot_tables.json")
	}
	if err != nil {
		t.Fatalf("Failed to load loot tables: %v", err)
	}

	r := rand.New(rand.NewSource(42))

	keys := []string{"boss", "normal_rarity_3", "normal_rarity_2", "normal_rarity_1", "normal_rarity_0"}
	for _, key := range keys {
		table, ok := GetLootTable(key)
		if !ok {
			t.Errorf("Loot table %s not found", key)
			continue
		}

		counts := make(map[uint8]int)
		noLootCount := 0
		iterations := 100000

		for i := 0; i < iterations; i++ {
			roll := r.Float64()
			if roll >= table.LootChance {
				noLootCount++
				continue
			}

			totalWeight := 0
			for _, g := range table.Groups {
				totalWeight += g.Weight
			}
			if totalWeight <= 0 {
				noLootCount++
				continue
			}

			weightRoll := r.Intn(totalWeight)
			currentWeight := 0
			var selectedGroup *LootGroup
			for _, g := range table.Groups {
				currentWeight += g.Weight
				if weightRoll < currentWeight {
					selectedGroup = &g
					break
				}
			}

			if selectedGroup == nil || len(selectedGroup.Items) == 0 {
				noLootCount++
				continue
			}

			itemID := selectedGroup.Items[r.Intn(len(selectedGroup.Items))]
			if itemID == 0 {
				noLootCount++
			} else {
				counts[itemID]++
			}
		}

		t.Logf("--- Loot Distribution for %s ---", key)
		totalDropped := iterations - noLootCount
		t.Logf("Loot Chance Configured: %.3f (Actual drop rate: %.3f%%)", table.LootChance, float64(totalDropped)/float64(iterations)*100.0)
		for itemID, count := range counts {
			pctOfTotal := float64(count) / float64(iterations) * 100.0
			pctOfDrops := 0.0
			if totalDropped > 0 {
				pctOfDrops = float64(count) / float64(totalDropped) * 100.0
			}
			t.Logf("  Item ID %3d: Count: %5d | Pct of runs: %6.2f%% | Pct of drops: %6.2f%%", itemID, count, pctOfTotal, pctOfDrops)
		}
	}
}

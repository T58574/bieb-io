package game

import (
	"encoding/json"
	"log"
	"os"
	"sync"
)

type LootGroup struct {
	Weight int     `json:"Weight"`
	Items  []uint8 `json:"Items"`
}

type LootTableConfig struct {
	LootChance float64     `json:"LootChance"`
	Groups     []LootGroup `json:"Groups"`
}

var (
	lootRegistry   map[string]LootTableConfig
	lootRegistryMu sync.RWMutex
)

func init() {
	lootRegistryMu.Lock()
	defer lootRegistryMu.Unlock()
	lootRegistry = make(map[string]LootTableConfig)
}

func LoadLootConfig(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var tables map[string]LootTableConfig
	if err := json.Unmarshal(data, &tables); err != nil {
		return err
	}

	lootRegistryMu.Lock()
	defer lootRegistryMu.Unlock()
	lootRegistry = tables

	log.Printf("Loaded %d loot tables from %s", len(tables), path)
	return nil
}

func GetLootTable(key string) (LootTableConfig, bool) {
	lootRegistryMu.RLock()
	defer lootRegistryMu.RUnlock()
	table, exists := lootRegistry[key]
	return table, exists
}

package game

import (
	"encoding/json"
	"log"
	"os"
	"sync"
)

type UpgradeCardConfig struct {
	ID       uint8
	MaxLevel uint8
	Type     string
	Value    float64
}

type GlobalMultipliers struct {
	BaseMaxHP             float64
	HPPerLevel            float64
	SpeedPerLevel         float64
	RegenPerLevel         float64
	ShieldDamagePerSecond float64
	MinionDamagePerLevel  float64
}

type UpgradesConfig struct {
	Cards             []UpgradeCardConfig
	GlobalMultipliers GlobalMultipliers
}

var (
	upgradesRegistry   UpgradesConfig
	upgradesRegistryMu sync.RWMutex
)

func LoadUpgradesConfig(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var config UpgradesConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return err
	}

	upgradesRegistryMu.Lock()
	defer upgradesRegistryMu.Unlock()
	upgradesRegistry = config

	log.Printf("Loaded upgrades config with %d cards from %s", len(config.Cards), path)
	return nil
}

func GetUpgradesConfig() UpgradesConfig {
	upgradesRegistryMu.RLock()
	defer upgradesRegistryMu.RUnlock()
	return upgradesRegistry
}

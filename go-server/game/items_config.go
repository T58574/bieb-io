package game

import (
	"encoding/json"
	"log"
	"os"
	"sync"
)

type OnKillEffectTrigger uint8

const (
	TRIGGER_NONE OnKillEffectTrigger = iota
	TRIGGER_AREA_EXPLOSION
	TRIGGER_CHAIN_LIGHTNING
)

type ItemStatModifiers struct {
	FlatHP        float64
	PercentHP     float64
	FlatDamage    float64
	PercentDamage float64
	PercentSpeed  float64
	Vampirism     float64
	BulletSpeed   float64
	AddProjectiles int
	PierceCount   int
	Regen         float64
	Armor         float64
	CritChance    float64
	CritDamage    float64
	MinionDamage  float64
	MinionHP      float64
	ExpMod        float64
	PickupRadius  float64
}

type ItemModifier struct {
	ID                 uint16
	Rarity             uint8
	StatModifiers      ItemStatModifiers
	OnKillEffectTrigger OnKillEffectTrigger
}

var (
	itemRegistry   map[uint16]ItemModifier
	itemRegistryMu sync.RWMutex
)

func init() {
	itemRegistryMu.Lock()
	defer itemRegistryMu.Unlock()
	itemRegistry = make(map[uint16]ItemModifier)
}

func LoadItemsConfig(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var items []ItemModifier
	if err := json.Unmarshal(data, &items); err != nil {
		return err
	}

	itemRegistryMu.Lock()
	defer itemRegistryMu.Unlock()
	itemRegistry = make(map[uint16]ItemModifier)
	for _, item := range items {
		itemRegistry[item.ID] = item
	}

	log.Printf("Loaded %d items from %s", len(items), path)
	return nil
}

func GetItemModifier(id uint16) (ItemModifier, bool) {
	itemRegistryMu.RLock()
	defer itemRegistryMu.RUnlock()
	item, exists := itemRegistry[id]
	return item, exists
}

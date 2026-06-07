package game

import "sync"

type OnKillEffectTrigger uint8

const (
	TRIGGER_NONE OnKillEffectTrigger = iota
	TRIGGER_AREA_EXPLOSION
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

	itemRegistry[1] = ItemModifier{
		ID:     1,
		Rarity: 1,
		StatModifiers: ItemStatModifiers{
			PercentSpeed: 0.10,
		},
	}

	itemRegistry[2] = ItemModifier{
		ID:     2,
		Rarity: 2,
		StatModifiers: ItemStatModifiers{
			PercentDamage: 0.15,
			Vampirism:     0.05,
		},
	}

	itemRegistry[3] = ItemModifier{
		ID:     3,
		Rarity: 3,
		OnKillEffectTrigger: TRIGGER_AREA_EXPLOSION,
	}
}

func GetItemModifier(id uint16) (ItemModifier, bool) {
	itemRegistryMu.RLock()
	defer itemRegistryMu.RUnlock()
	item, exists := itemRegistry[id]
	return item, exists
}

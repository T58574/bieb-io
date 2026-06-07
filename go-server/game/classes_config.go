package game

import (
	"encoding/json"
	"log"
	"os"
	"sync"
)

type ClassConfig struct {
	ID             uint8
	ShootCooldown  float64
	BulletSpeed    float64
	BulletRadius   float64
	BulletDamage   float64
	BulletLifetime float64
	BulletPierce   int
	BulletSubtype  uint8
	Mass           float64
}

var (
	classRegistry   map[uint8]ClassConfig
	classRegistryMu sync.RWMutex
)

func init() {
	classRegistryMu.Lock()
	defer classRegistryMu.Unlock()
	classRegistry = make(map[uint8]ClassConfig)
}

func LoadClassesConfig(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	var classes []ClassConfig
	if err := json.Unmarshal(data, &classes); err != nil {
		return err
	}

	classRegistryMu.Lock()
	defer classRegistryMu.Unlock()
	classRegistry = make(map[uint8]ClassConfig)
	for _, class := range classes {
		classRegistry[class.ID] = class
	}

	log.Printf("Loaded %d classes from %s", len(classes), path)
	return nil
}

func GetClassConfig(id uint8) (ClassConfig, bool) {
	classRegistryMu.RLock()
	defer classRegistryMu.RUnlock()
	class, exists := classRegistry[id]
	return class, exists
}

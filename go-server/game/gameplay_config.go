package game

import (
	"encoding/json"
	"log"
	"os"
	"strconv"
	"sync"
)

type MobTypeConfig struct {
	Name             string  `json:"name"`
	BaseHP           float64 `json:"baseHP"`
	Radius           float64 `json:"radius"`
	BaseDamage       float64 `json:"baseDamage"`
	BaseXP           uint32  `json:"baseXP"`
	Acceleration     float64 `json:"acceleration"`
	BaseSpeed        float64 `json:"baseSpeed"`
	Sides            int     `json:"sides"`
	ShootCooldown    float64 `json:"shootCooldown"`
	ShootRange       float64 `json:"shootRange"`
	BulletSpeed      float64 `json:"bulletSpeed"`
	BulletRadius     float64 `json:"bulletRadius"`
	BulletDamage     float64 `json:"bulletDamage"`
	BulletLifetime   float64 `json:"bulletLifetime"`
	BulletPierce     int     `json:"bulletPierce"`
	BulletSubtype    uint8   `json:"bulletSubtype"`
	PreferredMinDist float64 `json:"preferredMinDist"`
	PreferredMaxDist float64 `json:"preferredMaxDist"`
	RetreatAccel     float64 `json:"retreatAccel"`
	RetreatSpeed     float64 `json:"retreatSpeed"`
	IdleFriction     float64 `json:"idleFriction"`
}

type MobsConfig struct {
	Types         map[string]MobTypeConfig `json:"types"`
	SpawnDistMin  float64                  `json:"spawnDistMin"`
	SpawnDistMax  float64                  `json:"spawnDistMax"`
	BorderPadding float64                  `json:"borderPadding"`
}

type BossTypeConfig struct {
	Name                   string  `json:"name"`
	BaseHP                 float64 `json:"baseHP"`
	Radius                 float64 `json:"radius"`
	BaseDamage             float64 `json:"baseDamage"`
	BaseXP                 float64 `json:"baseXP"`
	Acceleration           float64 `json:"acceleration"`
	BaseSpeed              float64 `json:"baseSpeed"`
	ShootCooldown          float64 `json:"shootCooldown"`
	ShootRange             float64 `json:"shootRange"`
	BulletCount            int     `json:"bulletCount"`
	BulletSpeed            float64 `json:"bulletSpeed"`
	BulletRadius           float64 `json:"bulletRadius"`
	BulletDamageMultiplier float64 `json:"bulletDamageMultiplier"`
	BulletLifetime         float64 `json:"bulletLifetime"`
	BulletPierce           int     `json:"bulletPierce"`
	BulletSubtype          uint8   `json:"bulletSubtype"`
	ChargeCooldown         float64 `json:"chargeCooldown"`
	ChargeSpeed            float64 `json:"chargeSpeed"`
	ChargeDuration         float64 `json:"chargeDuration"`
	IdleAcceleration       float64 `json:"idleAcceleration"`
	IdleSpeed              float64 `json:"idleSpeed"`
	KillAllPlayersOnDeath  bool    `json:"killAllPlayersOnDeath"`
}

type BossScheduleEntry struct {
	Wave   uint32  `json:"wave"`
	Bosses []uint8 `json:"bosses"`
}

type BossRecurringRule struct {
	Interval int     `json:"interval"`
	MaxWave  uint32  `json:"maxWave"`
	MinWave  uint32  `json:"minWave"`
	Bosses   []uint8 `json:"bosses"`
}

type BossesConfig struct {
	Types         map[string]BossTypeConfig `json:"types"`
	SpawnDistance float64                   `json:"spawnDistance"`
	Schedule      []BossScheduleEntry       `json:"schedule"`
	RecurringRule BossRecurringRule         `json:"recurringRule"`
}

type RarityChance struct {
	Rarity  uint8   `json:"rarity"`
	MaxRoll float64 `json:"maxRoll"`
}

type RarityMultiplier struct {
	HP            float64 `json:"hp"`
	Damage        float64 `json:"damage"`
	XP            float64 `json:"xp"`
	Radius        float64 `json:"radius"`
	Speed         float64 `json:"speed"`
	ModifierCount int     `json:"modifierCount"`
}

type RarityModifier struct {
	Bit             int     `json:"bit"`
	SpeedMultiplier float64 `json:"speedMultiplier"`
	RegenPercent    float64 `json:"regenPercent"`
	DamageReduction float64 `json:"damageReduction"`
	SpawnChance     float64 `json:"spawnChance"`
}

type RarityConfig struct {
	Chances     []RarityChance              `json:"chances"`
	Multipliers map[string]RarityMultiplier `json:"multipliers"`
	Modifiers   map[string]RarityModifier   `json:"modifiers"`
}

type MinionConfig struct {
	BaseHP            float64 `json:"baseHP"`
	HPPerLevel        float64 `json:"hpPerLevel"`
	BaseDamage        float64 `json:"baseDamage"`
	DamagePerLevel    float64 `json:"damagePerLevel"`
	Radius            float64 `json:"radius"`
	OrbitOffset       float64 `json:"orbitOffset"`
	OrbitAngularSpeed float64 `json:"orbitAngularSpeed"`
	FollowSpeed       float64 `json:"followSpeed"`
	SpeedPerLevel     float64 `json:"speedPerLevel"`
	ShootCooldown     float64 `json:"shootCooldown"`
	ShootRange        float64 `json:"shootRange"`
	BulletSpeed       float64 `json:"bulletSpeed"`
	BulletRadius      float64 `json:"bulletRadius"`
	BulletLifetime    float64 `json:"bulletLifetime"`
	BulletSubtype     uint8   `json:"bulletSubtype"`
	MaxLimit          int     `json:"maxLimit"`
	RegenPerLevel     float64 `json:"regenPerLevel"`
	DroneLifetime     float64 `json:"droneLifetime"`
	DroneHasLifetime  bool    `json:"droneHasLifetime"`
}

type CombatConfig struct {
	BaseCritChance                float64 `json:"baseCritChance"`
	BaseCritMultiplier            float64 `json:"baseCritMultiplier"`
	CritChancePerLevel            float64 `json:"critChancePerLevel"`
	CritDamagePerLevel            float64 `json:"critDamagePerLevel"`
	CritChainRange                float64 `json:"critChainRange"`
	CritChainDamage               float64 `json:"critChainDamage"`
	CritChainLimit                int     `json:"critChainLimit"`
	MaxDefianceReduction          float64 `json:"maxDefianceReduction"`
	DefiancePerLevel              float64 `json:"defiancePerLevel"`
	VampirismPerItem              float64 `json:"vampirismPerItem"`
	BulletKnockback               float64 `json:"bulletKnockback"`
	PlayerBulletKnockback         float64 `json:"playerBulletKnockback"`
	MeleeDamageRadiusFactor       float64 `json:"meleeDamageRadiusFactor"`
	MeleeContactDamageMultiplier  float64 `json:"meleeContactDamageMultiplier"`
	KineticDamageFactor           float64 `json:"kineticDamageFactor"`
	ShieldOrbitRadius             float64 `json:"shieldOrbitRadius"`
	ShieldBallRadius              float64 `json:"shieldBallRadius"`
	LaserChainThreshold           uint8   `json:"laserChainThreshold"`
	LaserChainRadius              float64 `json:"laserChainRadius"`
	LaserChainDamage              float64 `json:"laserChainDamage"`
	ExplosionRadius               float64 `json:"explosionRadius"`
	ExplosionDamage               float64 `json:"explosionDamage"`
	ArmorDmgReduction             float64 `json:"armorDmgReduction"`
	MinionContactDamageMultiplier float64 `json:"minionContactDamageMultiplier"`
	XPGainMultiplier              float64 `json:"xpGainMultiplier"`
	XPPerLevelMultiplier          float64 `json:"xpPerLevelMultiplier"`
	LevelUpXPMultiplier           float64 `json:"levelUpXPMultiplier"`
	LootQuantityPerLevel          float64 `json:"lootQuantityPerLevel"`
	LootQualityPerLevel           float64 `json:"lootQualityPerLevel"`
}

type PlayerConfig struct {
	Radius                    float64 `json:"radius"`
	StartHP                   float64 `json:"startHP"`
	StartMaxHP                float64 `json:"startMaxHP"`
	StartMaxXP                uint32  `json:"startMaxXP"`
	StartLevel                uint16  `json:"startLevel"`
	MoveAcceleration          float64 `json:"moveAcceleration"`
	Friction                  float64 `json:"friction"`
	AngleStep                 float64 `json:"angleStep"`
	AngleSpreadPerLevel       float64 `json:"angleSpreadPerLevel"`
	SpeedPerLevel             float64 `json:"speedPerLevel"`
	CooldownReductionPerLevel float64 `json:"cooldownReductionPerLevel"`
	DamageModPerLevel         float64 `json:"damageModPerLevel"`
	InventorySize             int     `json:"inventorySize"`
	InitialMinionOffset       float64 `json:"initialMinionOffset"`
}

type SpawnTableEntry struct {
	Type   uint8   `json:"type"`
	Weight float64 `json:"weight"`
}

type SpawnIntervalConfig struct {
	Base             float64 `json:"base"`
	ReductionPerWave float64 `json:"reductionPerWave"`
	Minimum          float64 `json:"minimum"`
}

type PackSizeConfig struct {
	Base    int `json:"base"`
	PerWave int `json:"perWave"`
}

type MaxAliveConfig struct {
	Base    int `json:"base"`
	PerWave int `json:"perWave"`
	Cap     int `json:"cap"`
}

type SpawnConfig struct {
	WaveSpawnTables map[string][]SpawnTableEntry `json:"waveSpawnTables"`
	SpawnInterval   SpawnIntervalConfig          `json:"spawnInterval"`
	PackSize        PackSizeConfig               `json:"packSize"`
	MaxAlive        MaxAliveConfig               `json:"maxAlive"`
	WavePauseTime   float64                      `json:"wavePauseTime"`
}

type WorldConfig struct {
	ArenaWidth      float64 `json:"arenaWidth"`
	ArenaHeight     float64 `json:"arenaHeight"`
	GridSize        int     `json:"gridSize"`
	CellSize        float64 `json:"cellSize"`
	TickRate        int     `json:"tickRate"`
	InputBufferSize int     `json:"inputBufferSize"`
	NextIDStart     uint16  `json:"nextIDStart"`
}

var (
	currentMobsConfig   MobsConfig
	currentBossesConfig BossesConfig
	currentRarityConfig RarityConfig
	currentMinionConfig MinionConfig
	currentCombatConfig CombatConfig
	currentPlayerConfig PlayerConfig
	currentSpawnConfig  SpawnConfig
	currentWorldConfig  WorldConfig
	gameConfigMu        sync.RWMutex
)

func init() {
	currentCombatConfig = CombatConfig{
		BaseCritChance:                0.20,
		BaseCritMultiplier:            2.0,
		CritChancePerLevel:            0.05,
		CritDamagePerLevel:            0.05,
		CritChainRange:                300.0,
		CritChainDamage:               15.0,
		CritChainLimit:                3,
		MaxDefianceReduction:          0.5,
		DefiancePerLevel:              0.05,
		VampirismPerItem:              0.05,
		BulletKnockback:               1.8,
		PlayerBulletKnockback:         0.8,
		MeleeDamageRadiusFactor:       0.25,
		MeleeContactDamageMultiplier:  0.12,
		KineticDamageFactor:           0.005,
		ShieldOrbitRadius:             55.0,
		ShieldBallRadius:              8.0,
		LaserChainThreshold:           3,
		LaserChainRadius:              120.0,
		LaserChainDamage:              25.0,
		ExplosionRadius:               140.0,
		ExplosionDamage:               35.0,
		ArmorDmgReduction:             0.7,
		MinionContactDamageMultiplier: 0.4,
		XPGainMultiplier:              0.75,
		XPPerLevelMultiplier:          0.01,
		LevelUpXPMultiplier:           1.3,
		LootQuantityPerLevel:          0.05,
		LootQualityPerLevel:           0.05,
	}
	currentPlayerConfig = PlayerConfig{
		Radius:                    24,
		StartHP:                   100,
		StartMaxHP:                100,
		StartMaxXP:                60,
		StartLevel:                1,
		MoveAcceleration:          0.6,
		Friction:                  0.88,
		AngleStep:                 0.15,
		AngleSpreadPerLevel:       0.05,
		SpeedPerLevel:             0.01,
		CooldownReductionPerLevel: -0.01,
		DamageModPerLevel:         0.05,
		InventorySize:             200,
		InitialMinionOffset:       40,
	}
	currentWorldConfig = WorldConfig{
		ArenaWidth:      6000.0,
		ArenaHeight:     6000.0,
		GridSize:        60,
		CellSize:        100.0,
		TickRate:        60,
		InputBufferSize: 4096,
		NextIDStart:     100,
	}
}

var ConfigReader func(name string) ([]byte, error) = os.ReadFile

func loadJSONFile(path string, target interface{}) error {
	data, err := ConfigReader(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}

func LoadMobsConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentMobsConfig); err != nil {
		return err
	}
	log.Printf("Loaded %d mob types from %s", len(currentMobsConfig.Types), path)
	return nil
}

func LoadBossesConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentBossesConfig); err != nil {
		return err
	}
	log.Printf("Loaded %d boss types from %s", len(currentBossesConfig.Types), path)
	return nil
}

func LoadRarityConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentRarityConfig); err != nil {
		return err
	}
	log.Printf("Loaded rarity config from %s", path)
	return nil
}

func LoadMinionConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentMinionConfig); err != nil {
		return err
	}
	log.Printf("Loaded minion config from %s", path)
	return nil
}

func LoadCombatConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentCombatConfig); err != nil {
		return err
	}
	log.Printf("Loaded combat config from %s", path)
	return nil
}

func LoadPlayerConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentPlayerConfig); err != nil {
		return err
	}
	log.Printf("Loaded player config from %s", path)
	return nil
}

func LoadSpawnConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentSpawnConfig); err != nil {
		return err
	}
	log.Printf("Loaded spawn config from %s", path)
	return nil
}

func LoadWorldConfig(path string) error {
	gameConfigMu.Lock()
	defer gameConfigMu.Unlock()
	if err := loadJSONFile(path, &currentWorldConfig); err != nil {
		return err
	}
	log.Printf("Loaded world config from %s", path)
	return nil
}

func GetMobsConfig() MobsConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentMobsConfig
}

func GetMobTypeConfig(mobType uint8) (MobTypeConfig, bool) {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	cfg, ok := currentMobsConfig.Types[strconv.Itoa(int(mobType))]
	return cfg, ok
}

func GetBossesConfig() BossesConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentBossesConfig
}

func GetBossTypeConfig(bossType uint8) (BossTypeConfig, bool) {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	cfg, ok := currentBossesConfig.Types[strconv.Itoa(int(bossType))]
	return cfg, ok
}

func GetRarityConfig() RarityConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentRarityConfig
}

func GetRarityMultiplier(rarity uint8) RarityMultiplier {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	if m, ok := currentRarityConfig.Multipliers[strconv.Itoa(int(rarity))]; ok {
		return m
	}
	return RarityMultiplier{HP: 1, Damage: 1, XP: 1, Radius: 1, Speed: 1}
}

func GetMinionConfig() MinionConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentMinionConfig
}

func GetCombatConfig() CombatConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentCombatConfig
}

func GetPlayerConfig() PlayerConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentPlayerConfig
}

func GetSpawnConfig() SpawnConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentSpawnConfig
}

func GetWorldConfig() WorldConfig {
	gameConfigMu.RLock()
	defer gameConfigMu.RUnlock()
	return currentWorldConfig
}

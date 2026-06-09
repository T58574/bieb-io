package game

import (
	"log"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	configDir := "../../config/"
	_ = LoadWorldConfig(configDir + "world.json")
	_ = LoadItemsConfig(configDir + "items.json")
	_ = LoadClassesConfig(configDir + "classes.json")
	_ = LoadUpgradesConfig(configDir + "upgrades.json")
	_ = LoadWaveConfig(configDir + "waves.json")
	_ = LoadLootConfig(configDir + "loot_tables.json")
	_ = LoadMobsConfig(configDir + "mobs.json")
	_ = LoadBossesConfig(configDir + "bosses.json")
	_ = LoadRarityConfig(configDir + "rarity.json")
	_ = LoadMinionConfig(configDir + "minions.json")
	_ = LoadCombatConfig(configDir + "combat.json")
	_ = LoadPlayerConfig(configDir + "player.json")
	_ = LoadSpawnConfig(configDir + "spawn.json")
	log.Println("Test configs loaded from", configDir)
	os.Exit(m.Run())
}
func TestGameWorld(t *testing.T) {
	w := NewGameWorld()
	p := w.AddPlayer(1, "test", 0)
	if p == nil {
		t.Fatal("player not added")
	}

	w.Tick(0.016)
	if p.Pos.X == 0 || p.Pos.Y == 0 {
		t.Errorf("invalid player positioning")
	}
}

func TestRemovePlayer(t *testing.T) {
	w := NewGameWorld()
	p := w.AddPlayer(1, "test_remove", 0)

	if len(w.Players) != 1 {
		t.Fatalf("expected 1 player, got %d", len(w.Players))
	}

	if len(w.Minions) != 1 {
		t.Fatalf("expected 1 minion spawned on add player, got %d", len(w.Minions))
	}

	if len(p.MinionIDs) != 1 {
		t.Fatalf("expected 1 minion ID in player, got %d", len(p.MinionIDs))
	}

	w.RemovePlayer(1)

	if len(w.Players) != 0 {
		t.Errorf("expected 0 players after remove, got %d", len(w.Players))
	}

	if len(w.Minions) != 0 {
		t.Errorf("expected 0 minions after remove, got %d", len(w.Minions))
	}

	w.RemovePlayer(999)
}

func TestWaveSpawning(t *testing.T) {
	w := NewGameWorld()
	_ = w.AddPlayer(1, "tester", 0)
	w.WavePauseTimer = 0.0

	w.Tick(0.016)
	if !w.WaveActive {
		t.Fatal("expected wave to be active")
	}
	if w.WaveNumber != 1 {
		t.Fatalf("expected wave 1, got %d", w.WaveNumber)
	}

	w.Tick(0.016)
	spawnCfg := GetSpawnConfig()
	expectedPackSize := spawnCfg.PackSize.Base + 1*spawnCfg.PackSize.PerWave
	if len(w.Mobs) != expectedPackSize {
		t.Fatalf("expected %d mobs spawned on tick 1, got %d", expectedPackSize, len(w.Mobs))
	}

	w.Tick(0.016)
	if len(w.Mobs) != expectedPackSize {
		t.Fatalf("expected mob count to stay %d, got %d", expectedPackSize, len(w.Mobs))
	}
}

func TestResetOnRejoin(t *testing.T) {
	w := NewGameWorld()
	p1 := w.AddPlayer(1, "p1", 0)
	p1.Alive = false
	w.WaveNumber = 5
	p2 := w.AddPlayer(2, "p2", 0)
	if p2 == nil {
		t.Fatal("failed to add second player")
	}
	if w.WaveNumber != 0 {
		t.Errorf("expected WaveNumber to reset to 0, got %d", w.WaveNumber)
	}
}

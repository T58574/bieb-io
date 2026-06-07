package game

import (
	"testing"
)

func TestGameWorld(t *testing.T) {
	w := NewGameWorld()
	p := w.AddPlayer(1, "test")
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
	p := w.AddPlayer(1, "test_remove")

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
	_ = w.AddPlayer(1, "tester")
	w.WavePauseTimer = 0.0

	w.Tick(0.016)
	if !w.WaveActive {
		t.Fatal("expected wave to be active")
	}
	if w.WaveNumber != 1 {
		t.Fatalf("expected wave 1, got %d", w.WaveNumber)
	}
	if len(w.Mobs) != 0 {
		t.Fatalf("expected 0 mobs on wave start tick, got %d", len(w.Mobs))
	}

	w.Tick(0.016)
	if len(w.Mobs) == 0 {
		t.Fatal("expected mobs to spawn on tick 1")
	}

	mobsCountAfterSpawn := len(w.Mobs)
	w.Tick(0.016)
	if len(w.Mobs) != mobsCountAfterSpawn {
		t.Fatalf("expected mob count to stay %d, got %d", mobsCountAfterSpawn, len(w.Mobs))
	}
}


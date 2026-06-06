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

	w.spawnMobCluster()
	if len(w.Mobs) == 0 {
		t.Errorf("mob not spawned")
	}

	w.Tick(0.016)
	if p.Pos.X == 0 || p.Pos.Y == 0 {
		t.Errorf("invalid player positioning")
	}
}

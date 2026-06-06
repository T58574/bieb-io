package game

import (
	"testing"
	"time"
)

func TestGameWorld(t *testing.T) {
	w := NewGameWorld()
	p := w.AddPlayer(1, "test")
	if p == nil {
		t.Fatal("player not added")
	}

	// w.spawnMobCluster()
	// if len(w.Mobs) == 0 {
	// 	t.Errorf("mob not spawned")
	// }

	w.Tick(0.016)
	if p.Pos.X == 0 || p.Pos.Y == 0 {
		t.Errorf("invalid player positioning")
	}
}

func TestUpdateInput(t *testing.T) {
	w := NewGameWorld()

	id := uint16(123)
	keys := uint8(0x0F)
	angle := float32(1.5)
	upgradeSelect := uint8(2)

	w.UpdateInput(id, keys, angle, upgradeSelect)

	select {
	case event := <-w.inputChan:
		if event.PlayerID != id {
			t.Errorf("Expected PlayerID %d, got %d", id, event.PlayerID)
		}
		if event.Keys != keys {
			t.Errorf("Expected Keys %d, got %d", keys, event.Keys)
		}
		if event.Angle != angle {
			t.Errorf("Expected Angle %f, got %f", angle, event.Angle)
		}
		if event.Upgrade != upgradeSelect {
			t.Errorf("Expected Upgrade %d, got %d", upgradeSelect, event.Upgrade)
		}
	default:
		t.Errorf("Expected an event in inputChan, but it was empty")
	}
}

func TestUpdateInput_ChannelFull(t *testing.T) {
	w := NewGameWorld()

	// Fill the channel dynamically to its capacity
	for {
		select {
		case w.inputChan <- InputEvent{}:
			// Successfully added an event
		default:
			// Channel is full, break out
			goto Full
		}
	}
Full:

	// Try to add another event when the channel is full
	// It should not block and just drop the event

	// Create a channel to signal completion to avoid test hanging if it blocks
	done := make(chan struct{})
	go func() {
		w.UpdateInput(uint16(1), uint8(0), float32(0.0), uint8(0))
		close(done)
	}()

	select {
	case <-done:
		// Success, it didn't block
	case <-time.After(time.Second):
		t.Errorf("UpdateInput blocked when the channel was full")
	}
}

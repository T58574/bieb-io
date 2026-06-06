package protocol

import (
	"math"
	"testing"
)

func TestWelcome(t *testing.T) {
	playerID := uint16(42)
	w := float32(2000.0)
	h := float32(1500.0)

	buf := EncodeWelcome(playerID, w, h)
	if buf[0] != 1 {
		t.Errorf("opcode expected 1, got %d", buf[0])
	}
	if len(buf) != 11 {
		t.Errorf("expected len 11, got %d", len(buf))
	}
}

func TestJoin(t *testing.T) {
	username := "antigravity"
	payload := make([]byte, 2+len(username))
	payload[0] = 1
	payload[1] = uint8(len(username))
	copy(payload[2:], []byte(username))

	decoded, err := DecodeJoin(payload)
	if err != nil {
		t.Fatal(err)
	}
	if decoded != username {
		t.Errorf("expected %s, got %s", username, decoded)
	}
}

func TestInput(t *testing.T) {
	payload := make([]byte, 7)
	payload[0] = 2
	payload[1] = 0x05
	bits := math.Float32bits(1.57)
	payload[2] = byte(bits)
	payload[3] = byte(bits >> 8)
	payload[4] = byte(bits >> 16)
	payload[5] = byte(bits >> 24)
	payload[6] = 3

	input, err := DecodeInput(payload)
	if err != nil {
		t.Fatal(err)
	}
	if input.Keys != 0x05 {
		t.Errorf("keys mismatch")
	}
	if math.Abs(float64(input.MouseAngle-1.57)) > 1e-4 {
		t.Errorf("angle mismatch")
	}
	if input.UpgradeSelect != 3 {
		t.Errorf("upgrade mismatch")
	}
}

func TestWorldState(t *testing.T) {
	entities := []EntityState{
		{
			ID:        1,
			Type:      0,
			Subtype:   2,
			X:         100.5,
			Y:         200.75,
			Angle:     0.78,
			Health:    100,
			MaxHealth: 100,
			Radius:    20,
		},
	}

	removedIDs := []uint16{5, 10}

	buf := EncodeWorldState(10, 50, 100, 5, 250, 80, 100, 7, 0, 0, 1, entities, removedIDs)
	if buf[0] != 2 {
		t.Errorf("expected opcode 2")
	}
	if len(buf) != 38+26+4 {
		t.Errorf("expected len %d, got %d", 38+26+4, len(buf))
	}
}

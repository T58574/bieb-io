package protocol

import (
	"encoding/binary"
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
	validUsername := "antigravity"
	payload := make([]byte, 2+len(validUsername))
	payload[0] = 1
	payload[1] = uint8(len(validUsername))
	copy(payload[2:], []byte(validUsername))

	decoded, err := DecodeJoin(payload)
	if err != nil {
		t.Fatal(err)
	}
	if decoded != validUsername {
		t.Errorf("expected %s, got %s", validUsername, decoded)
	}

	// Test invalid characters
	invalidUsername := "hello world"
	invalidPayload := make([]byte, 2+len(invalidUsername))
	invalidPayload[0] = 1
	invalidPayload[1] = uint8(len(invalidUsername))
	copy(invalidPayload[2:], []byte(invalidUsername))

	_, err = DecodeJoin(invalidPayload)
	if err == nil {
		t.Errorf("expected error for invalid characters, got nil")
	} else if err.Error() != "invalid characters in username" {
		t.Errorf("expected 'invalid characters in username', got '%s'", err.Error())
	}

	// Test too long username
	longUsername := "averylongusernamethatshouldfail"
	longPayload := make([]byte, 2+len(longUsername))
	longPayload[0] = 1
	longPayload[1] = uint8(len(longUsername))
	copy(longPayload[2:], []byte(longUsername))

	_, err = DecodeJoin(longPayload)
	if err == nil {
		t.Errorf("expected error for too long username, got nil")
	} else if err.Error() != "invalid username length" {
		t.Errorf("expected 'invalid username length', got '%s'", err.Error())
	}

	// Test empty username
	emptyPayload := make([]byte, 2)
	emptyPayload[0] = 1
	emptyPayload[1] = 0

	_, err = DecodeJoin(emptyPayload)
	if err == nil {
		t.Errorf("expected error for empty username, got nil")
	} else if err.Error() != "invalid username length" {
		t.Errorf("expected 'invalid username length', got '%s'", err.Error())
	}
}

func TestInput(t *testing.T) {
	payload := make([]byte, 8)
	payload[0] = 2
	payload[1] = 0x05
	bits := math.Float32bits(1.57)
	payload[2] = byte(bits)
	payload[3] = byte(bits >> 8)
	payload[4] = byte(bits >> 16)
	payload[5] = byte(bits >> 24)
	payload[6] = 3
	payload[7] = 4

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
	if input.DeleteSlotSelect != 4 {
		t.Errorf("delete slot mismatch")
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

	buf := EncodeWorldState(10, 50, 100, 5, 250, 80, 100, 7, make([]byte, 24), 1, 0, 0, 0, make([]byte, 200), entities, removedIDs)
	if buf[0] != 2 {
		t.Errorf("expected opcode 2")
	}
	if len(buf) != 257+26+4 {
		t.Errorf("expected len %d, got %d", 257+26+4, len(buf))
	}
}

func TestEncodeGameOver(t *testing.T) {
	score := uint32(12345)
	wave := uint32(10)

	buf := EncodeGameOver(score, wave)

	if len(buf) != 9 {
		t.Errorf("expected length 9, got %d", len(buf))
	}

	if buf[0] != 4 {
		t.Errorf("expected opcode 4, got %d", buf[0])
	}

	decodedScore := binary.LittleEndian.Uint32(buf[1:5])
	if decodedScore != score {
		t.Errorf("expected score %d, got %d", score, decodedScore)
	}

	decodedWave := binary.LittleEndian.Uint32(buf[5:9])
	if decodedWave != wave {
		t.Errorf("expected wave %d, got %d", wave, decodedWave)
	}
}

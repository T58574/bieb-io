package protocol

import (
	"encoding/binary"
	"errors"
	"math"
	"regexp"
)

var validUsername = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,16}$`)

type EntityState struct {
	ID         uint16
	Type       uint8
	Subtype    uint8
	X          float32
	Y          float32
	Angle      float32
	Health     uint16
	MaxHealth  uint16
	Radius     uint16
	StateFlags uint32
}

type ClientInput struct {
	Keys             uint8
	MouseAngle       float32
	UpgradeSelect    uint8
	DeleteSlotSelect uint8
}

func EncodeWelcome(playerID uint16, arenaWidth, arenaHeight float32) []byte {
	buf := make([]byte, 11)
	buf[0] = 1
	binary.LittleEndian.PutUint16(buf[1:3], playerID)
	binary.LittleEndian.PutUint32(buf[3:7], math.Float32bits(arenaWidth))
	binary.LittleEndian.PutUint32(buf[7:11], math.Float32bits(arenaHeight))
	return buf
}

func EncodeWorldState(tick uint32, xp, maxXP uint32, level uint16, score uint32, health, maxHealth uint16, upgradePoints uint8, statsPack1, statsPack2 uint32, waveNumber uint16, card1, card2, card3 uint8, inventory []uint8, entities []EntityState, removedIDs []uint16) []byte {
	count := len(entities)
	removedCount := len(removedIDs)
	bufSize := 241 + count*26 + removedCount*2
	buf := make([]byte, bufSize)
	buf[0] = 2
	binary.LittleEndian.PutUint32(buf[1:5], tick)
	binary.LittleEndian.PutUint32(buf[5:9], xp)
	binary.LittleEndian.PutUint32(buf[9:13], maxXP)
	binary.LittleEndian.PutUint16(buf[13:15], level)
	binary.LittleEndian.PutUint32(buf[15:19], score)
	binary.LittleEndian.PutUint16(buf[19:21], health)
	binary.LittleEndian.PutUint16(buf[21:23], maxHealth)
	buf[23] = upgradePoints
	binary.LittleEndian.PutUint32(buf[24:28], statsPack1)
	binary.LittleEndian.PutUint32(buf[28:32], statsPack2)
	binary.LittleEndian.PutUint16(buf[32:34], waveNumber)
	binary.LittleEndian.PutUint16(buf[34:36], uint16(count))
	buf[36] = card1
	buf[37] = card2
	buf[38] = card3
	for i := 0; i < 200; i++ {
		if i < len(inventory) {
			buf[39+i] = inventory[i]
		} else {
			buf[39+i] = 0
		}
	}
	binary.LittleEndian.PutUint16(buf[239:241], uint16(removedCount))

	offset := 241
	for i := 0; i < count; i++ {
		ent := &entities[i]
		binary.LittleEndian.PutUint16(buf[offset:offset+2], ent.ID)
		buf[offset+2] = ent.Type
		buf[offset+3] = ent.Subtype
		binary.LittleEndian.PutUint32(buf[offset+4:offset+8], math.Float32bits(ent.X))
		binary.LittleEndian.PutUint32(buf[offset+8:offset+12], math.Float32bits(ent.Y))
		binary.LittleEndian.PutUint32(buf[offset+12:offset+16], math.Float32bits(ent.Angle))
		binary.LittleEndian.PutUint16(buf[offset+16:offset+18], ent.Health)
		binary.LittleEndian.PutUint16(buf[offset+18:offset+20], ent.MaxHealth)
		binary.LittleEndian.PutUint16(buf[offset+20:offset+22], ent.Radius)
		binary.LittleEndian.PutUint32(buf[offset+22:offset+26], ent.StateFlags)
		offset += 26
	}

	for i := 0; i < removedCount; i++ {
		binary.LittleEndian.PutUint16(buf[offset:offset+2], removedIDs[i])
		offset += 2
	}

	return buf
}

func EncodeGameOver(score uint32, wave uint32) []byte {
	buf := make([]byte, 9)
	buf[0] = 4
	binary.LittleEndian.PutUint32(buf[1:5], score)
	binary.LittleEndian.PutUint32(buf[5:9], wave)
	return buf
}

func DecodeJoin(buf []byte) (string, error) {
	if len(buf) < 2 {
		return "", errors.New("invalid join size")
	}
	usernameLen := int(buf[1])
	if usernameLen == 0 || usernameLen > 16 {
		return "", errors.New("invalid username length")
	}
	if len(buf) < 2+usernameLen {
		return "", errors.New("invalid join size for username")
	}
	username := string(buf[2 : 2+usernameLen])
	if !validUsername.MatchString(username) {
		return "", errors.New("invalid characters in username")
	}
	return username, nil
}

func DecodeInput(buf []byte) (ClientInput, error) {
	if len(buf) < 8 {
		return ClientInput{}, errors.New("invalid input size")
	}
	var input ClientInput
	input.Keys = buf[1]
	input.MouseAngle = math.Float32frombits(binary.LittleEndian.Uint32(buf[2:6]))
	input.UpgradeSelect = buf[6]
	input.DeleteSlotSelect = buf[7]
	return input, nil
}

func DecodeUpgradeClass(buf []byte) (uint8, error) {
	if len(buf) < 2 {
		return 0, errors.New("invalid upgrade class size")
	}
	return buf[1], nil
}

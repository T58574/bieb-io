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

type WorldStateParams struct {
	Tick          uint32
	XP            uint32
	MaxXP         uint32
	Level         uint16
	Score         uint32
	Health        uint16
	MaxHealth     uint16
	UpgradePoints uint8
	UpgradeLevels []uint8
	WaveNumber    uint16
	Card1         uint8
	Card2         uint8
	Card3         uint8
	Inventory     []uint8
}

func EncodeWorldState(params WorldStateParams, entities []EntityState, removedIDs []uint16) []byte {
	count := len(entities)
	removedCount := len(removedIDs)
	bufSize := 258 + count*26 + removedCount*2
	buf := make([]byte, bufSize)
	buf[0] = 2
	binary.LittleEndian.PutUint32(buf[1:5], params.Tick)
	binary.LittleEndian.PutUint32(buf[5:9], params.XP)
	binary.LittleEndian.PutUint32(buf[9:13], params.MaxXP)
	binary.LittleEndian.PutUint16(buf[13:15], params.Level)
	binary.LittleEndian.PutUint32(buf[15:19], params.Score)
	binary.LittleEndian.PutUint16(buf[19:21], params.Health)
	binary.LittleEndian.PutUint16(buf[21:23], params.MaxHealth)
	buf[23] = params.UpgradePoints
	for i := 0; i < 25; i++ {
		if i < len(params.UpgradeLevels) {
			buf[24+i] = params.UpgradeLevels[i]
		} else {
			buf[24+i] = 0
		}
	}
	binary.LittleEndian.PutUint16(buf[49:51], params.WaveNumber)
	binary.LittleEndian.PutUint16(buf[51:53], uint16(count))
	buf[53] = params.Card1
	buf[54] = params.Card2
	buf[55] = params.Card3
	for i := 0; i < 200; i++ {
		if i < len(params.Inventory) {
			buf[56+i] = params.Inventory[i]
		} else {
			buf[56+i] = 0
		}
	}
	binary.LittleEndian.PutUint16(buf[256:258], uint16(removedCount))

	offset := 258
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

func DecodeJoin(buf []byte) (string, uint8, error) {
	if len(buf) < 2 {
		return "", 0, errors.New("invalid join size")
	}
	usernameLen := int(buf[1])
	if usernameLen == 0 || usernameLen > 16 {
		return "", 0, errors.New("invalid username length")
	}
	if len(buf) < 3+usernameLen {
		return "", 0, errors.New("invalid join size for username and class")
	}
	username := string(buf[2 : 2+usernameLen])
	if !validUsername.MatchString(username) {
		return "", 0, errors.New("invalid characters in username")
	}
	classId := buf[2+usernameLen]
	return username, classId, nil
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

package game

import (
	"encoding/json"
	"log"
)

type WaveConfig struct {
	BaseDuration            float64 `json:"base_duration"`
	DurationMultiplier      float64 `json:"duration_multiplier"`
	DifficultyMultiplier    float64 `json:"difficulty_multiplier"`
	MobCountMultiplier      float64 `json:"mob_count_multiplier"`
	BaseMobCount            float64 `json:"base_mob_count"`
	SpeedDifficultyExponent float64 `json:"speed_difficulty_exponent"`
}

var CurrentWaveConfig WaveConfig

func init() {
	CurrentWaveConfig = WaveConfig{
		BaseDuration:            60.0,
		DurationMultiplier:      0.99,
		DifficultyMultiplier:    1.03,
		MobCountMultiplier:      1.03,
		BaseMobCount:            70.0,
		SpeedDifficultyExponent: 0.2,
	}
}

func LoadWaveConfig(path string) error {
	data, err := ConfigReader(path)
	if err != nil {
		return err
	}

	if err := json.Unmarshal(data, &CurrentWaveConfig); err != nil {
		return err
	}

	log.Printf("Loaded wave config from %s", path)
	return nil
}

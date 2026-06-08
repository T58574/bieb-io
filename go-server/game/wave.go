package game

func (w *GameWorld) hasAlivePlayers() bool {
	for _, p := range w.Players {
		if p.Alive {
			return true
		}
	}
	return false
}

func (w *GameWorld) startNextWave() {
	w.WaveNumber++
	w.WaveActive = true

	if w.WaveNumber > 1 {
		w.WaveDuration *= CurrentWaveConfig.DurationMultiplier
		w.WaveDifficulty *= CurrentWaveConfig.DifficultyMultiplier
		if w.rand.Float64() < 0.15 {
			w.WaveMutation = uint8(w.rand.Intn(6)) + 1
		} else {
			w.WaveMutation = 0
		}
	} else {
		w.WaveDuration = CurrentWaveConfig.BaseDuration
		w.WaveDifficulty = 1.0
		w.WaveMutation = 0
	}

	w.WaveTimeLeft = w.WaveDuration

	targetMobCount := CurrentWaveConfig.BaseMobCount
	for i := 1; i < int(w.WaveNumber); i++ {
		targetMobCount *= CurrentWaveConfig.MobCountMultiplier
	}
	w.WaveMobsLeft = int(targetMobCount)

	spawnCfg := GetSpawnConfig()
	spawnInterval := spawnCfg.SpawnInterval.Base - float64(w.WaveNumber)*spawnCfg.SpawnInterval.ReductionPerWave
	if spawnInterval < spawnCfg.SpawnInterval.Minimum {
		spawnInterval = spawnCfg.SpawnInterval.Minimum
	}
	w.WaveSpawnTimer = spawnInterval
	w.spawnBossesForWave()
}

func (w *GameWorld) updateWaveSystem(dt float64) {
	if !w.hasAlivePlayers() {
		return
	}

	spawnCfg := GetSpawnConfig()

	if !w.WaveActive {
		w.WavePauseTimer -= dt
		if w.WavePauseTimer <= 0 {
			w.startNextWave()
		}
		return
	}

	w.WaveTimeLeft -= dt

	if w.WaveTimeLeft <= 0 {
		if w.hasAliveBoss() {
			w.WaveTimeLeft = 0
		} else {
			w.startNextWave()
			return
		}
	}

	maxAlive := spawnCfg.MaxAlive.Base + int(w.WaveNumber)*spawnCfg.MaxAlive.PerWave
	if maxAlive > spawnCfg.MaxAlive.Cap {
		maxAlive = spawnCfg.MaxAlive.Cap
	}

	if w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive {
		w.WaveSpawnTimer += dt

		spawnInterval := spawnCfg.SpawnInterval.Base - float64(w.WaveNumber)*spawnCfg.SpawnInterval.ReductionPerWave
		if spawnInterval < spawnCfg.SpawnInterval.Minimum {
			spawnInterval = spawnCfg.SpawnInterval.Minimum
		}

		if w.WaveSpawnTimer >= spawnInterval {
			w.WaveSpawnTimer = 0

			packSize := spawnCfg.PackSize.Base + int(w.WaveNumber)*spawnCfg.PackSize.PerWave
			for i := 0; i < packSize && w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive; i++ {
				w.spawnSingleMob()
				w.WaveMobsLeft--
			}
		}
	}
}

func (w *GameWorld) hasAliveBoss() bool {
	for _, m := range w.Mobs {
		if m.Health > 0 {
			if _, isBoss := GetBossTypeConfig(m.Type); isBoss {
				return true
			}
		}
	}
	return false
}

func (w *GameWorld) GetWaveMutation() uint8 {
	return w.WaveMutation
}

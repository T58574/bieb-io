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
	} else {
		w.WaveDuration = CurrentWaveConfig.BaseDuration
		w.WaveDifficulty = 1.0
	}

	w.WaveTimeLeft = w.WaveDuration

	targetMobCount := CurrentWaveConfig.BaseMobCount
	for i := 1; i < int(w.WaveNumber); i++ {
		targetMobCount *= CurrentWaveConfig.MobCountMultiplier
	}
	w.WaveMobsLeft = int(targetMobCount)

	w.WaveSpawnTimer = 0
	w.spawnBossesForWave()
}

func (w *GameWorld) updateWaveSystem(dt float64) {
	if !w.hasAlivePlayers() {
		return
	}

	if !w.WaveActive {
		w.WavePauseTimer -= dt
		if w.WavePauseTimer <= 0 {
			w.startNextWave()
		}
		return
	}

	w.WaveTimeLeft -= dt

	if w.WaveTimeLeft <= 0 {
		w.startNextWave()
		return
	}

	maxAlive := 60 + int(w.WaveNumber)*40
	if maxAlive > 1000000 {
		maxAlive = 1000000
	}

	if w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive {
		w.WaveSpawnTimer += dt

		spawnInterval := w.WaveTimeLeft / float64(w.WaveMobsLeft)
		if spawnInterval > 1.0 {
			spawnInterval = 1.0
		}
		if spawnInterval < 0.1 {
			spawnInterval = 0.1
		}

		if w.WaveSpawnTimer >= spawnInterval {
			w.WaveSpawnTimer = 0

			spawnBatch := 1
			if spawnInterval <= 0.1 {
				spawnBatch = 3
			}

			for i := 0; i < spawnBatch && w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive; i++ {
				w.spawnSingleMob()
				w.WaveMobsLeft--
			}
		}
	}
}

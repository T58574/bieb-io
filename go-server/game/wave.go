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
	w.WaveTicks = 0
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

	w.WaveTicks++
	if w.WaveTicks == w.WaveNumber {
		for w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive {
			w.spawnSingleMob()
			w.WaveMobsLeft--
		}
	}
}

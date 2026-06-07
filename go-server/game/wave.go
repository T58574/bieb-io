package game

func (w *GameWorld) hasAlivePlayers() bool {
	for _, p := range w.Players {
		if p.Alive {
			return true
		}
	}
	return false
}

func (w *GameWorld) updateWaveSystem(dt float64) {
	if !w.hasAlivePlayers() {
		return
	}
	if !w.WaveActive {
		w.WavePauseTimer -= dt
		if w.WavePauseTimer <= 0 {
			w.WaveNumber++
			w.WaveActive = true
			w.WaveMobsLeft = 40 + int(w.WaveNumber)*30
			w.WaveSpawnTimer = 0
			w.spawnBossesForWave()
		}
		return
	}
	if w.WaveMobsLeft <= 0 && len(w.Mobs) == 0 {
		w.WaveActive = false
		if (w.WaveNumber+1)%5 == 0 {
			w.WavePauseTimer = 3.0
		} else {
			w.WavePauseTimer = 1.0
		}
		return
	}
	maxAlive := 60 + int(w.WaveNumber)*40
	if maxAlive > 400 {
		maxAlive = 400
	}
	if w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive {
		w.WaveSpawnTimer += dt
		spawnInterval := 0.6 - float64(w.WaveNumber)*0.02
		if spawnInterval < 0.15 {
			spawnInterval = 0.15
		}
		if w.WaveSpawnTimer >= spawnInterval {
			w.WaveSpawnTimer = 0
			spawnBatch := 1 + int(w.WaveNumber)/6
			if spawnBatch > 3 {
				spawnBatch = 3
			}
			for i := 0; i < spawnBatch && w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive; i++ {
				w.spawnSingleMob()
				w.WaveMobsLeft--
			}
		}
	}
}

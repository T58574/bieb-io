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
		w.WavePauseTimer = 3.0
		return
	}
	maxAlive := 60 + int(w.WaveNumber)*40
	if maxAlive > 400 {
		maxAlive = 400
	}
	if w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive {
		w.WaveSpawnTimer += dt
		spawnInterval := 0.25 - float64(w.WaveNumber)*0.015
		if spawnInterval < 0.05 {
			spawnInterval = 0.05
		}
		if w.WaveSpawnTimer >= spawnInterval {
			w.WaveSpawnTimer = 0
			spawnBatch := 1 + int(w.WaveNumber)/2
			if spawnBatch > 5 {
				spawnBatch = 5
			}
			for i := 0; i < spawnBatch && w.WaveMobsLeft > 0 && len(w.Mobs) < maxAlive; i++ {
				w.spawnSingleMob()
				w.WaveMobsLeft--
			}
		}
	}
}

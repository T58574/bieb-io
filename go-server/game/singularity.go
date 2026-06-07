package game

import (
	"go-server/physics"
)

type Singularity struct {
	ID         uint16
	Pos        physics.Vector2D
	Radius     float64
	CoreRadius float64
	Force      float64
	Damage     float64
	Duration   float64
}

func (w *GameWorld) updateSingularities(dt float64) {
	for id, s := range w.Singularities {
		s.Duration -= dt
		if s.Duration <= 0 {
			w.RemovedEntityIDs = append(w.RemovedEntityIDs, id)
			delete(w.Singularities, id)
			continue
		}

		// Apply to Mobs
		for _, m := range w.Mobs {
			diff := s.Pos.Sub(m.Pos)
			distSq := diff.LengthSq()
			if distSq < s.Radius*s.Radius {
				dist := diff.Length()
				if dist > 0 {
					dir := diff.Mul(1.0 / dist)
					// Inverse square or linear dropoff? Linear is fine.
					forceMagnitude := s.Force * (1.0 - dist/s.Radius)
					m.Vel = m.Vel.Add(dir.Mul(forceMagnitude * dt))

					if dist < s.CoreRadius {
						m.Health -= s.Damage * dt
						if m.Health <= 0 {
							m.Health = 0 // Will be removed in updateMobs or collision
						}
					}
				}
			}
		}

		// Apply to Players
		for _, p := range w.Players {
			if !p.Alive {
				continue
			}
			diff := s.Pos.Sub(p.Pos)
			distSq := diff.LengthSq()
			if distSq < s.Radius*s.Radius {
				dist := diff.Length()
				if dist > 0 {
					dir := diff.Mul(1.0 / dist)
					forceMagnitude := s.Force * (1.0 - dist/s.Radius)
					p.Vel = p.Vel.Add(dir.Mul(forceMagnitude * dt))

					if dist < s.CoreRadius {
						p.Health -= s.Damage * dt
						if p.Health <= 0 {
							p.Alive = false // Die logic is typically handled elsewhere, but reducing health is safe here
						}
					}
				}
			}
		}

		// Apply to LootDrops
		for _, ld := range w.LootDrops {
			diff := s.Pos.Sub(ld.Pos)
			distSq := diff.LengthSq()
			if distSq < s.Radius*s.Radius {
				dist := diff.Length()
				if dist > 0 {
					dir := diff.Mul(1.0 / dist)
					forceMagnitude := s.Force * (1.0 - dist/s.Radius)
					ld.Vel = ld.Vel.Add(dir.Mul(forceMagnitude * dt))
				}
			}
		}
	}
}

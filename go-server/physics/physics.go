package physics

import "math"

type Vector2D struct {
	X float64
	Y float64
}

// --- СТАРЫЙ API (для совместимости, чтобы всё не горело) ---

func (v Vector2D) Add(o Vector2D) Vector2D {
	return Vector2D{v.X + o.X, v.Y + o.Y}
}

func (v Vector2D) Sub(o Vector2D) Vector2D {
	return Vector2D{v.X - o.X, v.Y - o.Y}
}

func (v Vector2D) Mul(s float64) Vector2D {
	return Vector2D{v.X * s, v.Y * s}
}

func (v Vector2D) LengthSq() float64 {
	return v.X*v.X + v.Y*v.Y
}

func (v Vector2D) Length() float64 {
	return math.Sqrt(v.X*v.X + v.Y*v.Y)
}

func (v Vector2D) Normalize() Vector2D {
	l := v.Length()
	if l == 0 {
		return Vector2D{0, 0}
	}
	return Vector2D{v.X / l, v.Y / l}
}

// --- НОВЫЙ API (для hot path в физике, без аллокаций) ---

func (v *Vector2D) SetSub(a, b Vector2D) {
	v.X = a.X - b.X
	v.Y = a.Y - b.Y
}

func (v Vector2D) Dot(o Vector2D) float64 {
	return v.X*o.X + v.Y*o.Y
}

func ResolveCircleCircle(p1, p2 *Vector2D, r1, r2 float64, v1, v2 *Vector2D, m1, m2 float64, bounce float64) bool {
	// Используем локальную переменную на стеке вместо вызова p2.Sub(*p1), который мог бы аллоцировать
	var delta Vector2D
	delta.SetSub(*p2, *p1)

	distSq := delta.LengthSq()
	minDist := r1 + r2
	if distSq >= minDist*minDist {
		return false
	}

	dist := math.Sqrt(distSq)
	if dist == 0 {
		return false
	}

	invDist := 1.0 / dist
	normal := Vector2D{delta.X * invDist, delta.Y * invDist}
	overlap := minDist - dist

	invMass1 := 0.0
	if m1 > 0 {
		invMass1 = 1.0 / m1
	}
	invMass2 := 0.0
	if m2 > 0 {
		invMass2 = 1.0 / m2
	}

	totalInvMass := invMass1 + invMass2
	if totalInvMass == 0 {
		return false
	}

	invMassSum := 1.0 / totalInvMass
	sep1 := overlap * invMass1 * invMassSum
	sep2 := overlap * invMass2 * invMassSum

	// Прямая модификация по указателям, никаких копирований
	p1.X -= normal.X * sep1
	p1.Y -= normal.Y * sep1
	p2.X += normal.X * sep2
	p2.Y += normal.Y * sep2

	relVel := Vector2D{v2.X - v1.X, v2.Y - v1.Y}
	velAlongNormal := relVel.Dot(normal)
	if velAlongNormal > 0 {
		return true
	}

	impulseScalar := -(1.0 + bounce) * velAlongNormal * invMassSum

	v1.X -= normal.X * impulseScalar * invMass1
	v1.Y -= normal.Y * impulseScalar * invMass1
	v2.X += normal.X * impulseScalar * invMass2
	v2.Y += normal.Y * impulseScalar * invMass2

	return true
}

func ResolveCircleBox(p *Vector2D, r float64, v *Vector2D, minX, minY, maxX, maxY float64, bounce float64) {
	if p.X-r < minX {
		p.X = minX + r
		v.X = -v.X * bounce
	} else if p.X+r > maxX {
		p.X = maxX - r
		v.X = -v.X * bounce
	}
	if p.Y-r < minY {
		p.Y = minY + r
		v.Y = -v.Y * bounce
	} else if p.Y+r > maxY {
		p.Y = maxY - r
		v.Y = -v.Y * bounce
	}
}
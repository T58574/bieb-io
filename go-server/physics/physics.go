package physics

import "math"

type Vector2D struct {
	X float64
	Y float64
}

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
	return math.Sqrt(v.LengthSq())
}

func (v Vector2D) Normalize() Vector2D {
	l := v.Length()
	if l == 0 {
		return Vector2D{0, 0}
	}
	return Vector2D{v.X / l, v.Y / l}
}

func ResolveCircleCircle(p1, p2 *Vector2D, r1, r2 float64, v1, v2 *Vector2D, m1, m2 float64, bounce float64) bool {
	delta := p2.Sub(*p1)
	distSq := delta.LengthSq()
	minDist := r1 + r2
	if distSq >= minDist*minDist {
		return false
	}
	dist := math.Sqrt(distSq)
	if dist == 0 {
		return false
	}
	normal := delta.Mul(1.0 / dist)
	overlap := minDist - dist

	totalMass := m1 + m2
	var sep1, sep2 float64
	if totalMass > 0 {
		sep1 = overlap * (m2 / totalMass)
		sep2 = overlap * (m1 / totalMass)
	} else {
		sep1 = overlap * 0.5
		sep2 = overlap * 0.5
	}
	*p1 = p1.Sub(normal.Mul(sep1))
	*p2 = p2.Add(normal.Mul(sep2))

	relVel := v2.Sub(*v1)
	velAlongNormal := relVel.X*normal.X + relVel.Y*normal.Y
	if velAlongNormal > 0 {
		return true
	}

	invMass1 := 0.0
	if m1 > 0 {
		invMass1 = 1.0 / m1
	}
	invMass2 := 0.0
	if m2 > 0 {
		invMass2 = 1.0 / m2
	}

	impulse := -(1.0 + bounce) * velAlongNormal / (invMass1 + invMass2)
	*v1 = v1.Sub(normal.Mul(impulse * invMass1))
	*v2 = v2.Add(normal.Mul(impulse * invMass2))
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

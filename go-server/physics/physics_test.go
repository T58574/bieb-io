package physics

import (
	"math"
	"testing"
)

func TestVectorOps(t *testing.T) {
	v1 := Vector2D{3, 4}
	if v1.Length() != 5 {
		t.Errorf("length error")
	}
	v2 := Vector2D{1, 2}
	v3 := v1.Add(v2)
	if v3.X != 4 || v3.Y != 6 {
		t.Errorf("add error")
	}
}

func TestResolveCircleCircle(t *testing.T) {
	p1 := Vector2D{0, 0}
	p2 := Vector2D{1.5, 0}
	v1 := Vector2D{1, 0}
	v2 := Vector2D{-1, 0}

	collided := ResolveCircleCircle(&p1, &p2, 1.0, 1.0, &v1, &v2, 0.5)
	if !collided {
		t.Errorf("expected collision")
	}
	if p1.X >= 0 {
		t.Errorf("expected separation of p1 to the left, got %f", p1.X)
	}
	if p2.X <= 1.5 {
		t.Errorf("expected separation of p2 to the right, got %f", p2.X)
	}
}

func TestResolveCircleBox(t *testing.T) {
	p := Vector2D{5, 5}
	v := Vector2D{-2, 0}
	ResolveCircleBox(&p, 6.0, &v, 0, 0, 100, 100, 0.5)
	if p.X != 6.0 {
		t.Errorf("expected X to be clipped to 6.0, got %f", p.X)
	}
	if math.Abs(v.X-1.0) > 1e-6 {
		t.Errorf("expected velocity bounce to flip, got %f", v.X)
	}
}

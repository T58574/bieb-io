package physics

import "testing"

var (
	sinkP1 Vector2D
	sinkP2 Vector2D
	sinkV1 Vector2D
	sinkV2 Vector2D
	sinkB  bool
)

func BenchmarkResolveCircleCircle(b *testing.B) {
	// Сдвигаем p2 в (0.5, 0.5) — теперь они жестко пересекаются
	p1 := Vector2D{X: 0, Y: 0}
	p2 := Vector2D{X: 0.5, Y: 0.5} 
	v1 := Vector2D{X: 1, Y: 1}
	v2 := Vector2D{X: -1, Y: -1}

	r1, r2 := 1.0, 1.0
	m1, m2 := 1.0, 1.0
	bounce := 0.5

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		// Сбрасываем координаты на КАЖДОЙ итерации
		p1.X, p1.Y = 0, 0
		p2.X, p2.Y = 0.5, 0.5
		v1.X, v1.Y = 1, 1
		v2.X, v2.Y = -1, -1

		sinkB = ResolveCircleCircle(&p1, &p2, r1, r2, &v1, &v2, m1, m2, bounce)
	}

	sinkP1 = p1
	sinkP2 = p2
	sinkV1 = v1
	sinkV2 = v2
}
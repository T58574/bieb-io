package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go-server/game"
	"go-server/protocol"
)

type Client struct {
	id     uint16
	conn   *websocket.Conn
	mu     sync.Mutex
	joined bool
}

func (c *Client) send(msg []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.WriteMessage(websocket.BinaryMessage, msg)
}

type GameServer struct {
	clients  map[uint16]*Client
	nextID   uint16
	mu       sync.RWMutex
	upgrader websocket.Upgrader
	world    *game.GameWorld
}

func NewGameServer() *GameServer {
	return &GameServer{
		clients: make(map[uint16]*Client),
		nextID:  1,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  2048,
			WriteBufferSize: 2048,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		world: game.NewGameWorld(),
	}
}

func (s *GameServer) handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}
	s.mu.Lock()
	id := s.nextID
	s.nextID++
	client := &Client{
		id:   id,
		conn: conn,
	}
	s.clients[id] = client
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, id)
		s.mu.Unlock()
		s.world.RemovePlayer(id)
		conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if len(msg) < 1 {
			continue
		}
		opcode := msg[0]
		if opcode == 1 {
			username, err := protocol.DecodeJoin(msg)
			if err == nil {
				s.world.AddPlayer(client.id, username)
				client.joined = true
				welcome := protocol.EncodeWelcome(client.id, float32(s.world.Width), float32(s.world.Height))
				_ = client.send(welcome)
			}
		} else if opcode == 2 {
			if client.joined {
				input, err := protocol.DecodeInput(msg)
				if err == nil {
					s.world.UpdateInput(client.id, input.Keys, input.MouseAngle, input.UpgradeSelect)
				}
			}
		}
	}
}

func (s *GameServer) startLoop() {
	ticker := time.NewTicker(time.Second / 60)
	defer ticker.Stop()
	var tick uint32
	for range ticker.C {
		s.world.Tick(1.0 / 60.0)
		tick++
		s.broadcastState(tick)
	}
}

func (s *GameServer) broadcastState(tick uint32) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.clients) == 0 {
		return
	}
	states := s.world.ExportState()

	for _, client := range s.clients {
		if !client.joined {
			continue
		}
		p, exists := s.world.Players[client.id]
		if !exists {
			continue
		}

		if !p.Alive {
			gameOverBuf := protocol.EncodeGameOver(p.Score, s.world.WaveNumber)
			_ = client.send(gameOverBuf)
			continue
		}

		statsPack1 := uint32(p.StatRegen) | uint32(p.StatMaxHP)<<8 | uint32(p.StatSpeed)<<16 | uint32(p.StatMinionDmg)<<24
		statsPack2 := uint32(p.StatMinionSpeed) | uint32(p.StatMinionHP)<<8 | uint32(p.StatMinionPierce)<<16 | uint32(p.StatMinionRegen)<<24

		stateBuf := protocol.EncodeWorldState(
			tick,
			p.XP,
			p.MaxXP,
			p.Level,
			p.Score,
			uint16(p.Health),
			uint16(p.MaxHealth),
			p.UpgradePoints,
			statsPack1,
			statsPack2,
			uint16(s.world.WaveNumber),
			states,
		)
		_ = client.send(stateBuf)
	}
}

func main() {
	server := NewGameServer()
	go server.startLoop()
	http.HandleFunc("/ws", server.handleConnection)
	fmt.Println("Server running on 0.0.0.0:8080")
	if err := http.ListenAndServe("0.0.0.0:8080", nil); err != nil {
		log.Fatal(err)
	}
}

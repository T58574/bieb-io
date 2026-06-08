package main

import (
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go-server/game"
	"go-server/protocol"
	"gopkg.in/natefinch/lumberjack.v2"
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

func checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}

	reqHostname := r.Host
	if host, _, err := net.SplitHostPort(reqHostname); err == nil {
		reqHostname = host
	}
	if u.Hostname() == reqHostname {
		return true
	}

	allowed := os.Getenv("ALLOWED_ORIGIN")
	if allowed != "" && origin == allowed {
		return true
	}

	return false
}

func NewGameServer() *GameServer {
	return &GameServer{
		clients: make(map[uint16]*Client),
		nextID:  1,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  2048,
			WriteBufferSize: 2048,
			CheckOrigin:     checkOrigin,
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
			username, classId, err := protocol.DecodeJoin(msg)
			if err == nil {
				s.world.AddPlayer(client.id, username, classId)
				client.joined = true
				welcome := protocol.EncodeWelcome(client.id, float32(s.world.Width), float32(s.world.Height))
				_ = client.send(welcome)
			}
		} else if opcode == 2 {
			if client.joined {
				input, err := protocol.DecodeInput(msg)
				if err == nil {
					s.world.UpdateInput(client.id, input.Keys, input.MouseAngle, input.UpgradeSelect, input.DeleteSlotSelect)
				}
			}
		} else if opcode == 5 {
			if client.joined {
				classID, err := protocol.DecodeUpgradeClass(msg)
				if err == nil {
					s.world.UpgradePlayerClass(client.id, classID)
				}
			}
		} else if opcode == 6 {
			if client.joined {
				s.world.TogglePause()
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
	removedIDs := s.world.GetRemovedIDs()

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

		upgradeLevels := p.GetUpgradeLevels()

		stateBuf := protocol.EncodeWorldState(
			protocol.WorldStateParams{
				Tick:          tick,
				XP:            p.XP,
				MaxXP:         p.MaxXP,
				Level:         p.Level,
				Score:         p.Score,
				Health:        uint16(p.Health),
				MaxHealth:     uint16(p.MaxHealth),
				UpgradePoints: p.UpgradePoints,
				UpgradeLevels: upgradeLevels,
				WaveNumber: func() uint16 {
					wv := uint16(s.world.WaveNumber)
					hasUpgrades := false
					for _, player := range s.world.Players {
						if player.Alive && player.UpgradePoints > 0 {
							hasUpgrades = true
							break
						}
					}
					if s.world.Paused || hasUpgrades {
						wv |= 0x8000
					}
					return wv
				}(),
				Card1:     p.CardChoices[0],
				Card2:     p.CardChoices[1],
				Card3:     p.CardChoices[2],
				Inventory: p.GetInventoryArray(),
			},
			states,
			removedIDs,
		)
		_ = client.send(stateBuf)
	}
	s.world.ClearRemovedIDs()
}

func main() {
	log.SetOutput(io.MultiWriter(os.Stdout, &lumberjack.Logger{
		Filename:   "logs/server.log",
		MaxSize:    10,
		MaxBackups: 3,
		MaxAge:     28,
		Compress:   true,
	}))

	configDir := "./config/"
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		configDir = "../config/"
	}

	if err := game.LoadWorldConfig(configDir + "world.json"); err != nil {
		log.Fatalf("Failed to load world config: %v", err)
	}

	if err := game.LoadItemsConfig(configDir + "items.json"); err != nil {
		log.Fatalf("Failed to load items config: %v", err)
	}

	if err := game.LoadClassesConfig(configDir + "classes.json"); err != nil {
		log.Fatalf("Failed to load classes config: %v", err)
	}

	if err := game.LoadUpgradesConfig(configDir + "upgrades.json"); err != nil {
		log.Fatalf("Failed to load upgrades config: %v", err)
	}

	if err := game.LoadWaveConfig(configDir + "waves.json"); err != nil {
		log.Fatalf("Failed to load wave config: %v", err)
	}

	if err := game.LoadLootConfig(configDir + "loot_tables.json"); err != nil {
		log.Fatalf("Failed to load loot config: %v", err)
	}

	if err := game.LoadMobsConfig(configDir + "mobs.json"); err != nil {
		log.Fatalf("Failed to load mobs config: %v", err)
	}

	if err := game.LoadBossesConfig(configDir + "bosses.json"); err != nil {
		log.Fatalf("Failed to load bosses config: %v", err)
	}

	if err := game.LoadRarityConfig(configDir + "rarity.json"); err != nil {
		log.Fatalf("Failed to load rarity config: %v", err)
	}

	if err := game.LoadMinionConfig(configDir + "minions.json"); err != nil {
		log.Fatalf("Failed to load minion config: %v", err)
	}

	if err := game.LoadCombatConfig(configDir + "combat.json"); err != nil {
		log.Fatalf("Failed to load combat config: %v", err)
	}

	if err := game.LoadPlayerConfig(configDir + "player.json"); err != nil {
		log.Fatalf("Failed to load player config: %v", err)
	}

	if err := game.LoadSpawnConfig(configDir + "spawn.json"); err != nil {
		log.Fatalf("Failed to load spawn config: %v", err)
	}

	clientDir := "./client"
	if _, err := os.Stat(clientDir); os.IsNotExist(err) {
		clientDir = "../ts-client/dist"
	}
	server := NewGameServer()
	go server.startLoop()
	http.HandleFunc("/ws", server.handleConnection)
	http.Handle("/", http.FileServer(http.Dir(clientDir)))
	log.Println("Server running on 0.0.0.0:8080")
	go func() {
		time.Sleep(100 * time.Millisecond)
		openBrowser("http://localhost:8080")
	}()
	if err := http.ListenAndServe("0.0.0.0:8080", nil); err != nil {
		log.Fatal(err)
	}
}

func openBrowser(targetURL string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", targetURL).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", targetURL).Start()
	case "darwin":
		err = exec.Command("open", targetURL).Start()
	}
	if err != nil {
		log.Println(err)
	}
}

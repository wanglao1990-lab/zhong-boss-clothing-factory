const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory game data store
const players = {};
const factories = {};

// Game constants
const CLOTHING_TYPES = {
  'white_tshirt': { name: '新手白T恤', level: 1, cost: 10, time: 60, revenue: 25, exp: 1 },
  'canvas_bag': { name: '纯色帆布包', level: 2, cost: 30, time: 300, revenue: 70, exp: 3 },
  'jeans': { name: '复古牛仔短裤', level: 3, cost: 100, time: 900, revenue: 220, exp: 8 },
  'striped_shirt': { name: '条纹海魂衫', level: 5, cost: 250, time: 3600, revenue: 550, exp: 20 },
  'floral_dress': { name: '碎花连衣裙', level: 7, cost: 500, time: 7200, revenue: 1100, exp: 45 }
};

// Player class
class Player {
  constructor(playerId, username) {
    this.id = playerId;
    this.username = username;
    this.level = 1;
    this.exp = 0;
    this.coins = 100;
    this.factory = new Factory();
  }

  addCoins(amount) {
    this.coins += amount;
  }

  addExp(amount) {
    this.exp += amount;
    this.checkLevelUp();
  }

  checkLevelUp() {
    const requiredExp = this.level * 100;
    if (this.exp >= requiredExp) {
      this.level += 1;
      this.exp = 0;
      this.factory.addMachine();
      return true;
    }
    return false;
  }
}

// Factory class
class Factory {
  constructor() {
    this.machines = [
      { id: 1, status: 'idle', clothing: null, timeRemaining: 0 },
      { id: 2, status: 'idle', clothing: null, timeRemaining: 0 }
    ];
    this.inventory = [];
    this.completedClothing = [];
  }

  addMachine() {
    const newId = this.machines.length + 1;
    this.machines.push({ id: newId, status: 'idle', clothing: null, timeRemaining: 0 });
  }

  startProduction(machineId, clothingType) {
    const machine = this.machines.find(m => m.id === machineId);
    if (machine && machine.status === 'idle') {
      machine.status = 'producing';
      machine.clothing = clothingType;
      machine.timeRemaining = CLOTHING_TYPES[clothingType].time;
      return true;
    }
    return false;
  }

  getProgress(machineId) {
    const machine = this.machines.find(m => m.id === machineId);
    if (machine) {
      return machine.timeRemaining;
    }
    return 0;
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);

  // Player joins the game
  socket.on('join_game', (data) => {
    const playerId = socket.id;
    const player = new Player(playerId, data.username);
    players[playerId] = player;
    factories[playerId] = player.factory;

    socket.emit('game_joined', {
      playerId: playerId,
      player: {
        level: player.level,
        exp: player.exp,
        coins: player.coins,
        username: player.username
      },
      factory: {
        machines: player.factory.machines,
        inventory: player.factory.inventory
      }
    });
  });

  // Start production
  socket.on('start_production', (data) => {
    const player = players[socket.id];
    const factory = factories[socket.id];

    if (player && factory) {
      const clothingType = data.clothingType;
      const clothingData = CLOTHING_TYPES[clothingType];

      if (player.coins >= clothingData.cost && player.level >= clothingData.level) {
        player.addCoins(-clothingData.cost);
        factory.startProduction(data.machineId, clothingType);

        socket.emit('production_started', {
          machineId: data.machineId,
          clothingType: clothingType,
          timeRemaining: clothingData.time,
          coins: player.coins
        });

        // Simulate production completion after time expires
        setTimeout(() => {
          const machine = factory.machines.find(m => m.id === data.machineId);
          if (machine && machine.status === 'producing') {
            machine.status = 'completed';
            machine.timeRemaining = 0;
            socket.emit('production_completed', {
              machineId: data.machineId,
              clothingType: clothingType
            });
          }
        }, clothingData.time * 1000);
      } else {
        socket.emit('production_failed', { message: 'Not enough coins or level too low' });
      }
    }
  });

  // Collect completed clothing
  socket.on('collect_clothing', (data) => {
    const player = players[socket.id];
    const factory = factories[socket.id];

    if (player && factory) {
      const machine = factory.machines.find(m => m.id === data.machineId);
      if (machine && machine.status === 'completed') {
        const clothingType = machine.clothing;
        const clothingData = CLOTHING_TYPES[clothingType];

        factory.completedClothing.push({
          type: clothingType,
          timestamp: Date.now()
        });

        machine.status = 'idle';
        machine.clothing = null;

        socket.emit('clothing_collected', {
          machineId: data.machineId,
          clothingType: clothingType
        });
      }
    }
  });

  // Sell clothing
  socket.on('sell_clothing', (data) => {
    const player = players[socket.id];
    const factory = factories[socket.id];

    if (player && factory && factory.completedClothing.length > 0) {
      const clothing = factory.completedClothing.shift();
      const clothingData = CLOTHING_TYPES[clothing.type];

      player.addCoins(clothingData.revenue);
      player.addExp(clothingData.exp);

      socket.emit('clothing_sold', {
        clothingType: clothing.type,
        revenue: clothingData.revenue,
        exp: clothingData.exp,
        coins: player.coins,
        level: player.level
      });
    }
  });

  // Get factory status
  socket.on('get_factory_status', () => {
    const player = players[socket.id];
    const factory = factories[socket.id];

    if (player && factory) {
      socket.emit('factory_status', {
        level: player.level,
        exp: player.exp,
        coins: player.coins,
        machines: factory.machines,
        completedClothing: factory.completedClothing
      });
    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    delete players[socket.id];
    delete factories[socket.id];
    console.log('Player disconnected:', socket.id);
  });
});

// REST API routes
app.get('/api/players/:playerId', (req, res) => {
  const player = players[req.params.playerId];
  if (player) {
    res.json({
      id: player.id,
      username: player.username,
      level: player.level,
      exp: player.exp,
      coins: player.coins
    });
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

app.get('/api/clothing-types', (req, res) => {
  res.json(CLOTHING_TYPES);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

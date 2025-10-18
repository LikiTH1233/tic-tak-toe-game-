const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" } // allow connections from any domain
});

const PORT = process.env.PORT || 3000;
const rooms = {}; // store all game rooms

// Serve static files
app.use(express.static(__dirname));

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // CREATE ROOM
  socket.on("createRoom", ({ name }) => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomId] = {
      players: [{ id: socket.id, name, symbol: "X", score: 0 }],
      board: Array(9).fill(null),
      currentPlayer: "X"
    };
    socket.join(roomId);
    socket.emit("roomCreated", { roomId, symbol: "X" });
  });

  // JOIN ROOM
  socket.on("joinRoom", ({ name, roomId }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("errorMsg", "Room does not exist!");
    if (room.players.length >= 2) return socket.emit("errorMsg", "Room is full!");
    
    const player = { id: socket.id, name, symbol: "O", score: 0 };
    room.players.push(player);
    socket.join(roomId);
    socket.emit("joinedRoom", { roomId, symbol: "O" });

    io.to(roomId).emit("startGame", {
      players: room.players.map(p => ({ id: p.id, name: p.name, symbol: p.symbol, score: p.score })),
      board: room.board,
      currentPlayer: room.currentPlayer
    });
  });

  // MAKE MOVE
  socket.on("makeMove", ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room) return;
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    const playerSymbol = room.players[playerIndex].symbol;
    if (room.board[index] || room.currentPlayer !== playerSymbol) return;

    room.board[index] = playerSymbol;
    room.currentPlayer = playerSymbol === "X" ? "O" : "X";

    const winnerSymbol = checkWinner(room.board);
    let gameOverMsg = null;
    if (winnerSymbol) {
      const winner = room.players.find(p => p.symbol === winnerSymbol);
      winner.score++;
      gameOverMsg = `${winner.name} (${winner.symbol}) wins!`;
    } else if (!room.board.includes(null)) {
      gameOverMsg = "It's a draw!";
    }

    io.to(roomId).emit("updateBoard", {
      board: room.board,
      currentPlayer: room.currentPlayer,
      players: room.players.map(p => ({ id: p.id, name: p.name, symbol: p.symbol, score: p.score })),
      gameOverMsg
    });
  });

  // RESTART GAME
  socket.on("restartGame", (roomId) => {
    const room = rooms[roomId];
    if (room) {
      room.board = Array(9).fill(null);
      room.currentPlayer = "X";
      io.to(roomId).emit("updateBoard", {
        board: room.board,
        currentPlayer: room.currentPlayer,
        players: room.players.map(p => ({ id: p.id, name: p.name, symbol: p.symbol, score: p.score })),
        gameOverMsg: null
      });
    }
  });

  // CHAT
  socket.on("sendMessage", ({ roomId, name, message }) => {
    if (!roomId || !rooms[roomId]) return;
    io.to(roomId).emit("receiveMessage", { name, message });
  });

  // SYMBOL SWITCH
  socket.on("requestSwitch", ({ roomId, name }) => {
    const room = rooms[roomId];
    if (!room) return;
    const otherPlayer = room.players.find(p => p.id !== socket.id);
    if (otherPlayer) {
      io.to(otherPlayer.id).emit("switchRequest", { from: name });
    }
  });

  socket.on("switchResponse", ({ roomId, accepted }) => {
    const room = rooms[roomId];
    if (!room) return;
    const [player1, player2] = room.players;

    if (accepted) {
      [player1.symbol, player2.symbol] = [player2.symbol, player1.symbol];
      io.to(roomId).emit("switchUpdate", {
        message: "Symbol switch accepted! Symbols updated.",
        players: room.players
      });
    } else {
      io.to(roomId).emit("switchUpdate", {
        message: "Symbol switch request denied!",
        players: room.players
      });
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const [id, room] of Object.entries(rooms)) {
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const [removed] = room.players.splice(index, 1);
        io.to(id).emit("receiveMessage", {
          name: "System",
          message: `${removed.name} left the room.`
        });
        if (room.players.length === 0) delete rooms[id];
        break;
      }
    }
  });
});

function checkWinner(b) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b1,c] of wins) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  return null;
}

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

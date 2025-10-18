"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var express = require("express");

var app = express();

var http = require("http").createServer(app);

var io = require("socket.io")(http, {
  cors: {
    origin: "*"
  } // allow connections from any domain

}); // Serve static files (index.html, style.css, script.js)


app.use(express["static"](__dirname));
io.on("connection", function (socket) {
  console.log("New connection:", socket.id);
  socket.on("createRoom", function (_ref) {
    var name = _ref.name;
    var roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomId] = {
      players: [{
        id: socket.id,
        name: name,
        symbol: "X",
        score: 0
      }],
      board: Array(9).fill(null),
      currentPlayer: "X"
    };
    socket.join(roomId);
    socket.emit("roomCreated", {
      roomId: roomId,
      symbol: "X"
    });
  });
  socket.on("joinRoom", function (_ref2) {
    var name = _ref2.name,
        roomId = _ref2.roomId;
    var room = rooms[roomId];
    if (!room) return socket.emit("errorMsg", "Room does not exist!");
    if (room.players.length >= 2) return socket.emit("errorMsg", "Room is full!");
    var player = {
      id: socket.id,
      name: name,
      symbol: "O",
      score: 0
    };
    room.players.push(player);
    socket.join(roomId);
    socket.emit("joinedRoom", {
      roomId: roomId,
      symbol: "O"
    });
    io.to(roomId).emit("startGame", {
      players: room.players.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          symbol: p.symbol,
          score: p.score
        };
      }),
      board: room.board,
      currentPlayer: room.currentPlayer
    });
  });
  socket.on("makeMove", function (_ref3) {
    var roomId = _ref3.roomId,
        index = _ref3.index;
    var room = rooms[roomId];
    if (!room) return;
    var playerIndex = room.players.findIndex(function (p) {
      return p.id === socket.id;
    });
    if (playerIndex === -1) return;
    var playerSymbol = room.players[playerIndex].symbol;
    if (room.board[index] || room.currentPlayer !== playerSymbol) return;
    room.board[index] = playerSymbol;
    room.currentPlayer = playerSymbol === "X" ? "O" : "X";
    var winnerSymbol = checkWinner(room.board);
    var gameOverMsg = null;

    if (winnerSymbol) {
      var winner = room.players.find(function (p) {
        return p.symbol === winnerSymbol;
      });
      winner.score++;
      gameOverMsg = "".concat(winner.name, " (").concat(winner.symbol, ") wins!");
    } else if (!room.board.includes(null)) {
      gameOverMsg = "It's a draw!";
    }

    io.to(roomId).emit("updateBoard", {
      board: room.board,
      currentPlayer: room.currentPlayer,
      players: room.players.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          symbol: p.symbol,
          score: p.score
        };
      }),
      gameOverMsg: gameOverMsg
    });
  });
  socket.on("restartGame", function (roomId) {
    var room = rooms[roomId];

    if (room) {
      room.board = Array(9).fill(null);
      room.currentPlayer = "X";
      io.to(roomId).emit("updateBoard", {
        board: room.board,
        currentPlayer: room.currentPlayer,
        players: room.players.map(function (p) {
          return {
            id: p.id,
            name: p.name,
            symbol: p.symbol,
            score: p.score
          };
        }),
        gameOverMsg: null
      });
    }
  });
  socket.on("sendMessage", function (_ref4) {
    var roomId = _ref4.roomId,
        name = _ref4.name,
        message = _ref4.message;
    if (!roomId || !rooms[roomId]) return;
    io.to(roomId).emit("receiveMessage", {
      name: name,
      message: message
    });
  });
  socket.on("requestSwitch", function (_ref5) {
    var roomId = _ref5.roomId,
        name = _ref5.name;
    var room = rooms[roomId];
    if (!room) return;
    var otherPlayer = room.players.find(function (p) {
      return p.id !== socket.id;
    });

    if (otherPlayer) {
      io.to(otherPlayer.id).emit("switchRequest", {
        from: name
      });
    }
  });
  socket.on("switchResponse", function (_ref6) {
    var roomId = _ref6.roomId,
        accepted = _ref6.accepted;
    var room = rooms[roomId];
    if (!room) return;

    var _room$players = _slicedToArray(room.players, 2),
        player1 = _room$players[0],
        player2 = _room$players[1];

    if (accepted) {
      var _ref7 = [player2.symbol, player1.symbol];
      player1.symbol = _ref7[0];
      player2.symbol = _ref7[1];
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
  socket.on("disconnect", function () {
    for (var _i2 = 0, _Object$entries = Object.entries(rooms); _i2 < _Object$entries.length; _i2++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i2], 2),
          id = _Object$entries$_i[0],
          room = _Object$entries$_i[1];

      var index = room.players.findIndex(function (p) {
        return p.id === socket.id;
      });

      if (index !== -1) {
        var _room$players$splice = room.players.splice(index, 1),
            _room$players$splice2 = _slicedToArray(_room$players$splice, 1),
            removed = _room$players$splice2[0];

        io.to(id).emit("receiveMessage", {
          name: "System",
          message: "".concat(removed.name, " left the room.")
        });
        if (room.players.length === 0) delete rooms[id];
        break;
      }
    }
  });
});

function checkWinner(b) {
  var wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  for (var _i3 = 0, _wins = wins; _i3 < _wins.length; _i3++) {
    var _wins$_i = _slicedToArray(_wins[_i3], 3),
        a = _wins$_i[0],
        b1 = _wins$_i[1],
        c = _wins$_i[2];

    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }

  return null;
}

http.listen(PORT, function () {
  return console.log("Server running on port ".concat(PORT));
});
//# sourceMappingURL=server.dev.js.map

"use strict";

var socket = io(); // DOM Elements

var playerNameInput = document.getElementById("playerName");
var createBtn = document.getElementById("createBtn");
var joinBtn = document.getElementById("joinBtn");
var roomInput = document.getElementById("roomInput");
var nameScreen = document.getElementById("nameScreen");
var roomScreen = document.getElementById("roomScreen");
var roomInfo = document.getElementById("roomInfo");
var scoreboard = document.getElementById("scoreboard");
var boardDiv = document.getElementById("board");
var restartBtn = document.getElementById("restartBtn");
var modal = document.getElementById("modal");
var modalMsg = document.getElementById("modalMsg");
var playAgainBtn = document.getElementById("playAgainBtn");
var chatContainer = document.getElementById("chatContainer");
var chatBox = document.getElementById("chatBox");
var chatInput = document.getElementById("chatInput");
var sendBtn = document.getElementById("sendBtn");
var switchBtn = document.getElementById("switchBtn");
var switchRequestContainer = document.getElementById("switchRequestContainer");
var switchRequestMsg = document.getElementById("switchRequestMsg");
var acceptSwitchBtn = document.getElementById("acceptSwitchBtn");
var declineSwitchBtn = document.getElementById("declineSwitchBtn");
var roomId = null;
var mySymbol = null;
var myName = null;
var players = []; // Create 9 board cells

for (var i = 0; i < 9; i++) {
  var cell = document.createElement("div");
  cell.classList.add("cell");
  cell.dataset.index = i;
  boardDiv.appendChild(cell);
}

var cells = document.querySelectorAll(".cell"); // --------- BUTTON EVENTS ---------

createBtn.addEventListener("click", function () {
  var name = playerNameInput.value.trim();
  if (!name) return alert("Enter your name!");
  myName = name;
  socket.emit("createRoom", {
    name: name
  });
});
joinBtn.addEventListener("click", function () {
  var name = playerNameInput.value.trim();
  var id = roomInput.value.trim();
  if (!name || !id) return alert("Enter name and room ID!");
  myName = name;
  socket.emit("joinRoom", {
    name: name,
    roomId: id
  });
}); // Game board click

cells.forEach(function (cell) {
  cell.addEventListener("click", function () {
    if (!roomId || !mySymbol) return;
    socket.emit("makeMove", {
      roomId: roomId,
      index: cell.dataset.index
    });
  });
}); // Restart game

restartBtn.addEventListener("click", function () {
  socket.emit("restartGame", roomId);
});
playAgainBtn.addEventListener("click", function () {
  modal.style.display = "none";
  socket.emit("restartGame", roomId);
}); // --------- CHAT ---------

sendBtn.addEventListener("click", function () {
  var msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit("sendMessage", {
    roomId: roomId,
    name: myName,
    message: msg
  });
  chatInput.value = "";
});
socket.on("receiveMessage", function (_ref) {
  var name = _ref.name,
      message = _ref.message;
  chatContainer.style.display = "block";
  var msgDiv = document.createElement("div");
  msgDiv.textContent = "".concat(name, ": ").concat(message);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}); // --------- SWITCH SYMBOL FEATURE ---------

switchBtn.addEventListener("click", function () {
  socket.emit("requestSwitch", {
    roomId: roomId,
    name: myName
  });
});
socket.on("switchRequest", function (_ref2) {
  var from = _ref2.from;

  // Show switch request to the other player
  if (switchRequestContainer) {
    switchRequestMsg.textContent = "".concat(from, " wants to switch symbols.");
    switchRequestContainer.style.display = "block";
  } else {
    alert("".concat(from, " wants to switch symbols.")); // fallback
  }
});
acceptSwitchBtn.addEventListener("click", function () {
  socket.emit("switchResponse", {
    roomId: roomId,
    accepted: true
  });
  switchRequestContainer.style.display = "none";
});
declineSwitchBtn.addEventListener("click", function () {
  socket.emit("switchResponse", {
    roomId: roomId,
    accepted: false
  });
  switchRequestContainer.style.display = "none";
});
socket.on("switchUpdate", function (_ref3) {
  var message = _ref3.message,
      pl = _ref3.players;
  alert(message); // Optional

  players = pl;
  var me = players.find(function (p) {
    return p.id === socket.id;
  });
  if (me) mySymbol = me.symbol; // Update UI after switch

  updateScoreboard();
  roomInfo.textContent = "Game Started! You are ".concat(mySymbol);
}); // --------- SOCKET EVENTS ---------

socket.on("roomCreated", function (_ref4) {
  var id = _ref4.roomId,
      symbol = _ref4.symbol;
  roomId = id;
  mySymbol = symbol;
  showBoard("Room Created! Code: ".concat(id, " | You are ").concat(mySymbol));
});
socket.on("joinedRoom", function (_ref5) {
  var id = _ref5.roomId,
      symbol = _ref5.symbol;
  roomId = id;
  mySymbol = symbol;
  showBoard("Joined Room! You are ".concat(mySymbol));
});
socket.on("startGame", function (data) {
  players = data.players;
  var me = players.find(function (p) {
    return p.name === myName;
  });
  if (me) mySymbol = me.symbol;
  showBoard("Game Started! You are ".concat(mySymbol));
  updateScoreboard();
});
socket.on("updateBoard", function (_ref6) {
  var board = _ref6.board,
      currentPlayer = _ref6.currentPlayer,
      pl = _ref6.players,
      gameOverMsg = _ref6.gameOverMsg;
  players = pl;
  cells.forEach(function (cell, i) {
    cell.textContent = board[i] || "";
    cell.classList.toggle("taken", !!board[i]);
  });
  updateScoreboard();

  if (gameOverMsg) {
    modal.style.display = "flex";
    modalMsg.textContent = gameOverMsg;
  }
});
socket.on("errorMsg", function (msg) {
  return alert(msg);
}); // --------- HELPERS ---------

function showBoard(message) {
  nameScreen.style.display = "none";
  roomScreen.style.display = "block";
  roomInfo.textContent = message;
  restartBtn.style.display = "block";
  chatContainer.style.display = "block";
}

function updateScoreboard() {
  scoreboard.innerHTML = players.map(function (p) {
    return "".concat(p.name, " (").concat(p.symbol, "): ").concat(p.score);
  }).join(" | ");
}
//# sourceMappingURL=script.dev.js.map

const socket = io();

const playerNameInput = document.getElementById("playerName");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const roomInput = document.getElementById("roomInput");
const nameScreen = document.getElementById("nameScreen");
const roomScreen = document.getElementById("roomScreen");
const roomInfo = document.getElementById("roomInfo");
const scoreboard = document.getElementById("scoreboard");
const boardDiv = document.getElementById("board");
const restartBtn = document.getElementById("restartBtn");
const modal = document.getElementById("modal");
const modalMsg = document.getElementById("modalMsg");
const playAgainBtn = document.getElementById("playAgainBtn");

const chatContainer = document.getElementById("chatContainer");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

const switchBtn = document.getElementById("switchBtn");
const switchRequestContainer = document.getElementById("switchRequestContainer");
const switchRequestMsg = document.getElementById("switchRequestMsg");
const acceptSwitchBtn = document.getElementById("acceptSwitchBtn");
const declineSwitchBtn = document.getElementById("declineSwitchBtn");

let roomId = null;
let mySymbol = null;
let myName = null;
let players = [];

// Create 9 board cells
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.dataset.index = i;
  boardDiv.appendChild(cell);
}
const cells = document.querySelectorAll(".cell");

// BUTTON EVENTS
createBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) return alert("Enter your name!");
  myName = name;
  socket.emit("createRoom", { name });
});

joinBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  const id = roomInput.value.trim();
  if (!name || !id) return alert("Enter name and room ID!");
  myName = name;
  socket.emit("joinRoom", { name, roomId: id });
});

// GAMEPLAY
cells.forEach(cell => {
  cell.addEventListener("click", () => {
    if (!roomId || !mySymbol) return;
    socket.emit("makeMove", { roomId, index: cell.dataset.index });
  });
});

restartBtn.addEventListener("click", () => {
  socket.emit("restartGame", roomId);
});

playAgainBtn.addEventListener("click", () => {
  modal.style.display = "none";
  socket.emit("restartGame", roomId);
});

// CHAT
sendBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit("sendMessage", { roomId, name: myName, message: msg });
  chatInput.value = "";
});

socket.on("receiveMessage", ({ name, message }) => {
  const msgDiv = document.createElement("div");
  msgDiv.textContent = `${name}: ${message}`;
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
});

// SWITCH SYMBOL
switchBtn.addEventListener("click", () => {
  socket.emit("requestSwitch", { roomId, name: myName });
});

acceptSwitchBtn.addEventListener("click", () => {
  socket.emit("switchResponse", { roomId, accepted: true });
  switchRequestContainer.style.display = "none";
});

declineSwitchBtn.addEventListener("click", () => {
  socket.emit("switchResponse", { roomId, accepted: false });
  switchRequestContainer.style.display = "none";
});

// SOCKET EVENTS
socket.on("roomCreated", ({ roomId: id, symbol }) => {
  roomId = id;
  mySymbol = symbol;
  nameScreen.style.display = "none";
  roomScreen.style.display = "block";
  roomInfo.textContent = `Room ID: ${roomId}`;
});

socket.on("joinedRoom", ({ roomId: id, symbol }) => {
  roomId = id;
  mySymbol = symbol;
  nameScreen.style.display = "none";
  roomScreen.style.display = "block";
  roomInfo.textContent = `Room ID: ${roomId}`;
});

socket.on("startGame", ({ players: pl, board, currentPlayer }) => {
  players = pl;
  updateBoard(board, currentPlayer);
});

socket.on("updateBoard", ({ board, currentPlayer, players: pl, gameOverMsg }) => {
  players = pl;
  updateBoard(board, currentPlayer);
  updateScoreboard();
  if (gameOverMsg) {
    modalMsg.textContent = gameOverMsg;
    modal.style.display = "block";
  }
});

socket.on("switchRequest", ({ from }) => {
  switchRequestMsg.textContent = `${from} wants to switch symbols!`;
  switchRequestContainer.style.display = "block";
});

socket.on("switchUpdate", ({ message, players: pl }) => {
  players = pl;
  updateScoreboard();
  alert(message);
});

// FUNCTIONS
function updateBoard(board, currentPlayer) {
  cells.forEach((cell, i) => {
    cell.textContent = board[i] || "";
    cell.style.pointerEvents = board[i] || currentPlayer !== mySymbol ? "none" : "auto";
  });
}

function updateScoreboard() {
  scoreboard.innerHTML = players.map(p => `${p.name} (${p.symbol}): ${p.score}`).join(" | ");
}

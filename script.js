const socket = io();

// DOM Elements
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

// --------- BUTTON EVENTS ---------
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

// Game board click
cells.forEach(cell => {
  cell.addEventListener("click", () => {
    if (!roomId || !mySymbol) return;
    socket.emit("makeMove", { roomId, index: cell.dataset.index });
  });
});

// Restart game
restartBtn.addEventListener("click", () => {
  socket.emit("restartGame", roomId);
});

playAgainBtn.addEventListener("click", () => {
  modal.style.display = "none";
  socket.emit("restartGame", roomId);
});

// --------- CHAT ---------
sendBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit("sendMessage", { roomId, name: myName, message: msg });
  chatInput.value = "";
});

socket.on("receiveMessage", ({ name, message }) => {
  chatContainer.style.display = "block";
  const msgDiv = document.createElement("div");
  msgDiv.textContent = `${name}: ${message}`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// --------- SWITCH SYMBOL FEATURE ---------
switchBtn.addEventListener("click", () => {
  socket.emit("requestSwitch", { roomId, name: myName });
});

socket.on("switchRequest", ({ from }) => {
  // Show switch request to the other player
  if (switchRequestContainer) {
    switchRequestMsg.textContent = `${from} wants to switch symbols.`;
    switchRequestContainer.style.display = "block";
  } else {
    alert(`${from} wants to switch symbols.`); // fallback
  }
});

acceptSwitchBtn.addEventListener("click", () => {
  socket.emit("switchResponse", { roomId, accepted: true });
  switchRequestContainer.style.display = "none";
});

declineSwitchBtn.addEventListener("click", () => {
  socket.emit("switchResponse", { roomId, accepted: false });
  switchRequestContainer.style.display = "none";
});

socket.on("switchUpdate", ({ message, players: pl }) => {
  alert(message); // Optional
  players = pl;

  const me = players.find(p => p.id === socket.id);
  if (me) mySymbol = me.symbol;

  // Update UI after switch
  updateScoreboard();
  roomInfo.textContent = `Game Started! You are ${mySymbol}`;
});

// --------- SOCKET EVENTS ---------
socket.on("roomCreated", ({ roomId: id, symbol }) => {
  roomId = id;
  mySymbol = symbol;
  showBoard(`Room Created! Code: ${id} | You are ${mySymbol}`);
});

socket.on("joinedRoom", ({ roomId: id, symbol }) => {
  roomId = id;
  mySymbol = symbol;
  showBoard(`Joined Room! You are ${mySymbol}`);
});

socket.on("startGame", (data) => {
  players = data.players;
  const me = players.find(p => p.name === myName);
  if (me) mySymbol = me.symbol;
  showBoard(`Game Started! You are ${mySymbol}`);
  updateScoreboard();
});

socket.on("updateBoard", ({ board, currentPlayer, players: pl, gameOverMsg }) => {
  players = pl;
  cells.forEach((cell, i) => {
    cell.textContent = board[i] || "";
    cell.classList.toggle("taken", !!board[i]);
  });
  updateScoreboard();
  if (gameOverMsg) {
    modal.style.display = "flex";
    modalMsg.textContent = gameOverMsg;
  }
});

socket.on("errorMsg", (msg) => alert(msg));

// --------- HELPERS ---------
function showBoard(message) {
  nameScreen.style.display = "none";
  roomScreen.style.display = "block";
  roomInfo.textContent = message;
  restartBtn.style.display = "block";
  chatContainer.style.display = "block";
}

function updateScoreboard() {
  scoreboard.innerHTML = players
    .map(p => `${p.name} (${p.symbol}): ${p.score}`)
    .join(" | ");
}

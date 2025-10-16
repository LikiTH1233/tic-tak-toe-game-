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

// ----- BUTTON EVENTS -----
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

// ----- SOCKET EVENTS -----
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

socket.on("errorMsg", (msg) => alert(msg));

// ----- GAMEPLAY -----
cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    if (!roomId || !mySymbol) return;
    socket.emit("makeMove", { roomId, index: cell.dataset.index });
  });
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

// ----- RESTART GAME -----
restartBtn.addEventListener("click", () => {
  socket.emit("restartGame", roomId);
});

// ----- PLAY AGAIN -----
playAgainBtn.addEventListener("click", () => {
  modal.style.display = "none";
  socket.emit("restartGame", roomId);
});

// ----- HELPER FUNCTIONS -----
function showBoard(message) {
  nameScreen.style.display = "none";
  roomScreen.style.display = "block";
  roomInfo.textContent = message;
  restartBtn.style.display = "block";
}

function updateScoreboard() {
  scoreboard.innerHTML = players
    .map(p => `${p.name} (${p.symbol}): ${p.score}`)
    .join(" | ");
}

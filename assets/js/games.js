// ==========================================================
// games.js — 3 tiny calm games, no libraries
// 1. Breathing  2. Memory match  3. Tic-tac-toe vs simple AI
// Each section is independent — read one at a time.
// ==========================================================

// ---------- tab switching ----------
const tabBtns = document.querySelectorAll(".game-tabs button");
const panels = document.querySelectorAll(".game-panel");
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
    panels.forEach((p) => p.classList.toggle("active", p.id === `game-${btn.dataset.game}`));
    if (btn.dataset.game !== "breath") stopBreath();
  });
});

// ================= 1. BREATHING (4s in, 4s hold, 6s out) =================
const breathCircle = document.getElementById("breathCircle");
const breathLabel = document.getElementById("breathLabel");
const breathCount = document.getElementById("breathCount");
let breathTimers = [];
let breathCycles = Number(localStorage.getItem("minco_breath_cycles") || 0);
breathCount.textContent = `${breathCycles} calm ${breathCycles === 1 ? "cycle" : "cycles"} completed`;

function stopBreath() {
  breathTimers.forEach(clearTimeout);
  breathTimers = [];
  breathCircle.classList.remove("inhale", "exhale");
  breathLabel.textContent = "Ready";
  document.getElementById("breathBtn").textContent = "Begin";
}

function later(fn, ms) {
  breathTimers.push(setTimeout(fn, ms));
}

document.getElementById("breathBtn").addEventListener("click", (e) => {
  if (breathTimers.length) {
    stopBreath();
    return;
  }
  e.target.textContent = "Stop";
  const round = () => {
    breathLabel.textContent = "Breathe in...";
    breathCircle.classList.remove("exhale");
    breathCircle.classList.add("inhale");
    later(() => {
      breathLabel.textContent = "Hold...";
      later(() => {
        breathLabel.textContent = "Breathe out...";
        breathCircle.classList.remove("inhale");
        breathCircle.classList.add("exhale");
        later(() => {
          breathCycles++;
          localStorage.setItem("minco_breath_cycles", breathCycles);
          breathCount.textContent = `${breathCycles} calm ${breathCycles === 1 ? "cycle" : "cycles"} completed`;
          if (breathTimers.length) round(); // loop until stopped
        }, 6000);
      }, 4000);
    }, 4000);
  };
  round();
});

// ================= 2. MEMORY MATCH =================
const SHAPES = ["●", "▲", "■", "★", "♥", "✦"];
const COLORS = ["#6c5ce7", "#4fa3e3", "#2e9d62", "#e26db4", "#ff9a3c", "#3b2f7a"];
const memGrid = document.getElementById("memoryGrid");
const memMoves = document.getElementById("memMoves");
const memBest = document.getElementById("memBest");
let memFirst = null;
let memLock = false;
let memMovesCount = 0;
let memDone = 0;
let best = Number(localStorage.getItem("minco_memory_best") || 0);
if (best) memBest.textContent = `Best: ${best} moves`;

function buildMemory() {
  memGrid.innerHTML = "";
  memFirst = null;
  memLock = false;
  memMovesCount = 0;
  memDone = 0;
  memMoves.textContent = "0 moves";
  // pairs then shuffle (Fisher-Yates)
  const deck = [...SHAPES, ...SHAPES]
    .map((s, i) => ({ s, c: COLORS[i % COLORS.length] }))
    .sort(() => Math.random() - 0.5);
  deck.forEach((card) => {
    const el = document.createElement("button");
    el.className = "memory-card";
    el.dataset.shape = card.s;
    el.setAttribute("aria-label", "Memory card");
    el.addEventListener("click", () => flipCard(el, card));
    memGrid.appendChild(el);
  });
}

function flipCard(el, card) {
  if (memLock || el.classList.contains("open") || el.classList.contains("done")) return;
  el.textContent = card.s;
  el.style.color = card.c;
  el.classList.add("open");
  if (!memFirst) {
    memFirst = el;
    return;
  }
  memMovesCount++;
  memMoves.textContent = `${memMovesCount} moves`;
  if (memFirst.dataset.shape === el.dataset.shape) {
    memFirst.classList.add("done");
    el.classList.add("done");
    memFirst = null;
    memDone += 2;
    if (memDone === 12) {
      if (!best || memMovesCount < best) {
        best = memMovesCount;
        localStorage.setItem("minco_memory_best", best);
        memBest.textContent = `Best: ${best} moves`;
      }
      memMoves.textContent = `Done in ${memMovesCount} moves — nicely done.`;
    }
  } else {
    memLock = true;
    const a = memFirst;
    memFirst = null;
    setTimeout(() => {
      a.classList.remove("open");
      a.textContent = "";
      el.classList.remove("open");
      el.textContent = "";
      memLock = false;
    }, 650);
  }
}

document.getElementById("memRestart").addEventListener("click", buildMemory);
buildMemory();

// ================= 3. TIC-TAC-TOE vs calm AI =================
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const boardEl = document.getElementById("tttBoard");
const tttStatus = document.getElementById("tttStatus");
const tttScore = document.getElementById("tttScore");
let board = Array(9).fill("");
let tttOver = false;
let tally = JSON.parse(localStorage.getItem("minco_ttt") || '{"you":0,"ai":0,"draw":0}');

function drawTally() {
  tttScore.textContent = `You ${tally.you} · Calm AI ${tally.ai} · Draws ${tally.draw}`;
}
function checkWin(b) {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line: [a, c, d] };
  }
  return b.includes("") ? null : { winner: "draw", line: [] };
}

// AI: win if possible, block if needed, else prefer center/corners, else random
function aiMove() {
  const empty = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  for (const i of empty) {
    const trial = [...board];
    trial[i] = "O";
    if (checkWin(trial)?.winner === "O") return i;
  }
  for (const i of empty) {
    const trial = [...board];
    trial[i] = "X";
    if (checkWin(trial)?.winner === "X") return i;
  }
  for (const i of [4, 0, 2, 6, 8]) if (board[i] === "") return i;
  return empty[Math.floor(Math.random() * empty.length)];
}

function drawBoard(winLine = []) {
  boardEl.innerHTML = "";
  board.forEach((v, i) => {
    const cell = document.createElement("button");
    cell.className = "ttt-cell" + (winLine.includes(i) ? " win" : "");
    cell.textContent = v;
    cell.setAttribute("aria-label", `Cell ${i + 1}`);
    cell.addEventListener("click", () => playerMove(i));
    boardEl.appendChild(cell);
  });
}

function finish(result) {
  tttOver = true;
  if (result.winner === "X") {
    tally.you++;
    tttStatus.textContent = "You win — steady and thoughtful.";
  } else if (result.winner === "O") {
    tally.ai++;
    tttStatus.textContent = "Calm AI takes this one. Breathe, rematch?";
  } else {
    tally.draw++;
    tttStatus.textContent = "A draw — balanced, like a good day.";
  }
  localStorage.setItem("minco_ttt", JSON.stringify(tally));
  drawTally();
  drawBoard(result.line);
}

function playerMove(i) {
  if (tttOver || board[i]) return;
  board[i] = "X";
  let r = checkWin(board);
  if (r) return finish(r);
  const ai = aiMove();
  if (ai !== undefined) board[ai] = "O";
  r = checkWin(board);
  if (r) return finish(r);
  tttStatus.textContent = "Your move — no rush.";
  drawBoard();
}

document.getElementById("tttRestart").addEventListener("click", () => {
  board = Array(9).fill("");
  tttOver = false;
  tttStatus.textContent = "Your move — no rush.";
  drawBoard();
});

drawTally();
drawBoard();

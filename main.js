const opt = {
  boardWidth: 200,
  boardHeight: 200,
  scale: 1,
  gameTickRate: 32,
  renderTickRate: 32,
  numPeople: document.getElementById("civilianCount").value,
  numZombies: document.getElementById("zombieCount").value,
  numMedics: document.getElementById("medicCount").value,
};
const EMPTY = 0;
const CIVILIAN = 1;
const ZOMBIE = 2;
const MEDIC = 3;
let play = true;
const c = document.getElementById("canvas");
const ctx = c.getContext("2d");
ctx.canvas.width = opt.boardWidth;
ctx.canvas.height = opt.boardHeight;
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

let board = makeBoard();

board = fillBoardRandomly(board);

drawBoard(board, ctx);

document.getElementById("pauseButton").addEventListener("click", (e) => {
  e.preventDefault();

  if (play === true) {
    play = false;
  } else {
    play = true;
    loop();
  }
});

document.getElementById("resetButton").addEventListener("click", (e) => {
  e.preventDefault();

  opt.numPeople = document.getElementById("civilianCount").value;
  opt.numZombies = document.getElementById("zombieCount").value;
  opt.numMedics = document.getElementById("medicCount").value;

  board = makeBoard();
  board = fillBoardRandomly(board);
  drawBoard(board, ctx);
});

// Clear the console for performance
window.setInterval(() => {
  if (play === true) {
    console.clear();
  }
}, 10000);

window.setInterval(() => {
  drawBoard(board);
}, opt.renderTickRate);

loop();

function makeBoard() {
  const board = new Array();

  for (let x = 0; x < opt.boardWidth; x++) {
    board.push(new Array(opt.boardHeight).fill(0));
  }

  return board;
}

function limitX(x) {
  return Math.max(Math.min(x, opt.boardWidth - 1), 0);
}

function limitY(x) {
  return Math.max(Math.min(x, opt.boardHeight - 1), 0);
}

function onBoard(x, y) {
  if (typeof board[x] === "undefined") {
    return null;
  }

  if (typeof board[x][y] === "undefined") {
    return null;
  }

  return board[x][y];
}

function countNearby(x, y) {
  const results = {
    [CIVILIAN]: 0,
    [ZOMBIE]: 0,
    [EMPTY]: 0,
    [MEDIC]: 0,
    null: 0,
  };

  results[onBoard(x - 1, y - 1)]++;
  results[onBoard(x, y - 1)]++;
  results[onBoard(x + 1, y - 1)]++;
  results[onBoard(x - 1, y)]++;
  results[onBoard(x + 1, y)]++;
  results[onBoard(x - 1, y + 1)]++;
  results[onBoard(x, y + 1)]++;
  results[onBoard(x + 1, y + 1)]++;

  return results;
}

function loop() {
  for (let x = 0; x < opt.boardWidth; x++) {
    for (let y = 0; y < opt.boardHeight; y++) {
      let xDelta = Math.floor(Math.random() * 3) - 1;
      let yDelta = Math.floor(Math.random() * 3) - 1;
      let newX = limitX(x + xDelta);
      let newY = limitY(y + yDelta);

      if (
        board[x][y] === CIVILIAN ||
        board[x][y] === ZOMBIE ||
        board[x][y] === MEDIC
      ) {
        if (board[newX][newY] === EMPTY) {
          // Move entity to new position
          board[newX][newY] = board[x][y];

          // Wipe out old position
          board[x][y] = EMPTY;
        } else {
          // New position is taken
          // Reset these variables so we can use them below
          newX = x;
          newY = y;
        }
      }

      const nearbys = countNearby(newX, newY);

      switch (board[newX][newY]) {
        case CIVILIAN:
          // If there's a medic nearby, you learn
          if (nearbys[MEDIC] > 1) {
            board[newX][newY] = MEDIC;
          }

          // If there are zombies but not enough civilians, you got got
          if (nearbys[ZOMBIE] > 1 && nearbys[CIVILIAN] < 1) {
            board[newX][newY] = ZOMBIE;
          }

          break;
        case MEDIC:
          // If there are zombies nearby and not enough civilians, you get got
          if (nearbys[ZOMBIE] > 1 && nearbys[CIVILIAN] < 1) {
            board[newX][newY] = ZOMBIE;
          }
          break;
        case ZOMBIE:
          if (nearbys[MEDIC] > 0) {
            board[newX][newY] = CIVILIAN;
          }
          break;
      }
    }
  }

  if (play === true) {
    window.setTimeout(loop, opt.gameTickRate);
  }
}

function drawBoard(board) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, opt.boardWidth, opt.boardHeight);

  for (let y = 0; y < opt.boardHeight; y++) {
    for (let x = 0; x < opt.boardWidth; x++) {
      switch (board[x][y]) {
        case CIVILIAN:
          drawPerson(x, y);
          break;
        case ZOMBIE:
          drawZombie(x, y);
          break;
        case MEDIC:
          drawMedic(x, y);
          break;
        default:
          drawEmpty(x, y);
          break;
      }
    }
  }
}

function fillBoardRandomly(board) {
  let x, y;

  for (let i = 0; i < opt.numPeople; i++) {
    x = Math.floor(Math.random() * opt.boardWidth);
    y = Math.floor(Math.random() * opt.boardHeight);
    board[x][y] = CIVILIAN;
  }

  for (let i = 0; i < opt.numZombies; i++) {
    x = Math.floor(Math.random() * opt.boardWidth);
    y = Math.floor(Math.random() * opt.boardHeight);
    board[x][y] = ZOMBIE;
  }

  for (let i = 0; i < opt.numMedics; i++) {
    x = Math.floor(Math.random() * opt.boardWidth);
    y = Math.floor(Math.random() * opt.boardHeight);
    board[x][y] = MEDIC;
  }

  return board;
}

function drawPerson(x, y) {
  ctx.fillStyle = "#666";
  ctx.fillRect(x * opt.scale, y * opt.scale, opt.scale, opt.scale);
}

function drawMedic(x, y) {
  ctx.fillStyle = "#44f";
  ctx.fillRect(x * opt.scale, y * opt.scale, opt.scale, opt.scale);
}

function drawZombie(x, y) {
  ctx.fillStyle = "#5c0";
  ctx.fillRect(x * opt.scale, y * opt.scale, opt.scale, opt.scale);
}

function drawEmpty(x, y) {
  ctx.fillStyle = "#000";
  ctx.fillRect(x * opt.scale, y * opt.scale, opt.scale, opt.scale);
}

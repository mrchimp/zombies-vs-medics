let resolutionScale = 2;
let boardWidth;
let boardHeight;
const gameTickRateMS = 32;
const renderTickRateMS = 32;
let numCivilians = 100;
let numZombies = 50;
let numMedics = 5;
let bodyScale = 3;
const nearbyRange = bodyScale * 3;
const CORPSE = 0;
const CIVILIAN = 1;
const ZOMBIE = 2;
const MEDIC = 3;
let play = true;
const c = document.getElementById("canvas");
const ctx = c.getContext("2d");
updateScale();
ctx.canvas.width = boardWidth;
ctx.canvas.height = boardHeight;
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

document.getElementById("civilianCount").value = numCivilians;
document.getElementById("zombieCount").value = numZombies;
document.getElementById("medicCount").value = numMedics;
document.getElementById("resolutionScale").value = resolutionScale;

const corpseCountOutput = document.getElementById("corpseCountOutput");
const civilianCountOutput = document.getElementById("civilianCountOutput");
const zombieCountOutput = document.getElementById("zombieCountOutput");
const medicCountOutput = document.getElementById("medicCountOutput");

let board = [];

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
  reset();
});

function reset() {
  numCivilians = document.getElementById("civilianCount").value;
  numZombies = document.getElementById("zombieCount").value;
  numMedics = document.getElementById("medicCount").value;
  resolutionScale = document.getElementById("resolutionScale").value;

  updateScale();
  board = [];
  board = fillBoardRandomly(board);
  clearBoard();
  drawBoard(board, ctx);
}

function updateScale(e) {
  boardWidth = window.innerWidth / resolutionScale;
  boardHeight = window.innerHeight / resolutionScale;
  ctx.canvas.width = boardWidth;
  ctx.canvas.height = boardHeight;
}

window.setInterval(() => {
  drawBoard(board);
}, renderTickRateMS);

window.setInterval(updateCounts, 128);

loop();

function limitX(x) {
  return Math.max(Math.min(x, boardWidth - 1), 0);
}

function limitY(x) {
  return Math.max(Math.min(x, boardHeight - 1), 0);
}

function countNearby(x, y) {
  const results = {
    [CIVILIAN]: 0,
    [ZOMBIE]: 0,
    [CORPSE]: 0,
    [MEDIC]: 0,
    null: 0,
  };

  board.forEach((item) => {
    if (item.cooldown > 0) return;
    if (item.x < x - nearbyRange) return;
    if (item.x > x + nearbyRange) return;
    if (item.y < y - nearbyRange) return;
    if (item.y > y + nearbyRange) return;

    results[item.value]++;
  });

  return results;
}

function loop() {
  board.forEach((item) => {
    let xDelta = Math.floor(Math.random() * 3) - 1;
    let yDelta = Math.floor(Math.random() * 3) - 1;

    xDelta += item.velX;
    yDelta += item.velY;

    let newX = limitX(item.x + xDelta);
    let newY = limitY(item.y + yDelta);

    if (item.cooldown === 0) {
      // Move entity to new position
      item.x = newX;
      item.y = newY;
    } else {
      item.cooldown--;
    }

    // Bounce off walls
    if (item.x === 0) item.velX = 1;
    if (item.x === boardWidth - 1) item.velX = -1;
    if (item.y === 0) item.velY = 1;
    if (item.y === boardHeight - 1) item.velY = -1;

    const nearbys = countNearby(item.x, item.y);

    switch (item.value) {
      case CORPSE:
        updateCorpse(item, nearbys);
        break;
      case CIVILIAN:
        updateCivilian(item, nearbys);
        break;
      case MEDIC:
        updateMedic(item, nearbys);
        break;
      case ZOMBIE:
        updateZombie(item, nearbys);
        break;
    }
  });

  if (play === true) {
    window.setTimeout(loop, gameTickRateMS);
  }
}

function updateCorpse(item, nearbys) {
  if (item.cooldown === 0) {
    item.value = ZOMBIE;
  }
}

function updateCivilian(item, nearbys) {
  // If there's a medic nearby, you learn
  if (nearbys[MEDIC] > 0) {
    item.training++;
  }

  if (item.training > 100) {
    item.value = MEDIC;
    return;
  }

  // If there are zombies but not enough civilians, you got got
  if (nearbys[ZOMBIE] > 1) {
    item.value = CORPSE;
    item.cooldown = 200;
    return;
  }
}

function updateMedic(item, nearbys) {
  // If there are zombies nearby and not enough civilians, you get got
  if (nearbys[ZOMBIE] > 1 && nearbys[CIVILIAN] < 1) {
    item.value = ZOMBIE;
    item.cooldown = 50;
  }
}

function updateZombie(item, nearbys) {
  if (nearbys[MEDIC] > 0) {
    item.value = CIVILIAN;
    item.cooldown = 50;
  }
}

function clearBoard(board) {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, boardWidth, boardHeight);
}

function drawBoard(board) {
  clearBoard();
  board.forEach(drawItem);
}

function fillBoardRandomly(board) {
  for (let i = 0; i < numCivilians; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * boardHeight),
      velX: Math.floor(Math.random() * 3) - 1,
      velY: Math.floor(Math.random() * 3) - 1,
      value: CIVILIAN,
      cooldown: 0,
      training: 0,
    });
  }

  for (let i = 0; i < numZombies; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * boardHeight),
      velX: Math.floor(Math.random() * 3) - 1,
      velY: Math.floor(Math.random() * 3) - 1,
      value: ZOMBIE,
      cooldown: 0,
      training: 0,
    });
  }

  for (let i = 0; i < numMedics; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * boardHeight),
      velX: Math.floor(Math.random() * 3) - 1,
      velY: Math.floor(Math.random() * 3) - 1,
      value: MEDIC,
      cooldown: 0,
      training: 100,
    });
  }

  return board;
}

function drawItem(item) {
  switch (item.value) {
    case CORPSE:
      ctx.fillStyle = "#632";
      break;
    case CIVILIAN:
      ctx.fillStyle = "#999";
      break;
    case ZOMBIE:
      ctx.fillStyle = "#f00";
      break;
    case MEDIC:
      ctx.fillStyle = "#0f0";
      break;
  }

  ctx.fillRect(item.x, item.y, bodyScale, bodyScale);
  // ctx.beginPath();
  // ctx.arc(item.x, item.y, bodyScale, 0, 2 * Math.PI);
  // ctx.fill();
}

function updateCounts() {
  const counts = {
    [CIVILIAN]: 0,
    [MEDIC]: 0,
    [ZOMBIE]: 0,
    [CORPSE]: 0,
  };

  let scaleFactor = board.length / 250;

  board.forEach((item) => {
    counts[item.value]++;
  });

  corpseCountOutput.innerHTML = counts[CORPSE];
  corpseCountOutput.style.fontSize = `${20 + counts[CORPSE] / scaleFactor}px`;

  civilianCountOutput.innerHTML = counts[CIVILIAN];
  civilianCountOutput.style.fontSize = `${
    20 + counts[CIVILIAN] / scaleFactor
  }px`;

  zombieCountOutput.innerHTML = counts[ZOMBIE];
  zombieCountOutput.style.fontSize = `${20 + counts[ZOMBIE] / scaleFactor}px`;

  medicCountOutput.innerHTML = counts[MEDIC];
  medicCountOutput.style.fontSize = `${20 + counts[MEDIC] / scaleFactor}px`;
}

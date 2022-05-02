let resolutionScale = 3;
let boardWidth;
let boardHeight;
const gameTickRateMS = 32;
const renderTickRateMS = 32;
let numCivilians = 100;
let numZombies = 50;
let numMedics = 5;
let numCorpses = 0;
let bodyScale = 3;
let graphTickCount = 0;
const bodyShape = "rect";
const nearbyRange = bodyScale * 2;
const BG = -1;
const CORPSE = 0;
const CIVILIAN = 1;
const ZOMBIE = 2;
const MEDIC = 3;
const wobble = true;
let play = true;
const colors = {
  [CORPSE]: "#632",
  [CIVILIAN]: "#999",
  [ZOMBIE]: "#f00",
  [MEDIC]: "#0f0",
  [BG]: "#000",
};
const c = document.getElementById("canvas");
const ctx = c.getContext("2d");
updateScale();
ctx.canvas.width = boardWidth;
ctx.canvas.height = boardHeight;
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.fillStyle = "#111";
ctx.fillRect(0, 0, boardWidth, boardHeight);

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

function graphHeight() {
  return 100;
}

function reset() {
  numCivilians = parseInt(document.getElementById("civilianCount").value, 10);
  numZombies = parseInt(document.getElementById("zombieCount").value, 10);
  numMedics = parseInt(document.getElementById("medicCount").value, 10);
  resolutionScale = parseInt(
    document.getElementById("resolutionScale").value,
    10
  );
  graphTickCount = 0;

  updateScale();
  board = [];
  board = fillBoardRandomly(board);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, boardWidth, boardHeight);
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

window.setInterval(drawGraph, 300);

function drawGraph() {
  if (!play) {
    return;
  }

  graphTickCount = (graphTickCount + 1) % boardWidth;

  let total = totalEntities();
  let y = boardHeight - graphHeight();
  const counts = countItems();
  let civilianHeight = (counts[CIVILIAN] / total) * 100;
  let medicHeight = (counts[MEDIC] / total) * 100;
  let corpseHeight = (counts[CORPSE] / total) * 100;
  let zombieHeight = (counts[ZOMBIE] / total) * 100;

  ctx.fillStyle = colors[CIVILIAN];
  ctx.fillRect(graphTickCount, y, 1, civilianHeight);

  y += civilianHeight;

  ctx.fillStyle = colors[MEDIC];
  ctx.fillRect(graphTickCount, y, 1, medicHeight);

  y += medicHeight;

  ctx.fillStyle = colors[CORPSE];
  ctx.fillRect(graphTickCount, y, 1, corpseHeight);

  y += corpseHeight;

  ctx.fillStyle = colors[ZOMBIE];
  ctx.fillRect(graphTickCount, y, 1, zombieHeight);
}

loop();

function limitX(x) {
  return Math.max(Math.min(x, boardWidth - 1), 0);
}

function limitY(x) {
  return Math.max(Math.min(x, boardHeight - 1), 0);
}

function distance(item1, item2) {
  return Math.sqrt(
    (item1.x - item2.x) * (item1.x - item2.x) +
      (item1.y - item2.y) * (item1.y - item2.y)
  );
}

function countNearby(item) {
  const results = {
    [CIVILIAN]: 0,
    [ZOMBIE]: 0,
    [CORPSE]: 0,
    [MEDIC]: 0,
    null: 0,
  };

  board.forEach((item2) => {
    // Exclude self
    if (item === item2) return;
    // Exclude items on countdown
    if (item2.cooldown > 0) return;

    if (distance(item, item2) < nearbyRange) return;

    results[item.value]++;
  });

  return results;
}

function totalEntities() {
  return numCivilians + numCorpses + numMedics + numZombies;
}

function loop() {
  board.forEach((item) => {
    let xDelta;
    let yDelta;

    if (wobble) {
      xDelta = Math.random() * 2 - 1;
      yDelta = Math.random() * 2 - 1;
    } else {
      xDelta = 0;
      yDelta = 0;
    }

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
    // if (item.y === boardHeight - 1) item.velY = -1;
    if (item.y > boardHeight - graphHeight() - bodyScale * 2) item.velY = -1;

    const nearbys = countNearby(item);

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
    item.velX = randomVel();
    item.velY = randomVel();
  }

  if (nearbys[MEDIC] > 0) {
    item.value = CIVILIAN;
    item.velX = randomVel();
    item.velY = randomVel();
  }
}

function updateCivilian(item, nearbys) {
  // If there's a medic nearby, you learn
  if (nearbys[MEDIC] > 0) {
    item.training += nearbys[MEDIC];
  }

  if (item.training > 100) {
    item.value = MEDIC;
    item.velX = randomVel();
    item.velY = randomVel();
    return;
  }

  // If there are zombies but not enough civilians, you got got
  if (nearbys[ZOMBIE] > 0) {
    item.value = CORPSE;
    item.velX = randomVel();
    item.velY = randomVel();
    item.cooldown = 200;
    return;
  }
}

function updateMedic(item, nearbys) {
  // If there are zombies nearby and not enough civilians, you get got
  if (nearbys[ZOMBIE] > 1 && nearbys[CIVILIAN] < 1) {
    item.value = ZOMBIE;
    item.velX = randomVel();
    item.velY = randomVel();
    item.cooldown = 50;
  }
}

function updateZombie(item, nearbys) {
  if (nearbys[MEDIC] > 0) {
    item.value = CIVILIAN;
    item.velX = randomVel();
    item.velY = randomVel();
    item.cooldown = 50;
  }
}

function clearBoard() {
  ctx.fillStyle = colors[BG];
  ctx.fillRect(0, 0, boardWidth, boardHeight - graphHeight());
}

function drawBoard(board) {
  clearBoard();
  board.forEach(drawItem);
}

function randomVel() {
  return Math.random() * 2 - 1;
}

function fillBoardRandomly(board) {
  for (let i = 0; i < numCivilians; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * (boardHeight - graphHeight())),
      velX: randomVel(),
      velY: randomVel(),
      value: CIVILIAN,
      cooldown: 0,
      training: 0,
    });
  }

  for (let i = 0; i < numZombies; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * (boardHeight - graphHeight())),
      velX: randomVel(),
      velY: randomVel(),
      value: ZOMBIE,
      cooldown: 0,
      training: 0,
    });
  }

  for (let i = 0; i < numMedics; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * (boardHeight - graphHeight())),
      velX: randomVel(),
      velY: randomVel(),
      value: MEDIC,
      cooldown: 0,
      training: 100,
    });
  }

  for (let i = 0; i < numCorpses; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(Math.random() * (boardHeight - graphHeight())),
      velX: randomVel(),
      velY: randomVel(),
      value: CORPSE,
      cooldown: 2000,
      training: 0,
    });
  }

  return board;
}

function drawItem(item) {
  if (bodyShape === "rect") {
    ctx.fillStyle = colors[item.value];
    ctx.fillRect(item.x, item.y, bodyScale, bodyScale);
  } else {
    ctx.beginPath();
    ctx.arc(item.x, item.y, bodyScale, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function countItems() {
  const counts = {
    [CIVILIAN]: 0,
    [MEDIC]: 0,
    [ZOMBIE]: 0,
    [CORPSE]: 0,
  };

  board.forEach((item) => {
    counts[item.value]++;
  });

  return counts;
}

function updateCounts() {
  let scaleFactor = board.length / 250;

  counts = countItems();

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

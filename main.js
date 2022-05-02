/**
 * Made with some help from Ben Eater https://github.com/beneater/boids/
 */

let resolutionScale = 3;
let boardWidth;
let boardHeight;
const gameTickRateMS = 16;
const renderTickRateMS = 16;
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

const visualRange = 25;

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
  console.clear();
}

function updateScale(e) {
  boardWidth = window.innerWidth / resolutionScale;
  boardHeight = window.innerHeight / resolutionScale;
  ctx.canvas.width = boardWidth;
  ctx.canvas.height = boardHeight;
}

drawBoard(board);

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

// Constrain a boid to within the window. If it gets too close to an edge,
// nudge it back in and reverse its direction.
function keepWithinBounds(boid) {
  const margin = 10;
  const turnFactor = 0.5;

  if (boid.x < margin) {
    boid.velX += turnFactor;
  }
  if (boid.x > boardWidth - margin) {
    boid.velX -= turnFactor;
  }
  if (boid.y < margin) {
    boid.velY += turnFactor;
  }
  if (boid.y > boardHeight - graphHeight() - margin) {
    boid.velY -= turnFactor;
  }
}

// Find the center of mass of the other boids and adjust velocity slightly to
// point towards the center of mass.
function flyTowardsCenter(boid) {
  let centeringFactor = 0.001; // adjust velocity by this %
  let centerX = 0;
  let centerY = 0;
  let numNeighbors = 0;

  if (boid.value === ZOMBIE) {
    centeringFactor = 0.0005;
  }

  for (let otherBoid of board) {
    if (distance(boid, otherBoid) < visualRange) {
      centerX += otherBoid.x;
      centerY += otherBoid.y;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    centerX = centerX / numNeighbors;
    centerY = centerY / numNeighbors;

    boid.velX += (centerX - boid.x) * centeringFactor;
    boid.velY += (centerY - boid.y) * centeringFactor;
  }
}

// Move away from other boids that are too close to avoid colliding
function avoidOthers(boid) {
  let minDistance = 4; // The distance to stay away from other boids
  let avoidFactor = 0.03; // Adjust velocity by this %

  if (boid.value === ZOMBIE) {
    minDistance = 4;
    avoidFactor = 0.03;
  }

  let moveX = 0;
  let moveY = 0;
  for (let otherBoid of board) {
    if (otherBoid !== boid) {
      if (distance(boid, otherBoid) < minDistance) {
        moveX += boid.x - otherBoid.x;
        moveY += boid.y - otherBoid.y;
      }
    }
  }

  boid.velX += moveX * avoidFactor;
  boid.velY += moveY * avoidFactor;
}

// Find the average velocity (speed and direction) of the other boids and
// adjust velocity slightly to match.
function matchVelocity(boid) {
  let matchingFactor = 0.05; // Adjust by this % of average velocity
  let avgDX = 0;
  let avgDY = 0;
  let numNeighbors = 0;

  if (boid.value === ZOMBIE) {
    matchingFactor = 0.01;
  }

  for (let otherBoid of board) {
    if (distance(boid, otherBoid) < visualRange) {
      avgDX += otherBoid.velX;
      avgDY += otherBoid.velY;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    avgDX = avgDX / numNeighbors;
    avgDY = avgDY / numNeighbors;

    boid.velX += (avgDX - boid.velX) * matchingFactor;
    boid.velY += (avgDY - boid.velY) * matchingFactor;
  }
}

// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function limitSpeed(boid) {
  let speedLimit = 1;

  if (boid.value === ZOMBIE) {
    speedLimit = 0.3;
  }

  const speed = Math.sqrt(boid.velX * boid.velX + boid.velY * boid.velY);

  if (speed > speedLimit) {
    boid.velX = (boid.velX / speed) * speedLimit;
    boid.velY = (boid.velY / speed) * speedLimit;
  }
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

    // Item out of range
    if (distance(item, item2) > nearbyRange) return;

    results[item2.value]++;
  });

  return results;
}

function totalEntities() {
  return numCivilians + numCorpses + numMedics + numZombies;
}

function loop() {
  board.forEach((item) => {
    if (item.cooldown === 0) {
      flyTowardsCenter(item);
      avoidOthers(item);
      matchVelocity(item);
      limitSpeed(item);
      keepWithinBounds(item);

      item.x += item.velX;
      item.y += item.velY;
    } else {
      item.cooldown--;
    }

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

  if (nearbys[MEDIC] > 0 && item.cooldown < 100) {
    item.value = CIVILIAN;
    item.velX = randomVel();
    item.velY = randomVel();
  }
}

function updateCivilian(item, nearbys) {
  // If there's a medic nearby, you learn
  if (nearbys[MEDIC] > 0) {
    item.training += 1;
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

function drawBoard() {
  clearBoard();
  board.forEach(drawItem);

  if (play) {
    window.requestAnimationFrame(drawBoard);
  }
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

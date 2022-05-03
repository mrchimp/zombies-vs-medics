<script setup lang="ts">
import { ref, onMounted } from "vue";

const showControls = ref(false);

const numCivilians = ref(100);
const numZombies = ref(50);
const numMedics = ref(5);
const numCorpses = ref(0);
const resolutionScale = ref(1);
let graphTickCount = 0;

const corpseCount = ref(0);
const corpseFontSize = ref("");
const zombieCount = ref(0);
const zombieFontSize = ref("");
const medicCount = ref(0);
const medicFontSize = ref("");
const civilianCount = ref(0);
const civilianFontSize = ref("");

const gameTickRateMS = 16;

const bodyScale = 3;
const nearbyRange = bodyScale * 2;

let boardWidth = 0;
let boardHeight = 0;

let play = true;

const visualRange = ref(25);

const BG = -1;
const CORPSE = 0;
const CIVILIAN = 1;
const ZOMBIE = 2;
const MEDIC = 3;

const board = [];

const canvas = ref(null);
let ctx;

onMounted(() => {
  ctx = canvas.value.getContext("2d");

  updateScale();
  ctx.canvas.width = boardWidth;
  ctx.canvas.height = boardHeight;
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  fillBoardRandomly();
  drawBoard();

  window.setInterval(updateCounts, 128);
  window.setInterval(drawGraph, 300);

  if (play) {
    loop();
  }
});

const colors = {
  [CORPSE]: "#632",
  [CIVILIAN]: "#999",
  [ZOMBIE]: "#f00",
  [MEDIC]: "#0f0",
  [BG]: "#000",
};

function onPause() {
  if (play) {
    play = false;
  } else {
    play = true;
    loop();
  }
}

function reset() {
  graphTickCount = 0;

  updateScale();
  board.splice(0);
  fillBoardRandomly();
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, boardWidth, boardHeight);
  drawBoard();
  console.clear();
}

function updateScale() {
  boardWidth = window.innerWidth / resolutionScale.value;
  boardHeight = window.innerHeight / resolutionScale.value;
  ctx.canvas.width = boardWidth;
  ctx.canvas.height = boardHeight;
}

function graphHeight() {
  return 100;
}

function randomVel() {
  return Math.random() * 2 - 1;
}

function fillBoardRandomly() {
  for (let i = 0; i < numCivilians.value; i++) {
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

  for (let i = 0; i < numZombies.value; i++) {
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

  for (let i = 0; i < numMedics.value; i++) {
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

  for (let i = 0; i < numCorpses.value; i++) {
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

function drawItem(item) {
  ctx.fillStyle = colors[item.value];
  ctx.fillRect(item.x, item.y, bodyScale, bodyScale);
}

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

function totalEntities() {
  return (
    numCivilians.value + numCorpses.value + numMedics.value + numZombies.value
  );
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
    if (distance(boid, otherBoid) < visualRange.value) {
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
    if (distance(boid, otherBoid) < visualRange.value) {
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
  const scaleFactor = board.length / 250;
  const counts = countItems();

  corpseCount.value = counts[CORPSE];
  corpseFontSize.value = `${20 + counts[CORPSE] / scaleFactor}px`;

  civilianCount.value = counts[CIVILIAN];
  civilianFontSize.value = `${20 + counts[CIVILIAN] / scaleFactor}px`;

  zombieCount.value = counts[ZOMBIE];
  zombieFontSize.value = `${20 + counts[ZOMBIE] / scaleFactor}px`;

  medicCount.value = counts[MEDIC];
  medicFontSize.value = `${20 + counts[MEDIC] / scaleFactor}px`;
}
</script>

<template>
  <div>
    <canvas ref="canvas"></canvas>

    <div class="controls">
      <button type="button" @click.prevent="showControls = !showControls">
        {{ showControls ? "HIDE" : "Show controls" }}
      </button>
      <div v-if="showControls">
        <div>
          <label for="civilianCount"
            >Civilians [<span v-text="civilianCount"></span>]</label
          >
          <input
            type="range"
            min="0"
            max="500"
            v-model="numCivilians"
            @input="reset"
          />
        </div>
        <div>
          <label for="medicCount"
            >Medics [<span v-text="medicCount"></span>]</label
          >
          <input
            type="range"
            min="0"
            max="500"
            v-model="numMedics"
            @input="reset"
          />
        </div>
        <div>
          <label for="zombieCount"
            >Zombies [<span v-text="zombieCount"></span>]</label
          >
          <input
            type="range"
            min="0"
            max="500"
            v-model="numZombies"
            @input="reset"
          />
        </div>
        <div>
          <label for="resolutionScale"
            >Resolution Scale [<span v-text="resolutionScale"></span>]</label
          >
          <input
            type="range"
            min="1"
            max="10"
            v-model="resolutionScale"
            @input="reset"
          />
        </div>

        <button @click.prevent="onPause">Pause/Play</button>
        <button @click.prevent="reset">Reset</button>
      </div>
    </div>

    <div class="counts">
      <div class="corpse-count">{{ corpseCount }} corpses</div>
      <div class="zombie-count">{{ zombieCount }} zombies</div>
      <div class="medic-count">{{ medicCount }} medics</div>
      <div class="civilian-count">{{ civilianCount }} civilians</div>
    </div>
  </div>
</template>

<style scoped>
canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  z-index: 1;
}
.controls {
  background: white;
  display: flex;
  flex-direction: column;
  opacity: 0.5;
  padding: 0.5rem;
  position: absolute;
  right: 0;
  top: 0;
  width: 10rem;
  z-index: 3;
}
.controls input {
  width: 100%;
}
.counts {
  font-size: 21px;
  font-weight: bold;
  left: 0;
  opacity: 0.7;
  padding: 10px;
  position: absolute;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  top: 0;
  z-index: 2;
}
.zombie-count {
  color: #900;
}
.medic-count {
  color: #0b0;
}
.civilian-count {
  color: #aaa;
}
.corpse-count {
  color: #632;
}
</style>

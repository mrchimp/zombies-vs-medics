<script setup lang="ts">
import { ref, onMounted } from "vue";
import ControlInput from "./ControlInput.vue";

enum ItemType {
  Corpse = 0,
  Civilian = 1,
  Zombie = 2,
  Medic = 3,
}

const Colors = {
  [ItemType.Corpse]: "#632",
  [ItemType.Civilian]: "#999",
  [ItemType.Zombie]: "#f00",
  [ItemType.Medic]: "#0f0",
};

const bgColor = "#000";

interface Item {
  x: number;
  y: number;
  velX: number;
  velY: number;
  value: ItemType;
  cooldown: number;
  training: number;
}

interface Nearbys {
  [ItemType.Corpse]: number;
  [ItemType.Civilian]: number;
  [ItemType.Zombie]: number;
  [ItemType.Medic]: number;
}

const showControls = ref(false);

const numCivilians = ref(100);
const numZombies = ref(50);
const numMedics = ref(5);
const numCorpses = ref(0);
const resolutionScale = ref(2);
let graphTickCount = 0;

const CorpseCount = ref(0);
const CorpseFontSize = ref("");
const zombieCount = ref(0);
const zombieFontSize = ref("");
const medicCount = ref(0);
const medicFontSize = ref("");
const civilianCount = ref(0);
const civilianFontSize = ref("");

const civilianCenteringFactor = ref(0.001);
const zombieCenteringFactor = ref(0.0005);
const medicCenteringFactor = ref(0.001);

const gameTickRateMS = 16;

const bodyScale = 3;
const nearbyRange = bodyScale * 2;

let boardWidth = 0;
let boardHeight = 0;

let play = true;

const visualRange = ref(25);

const board: Item[] = [];

const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D;

onMounted(() => {
  ctx = canvas.value?.getContext("2d")!;

  updateScale();
  ctx.canvas.width = boardWidth;
  ctx.canvas.height = boardHeight;
  ctx.imageSmoothingEnabled = false;
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
      value: ItemType.Civilian,
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
      value: ItemType.Zombie,
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
      value: ItemType.Medic,
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
      value: ItemType.Corpse,
      cooldown: 2000,
      training: 0,
    });
  }
}

function clearBoard() {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, boardWidth, boardHeight - graphHeight());
}

function drawBoard() {
  clearBoard();
  board.forEach(drawItem);

  if (play) {
    window.requestAnimationFrame(drawBoard);
  }
}

function drawItem(item: Item) {
  ctx.fillStyle = Colors[item.value];
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
  let civilianHeight = (counts[ItemType.Civilian] / total) * 100;
  let medicHeight = (counts[ItemType.Medic] / total) * 100;
  let CorpseHeight = (counts[ItemType.Corpse] / total) * 100;
  let zombieHeight = (counts[ItemType.Zombie] / total) * 100;

  ctx.fillStyle = Colors[ItemType.Civilian];
  ctx.fillRect(graphTickCount, y, 1, civilianHeight);

  y += civilianHeight;

  ctx.fillStyle = Colors[ItemType.Medic];
  ctx.fillRect(graphTickCount, y, 1, medicHeight);

  y += medicHeight;

  ctx.fillStyle = Colors[ItemType.Corpse];
  ctx.fillRect(graphTickCount, y, 1, CorpseHeight);

  y += CorpseHeight;

  ctx.fillStyle = Colors[ItemType.Zombie];
  ctx.fillRect(graphTickCount, y, 1, zombieHeight);
}

function totalEntities() {
  return (
    numCivilians.value + numCorpses.value + numMedics.value + numZombies.value
  );
}

function distance(item1: Item, item2: Item) {
  return Math.sqrt(
    (item1.x - item2.x) * (item1.x - item2.x) +
      (item1.y - item2.y) * (item1.y - item2.y)
  );
}

// Constrain a boid to within the window. If it gets too close to an edge,
// nudge it back in and reverse its direction.
function keepWithinBounds(item: Item) {
  const margin = 10;
  const turnFactor = 0.5;

  if (item.x < margin) {
    item.velX += turnFactor;
  }
  if (item.x > boardWidth - margin) {
    item.velX -= turnFactor;
  }
  if (item.y < margin) {
    item.velY += turnFactor;
  }
  if (item.y > boardHeight - graphHeight() - margin) {
    item.velY -= turnFactor;
  }
}

// Find the center of mass of the other boids and adjust velocity slightly to
// point towards the center of mass.
function flyTowardsCenter(item: Item) {
  let centeringFactor; // adjust velocity by this %
  let centerX = 0;
  let centerY = 0;
  let numNeighbors = 0;

  switch (item.value) {
    case ItemType.Zombie:
      centeringFactor = zombieCenteringFactor.value;
      break;
    case ItemType.Medic:
      centeringFactor = medicCenteringFactor.value;
      break;
    case ItemType.Civilian:
    default:
      centeringFactor = civilianCenteringFactor.value;
      break;
  }

  for (let otherItem of board) {
    if (distance(item, otherItem) < visualRange.value) {
      centerX += otherItem.x;
      centerY += otherItem.y;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    centerX = centerX / numNeighbors;
    centerY = centerY / numNeighbors;

    item.velX += (centerX - item.x) * centeringFactor;
    item.velY += (centerY - item.y) * centeringFactor;
  }
}

// Move away from other boids that are too close to avoid colliding
function avoidOthers(item: Item) {
  let minDistance = 4; // The distance to stay away from other boids
  let avoidFactor = 0.03; // Adjust velocity by this %

  if (item.value === ItemType.Zombie) {
    minDistance = 4;
    avoidFactor = 0.03;
  }

  let moveX = 0;
  let moveY = 0;
  for (let otherBoid of board) {
    if (otherBoid !== item) {
      if (distance(item, otherBoid) < minDistance) {
        moveX += item.x - otherBoid.x;
        moveY += item.y - otherBoid.y;
      }
    }
  }

  item.velX += moveX * avoidFactor;
  item.velY += moveY * avoidFactor;
}

// Find the average velocity (speed and direction) of the other boids and
// adjust velocity slightly to match.
function matchVelocity(item: Item) {
  let matchingFactor = 0.05; // Adjust by this % of average velocity
  let avgDX = 0;
  let avgDY = 0;
  let numNeighbors = 0;

  if (item.value === ItemType.Zombie) {
    matchingFactor = 0.01;
  }

  for (let otherItem of board) {
    if (distance(item, otherItem) < visualRange.value) {
      avgDX += otherItem.velX;
      avgDY += otherItem.velY;
      numNeighbors += 1;
    }
  }

  if (numNeighbors) {
    avgDX = avgDX / numNeighbors;
    avgDY = avgDY / numNeighbors;

    item.velX += (avgDX - item.velX) * matchingFactor;
    item.velY += (avgDY - item.velY) * matchingFactor;
  }
}

// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function limitSpeed(item: Item) {
  let speedLimit = 1;

  if (item.value === ItemType.Zombie) {
    speedLimit = 0.3;
  }

  const speed = Math.sqrt(item.velX * item.velX + item.velY * item.velY);

  if (speed > speedLimit) {
    item.velX = (item.velX / speed) * speedLimit;
    item.velY = (item.velY / speed) * speedLimit;
  }
}

function loop() {
  board.forEach((item: Item) => {
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
      case ItemType.Corpse:
        updateCorpse(item, nearbys);
        break;
      case ItemType.Civilian:
        updateCivilian(item, nearbys);
        break;
      case ItemType.Medic:
        updateMedic(item, nearbys);
        break;
      case ItemType.Zombie:
        updateZombie(item, nearbys);
        break;
    }
  });

  if (play === true) {
    window.setTimeout(loop, gameTickRateMS);
  }
}

function updateCorpse(item: Item, nearbys: Nearbys): void {
  if (item.cooldown === 0) {
    item.value = ItemType.Zombie;
    item.velX = randomVel();
    item.velY = randomVel();
  }

  if (nearbys[ItemType.Medic] > 0 && item.cooldown < 100) {
    item.value = ItemType.Civilian;
    item.velX = randomVel();
    item.velY = randomVel();
  }
}

function updateCivilian(item: Item, nearbys: Nearbys): void {
  // If there's a medic nearby, you learn
  if (nearbys[ItemType.Medic] > 0) {
    item.training += 1;
  }

  if (item.training > 100) {
    item.value = ItemType.Medic;
    item.velX = randomVel();
    item.velY = randomVel();
    return;
  }

  // If there are zombies but not enough civilians, you got got
  if (nearbys[ItemType.Zombie] > 0) {
    item.value = ItemType.Corpse;
    item.velX = randomVel();
    item.velY = randomVel();
    item.cooldown = 200;
    return;
  }
}

function updateMedic(item: Item, nearbys: Nearbys) {
  // If there are zombies nearby and not enough civilians, you get got
  if (nearbys[ItemType.Zombie] > 1 && nearbys[ItemType.Civilian] < 1) {
    item.value = ItemType.Zombie;
    item.velX = randomVel();
    item.velY = randomVel();
    item.cooldown = 50;
  }
}

function updateZombie(item: Item, nearbys: Nearbys) {
  if (nearbys[ItemType.Medic] > 0) {
    item.value = ItemType.Civilian;
    item.velX = randomVel();
    item.velY = randomVel();
    item.cooldown = 50;
  }
}

function countNearby(item: Item) {
  const results = {
    [ItemType.Civilian]: 0,
    [ItemType.Zombie]: 0,
    [ItemType.Corpse]: 0,
    [ItemType.Medic]: 0,
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
    [ItemType.Civilian]: 0,
    [ItemType.Medic]: 0,
    [ItemType.Zombie]: 0,
    [ItemType.Corpse]: 0,
  };

  board.forEach((item) => {
    counts[item.value]++;
  });

  return counts;
}

function updateCounts() {
  const scaleFactor = board.length / 250;
  const counts = countItems();

  CorpseCount.value = counts[ItemType.Corpse];
  CorpseFontSize.value = `${20 + counts[ItemType.Corpse] / scaleFactor}px`;

  civilianCount.value = counts[ItemType.Civilian];
  civilianFontSize.value = `${20 + counts[ItemType.Civilian] / scaleFactor}px`;

  zombieCount.value = counts[ItemType.Zombie];
  zombieFontSize.value = `${20 + counts[ItemType.Zombie] / scaleFactor}px`;

  medicCount.value = counts[ItemType.Medic];
  medicFontSize.value = `${20 + counts[ItemType.Medic] / scaleFactor}px`;
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
        <ControlInput
          label="Civilians"
          v-model="numCivilians"
          :min="0"
          :max="500"
          @input="reset"
        ></ControlInput>
        <ControlInput
          label="Medics"
          v-model="numMedics"
          :min="0"
          :max="500"
          @input="reset"
        ></ControlInput>
        <ControlInput
          label="Zombies"
          v-model="numZombies"
          :min="0"
          :max="500"
          @input="reset"
        ></ControlInput>
        <ControlInput
          label="Resolution Scale"
          v-model="resolutionScale"
          :min="1"
          :max="10"
          @input="reset"
        ></ControlInput>
        <ControlInput
          label="Visual Range"
          v-model="visualRange"
          :min="1"
          :max="200"
        ></ControlInput>

        <!-- Centering Factors -->
        <ControlInput
          label="Civilian Centering Factor"
          v-model="civilianCenteringFactor"
          :min="0"
          :max="0.1"
          :step="0.001"
        ></ControlInput>
        <ControlInput
          label="Medic Centering Factor"
          v-model="medicCenteringFactor"
          :min="0"
          :max="0.1"
          :step="0.001"
        ></ControlInput>
        <ControlInput
          label="Zombie Centering Factor"
          v-model="zombieCenteringFactor"
          :min="0"
          :max="0.1"
          :step="0.001"
        ></ControlInput>

        <button @click.prevent="onPause">Pause/Play</button>
        <button @click.prevent="reset">Reset</button>
      </div>
    </div>

    <div class="counts">
      <div class="Corpse-count">{{ CorpseCount }} Corpses</div>
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
  width: 12rem;
  z-index: 3;
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
.Corpse-count {
  color: #632;
}
</style>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import ControlInput from "./ControlInput.vue";
import ControlGroup from "./ControlGroup.vue";

enum ItemType {
  Corpse = 0,
  Civilian = 1,
  Zombie = 2,
  Medic = 3,
}

const Colors = {
  [ItemType.Corpse]: "hsla(0, 0%, 255%, 0.1)",
  [ItemType.Civilian]: "#e8ff4f",
  [ItemType.Zombie]: "#ff534f",
  [ItemType.Medic]: "#67adfe",
};

const bgColor = "hsl(258, 57%, 10%)";

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

interface CenteringFactors {
  [ItemType.Civilian]: {
    [ItemType.Civilian]: ItemType;
    [ItemType.Medic]: ItemType;
    [ItemType.Zombie]: ItemType;
    [ItemType.Corpse]: ItemType;
  };
  [ItemType.Zombie]: {
    [ItemType.Civilian]: ItemType;
    [ItemType.Medic]: ItemType;
    [ItemType.Zombie]: ItemType;
    [ItemType.Corpse]: ItemType;
  };
  [ItemType.Medic]: {
    [ItemType.Civilian]: ItemType;
    [ItemType.Medic]: ItemType;
    [ItemType.Zombie]: ItemType;
    [ItemType.Corpse]: ItemType;
  };
  [ItemType.Corpse]: {
    [ItemType.Civilian]: ItemType;
    [ItemType.Medic]: ItemType;
    [ItemType.Zombie]: ItemType;
    [ItemType.Corpse]: ItemType;
  };
}

const showControls = ref(false);

const resolutionScale = ref(2);
let graphTickCount = 0;

const numCorpses = ref(0);
const corpseCount = ref(0);
const corpseFontSize = ref("");

const numCivilians = ref(100);
const civilianCount = ref(0);
const civilianFontSize = ref("");
const civilianMinDistance = ref(4);
const civilianAvoidFactor = ref(0.03);
const civilianVelocityMatchingFactor = ref(0.005);
const civilianSpeedLimit = ref(0.8);

const numMedics = ref(5);
const medicCount = ref(0);
const medicFontSize = ref("");
const medicMinDistance = ref(4);
const medicAvoidFactor = ref(0.03);
const medicVelocityMatchingFactor = ref(0.005);
const medicSpeedLimit = ref(0.8);

const numZombies = ref(50);
const zombieCount = ref(0);
const zombieFontSize = ref("");
const zombieMinDistance = ref(4);
const zombieAvoidFactor = ref(0.03);
const zombieVelocityMatchingFactor = ref(0.01);
const zombieSpeedLimit = ref(0.4);

const centeringFactors = ref<CenteringFactors>({
  [ItemType.Civilian]: {
    [ItemType.Civilian]: 0.001,
    [ItemType.Medic]: 0.001,
    [ItemType.Zombie]: -0.001,
    [ItemType.Corpse]: 0,
  },
  [ItemType.Zombie]: {
    [ItemType.Civilian]: 0.001,
    [ItemType.Medic]: 0.001,
    [ItemType.Zombie]: 0.001,
    [ItemType.Corpse]: 0.001,
  },
  [ItemType.Medic]: {
    [ItemType.Civilian]: 0.001,
    [ItemType.Medic]: 0.001,
    [ItemType.Zombie]: 0.001,
    [ItemType.Corpse]: 0.001,
  },
  [ItemType.Corpse]: {
    [ItemType.Civilian]: 0,
    [ItemType.Medic]: 0,
    [ItemType.Zombie]: 0,
    [ItemType.Corpse]: 0,
  },
});

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
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  fillBoardRandomly();
  drawBoard();

  window.setInterval(updateCounts, 128);
  window.setInterval(drawGraph, 300);

  if (play) {
    loop();
  }
});

function playPause() {
  if (play) {
    play = false;
  } else {
    play = true;
    loop();
    drawBoard();
  }
}

function reset() {
  graphTickCount = 0;

  updateScale();
  board.splice(0);
  fillBoardRandomly();
  ctx.fillStyle = bgColor;
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
  return 50;
}

function randomVel() {
  return Math.random() * 2 - 1;
}

function fillBoardRandomly() {
  for (let i = 0; i < numCivilians.value; i++) {
    board.push({
      x: Math.floor(Math.random() * boardWidth),
      y: Math.floor(
        Math.random() * (boardHeight - graphHeight() - bodyScale - bodyScale)
      ),
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
      y: Math.floor(
        Math.random() * (boardHeight - graphHeight() - bodyScale - bodyScale)
      ),
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
      y: Math.floor(
        Math.random() * (boardHeight - graphHeight() - bodyScale - bodyScale)
      ),
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
      y: Math.floor(
        Math.random() * (boardHeight - graphHeight() - bodyScale - bodyScale)
      ),
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

  ctx.fillStyle = Colors[ItemType.Corpse];
  ctx.fillRect(graphTickCount, y, 1, CorpseHeight);

  y += CorpseHeight;

  ctx.fillStyle = Colors[ItemType.Medic];
  ctx.fillRect(graphTickCount, y, 1, medicHeight);

  y += medicHeight;

  ctx.fillStyle = Colors[ItemType.Civilian];
  ctx.fillRect(graphTickCount, y, 1, civilianHeight);

  y += civilianHeight;

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
  let centeringFactor = 0; // adjust velocity by this %
  let centerX = 0;
  let centerY = 0;
  let numNeighbors = 0;

  for (let otherItem of board) {
    if (distance(item, otherItem) < visualRange.value) {
      centeringFactor = centeringFactors.value[item.value][otherItem.value];

      // Civilians aren't attracted to zombies
      if (
        item.value === ItemType.Civilian &&
        otherItem.value === ItemType.Zombie
      ) {
        continue;
      }

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
  let minDistance; // The distance to stay away from other boids
  let avoidFactor; // Adjust velocity by this %

  switch (item.value) {
    case ItemType.Zombie:
      minDistance = zombieMinDistance.value;
      avoidFactor = zombieAvoidFactor.value;
      break;
    case ItemType.Medic:
      minDistance = medicMinDistance.value;
      avoidFactor = medicAvoidFactor.value;
      break;
    case ItemType.Civilian:
    default:
      minDistance = civilianMinDistance.value;
      avoidFactor = civilianAvoidFactor.value;
      break;
  }

  let moveX = 0;
  let moveY = 0;

  for (let otherBoid of board) {
    // Don't avoid corpses to prevent corpse walls
    if (otherBoid.value === ItemType.Corpse) {
      continue;
    }

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
  let matchingFactor; // Adjust by this % of average velocity
  let avgDX = 0;
  let avgDY = 0;
  let numNeighbors = 0;

  switch (item.value) {
    case ItemType.Zombie:
      matchingFactor = zombieVelocityMatchingFactor.value;
      break;
    case ItemType.Medic:
      matchingFactor = medicVelocityMatchingFactor.value;
      break;
    case ItemType.Civilian:
    default:
      matchingFactor = civilianVelocityMatchingFactor.value;
      break;
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

  switch (item.value) {
    case ItemType.Civilian:
      speedLimit = civilianSpeedLimit.value;
      break;
    case ItemType.Medic:
      speedLimit = medicSpeedLimit.value;
      break;
    case ItemType.Zombie:
      speedLimit = zombieSpeedLimit.value;
      break;
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
  const scaleFactor = board.length / 150;
  const counts = countItems();

  corpseCount.value = counts[ItemType.Corpse];
  corpseFontSize.value = `${20 + counts[ItemType.Corpse] / scaleFactor}px`;

  civilianCount.value = counts[ItemType.Civilian];
  civilianFontSize.value = `${20 + counts[ItemType.Civilian] / scaleFactor}px`;

  zombieCount.value = counts[ItemType.Zombie];
  zombieFontSize.value = `${20 + counts[ItemType.Zombie] / scaleFactor}px`;

  medicCount.value = counts[ItemType.Medic];
  medicFontSize.value = `${20 + counts[ItemType.Medic] / scaleFactor}px`;
}
</script>

<template>
  <div class="zombies">
    <canvas ref="canvas"></canvas>

    <div class="controls">
      <button
        v-if="!showControls"
        type="button"
        @click.prevent="showControls = true"
      >
        Controls
      </button>
      <div v-else>
        <div class="controls-inner">
          <div v-if="showControls">
            <div class="button-group">
              <button type="button" @click.prevent="playPause">
                Pause/Play
              </button>
              <button type="button" @click.prevent="reset">Reset</button>
              <button type="button" @click.prevent="showControls = false">
                Hide Controls
              </button>
            </div>
            <ControlGroup label="Simulation settings">
              <strong>
                Warning: changing controls in this section will restart the
                simulation!
              </strong>
              <hr />
              <ControlInput
                label="Civilians"
                title="How many civilians the simulation will start with"
                v-model="numCivilians"
                :min="0"
                :max="500"
                @input="reset"
              ></ControlInput>
              <ControlInput
                label="Medics"
                title="How many medics the simulation will start with"
                v-model="numMedics"
                :min="0"
                :max="500"
                @input="reset"
              ></ControlInput>
              <ControlInput
                label="Zombies"
                title="How many zombies the simulation will start with"
                v-model="numZombies"
                :min="0"
                :max="500"
                @input="reset"
              ></ControlInput>
              <ControlInput
                label="Resolution Scale"
                title="Increasing this will increase the pixelation but improve performance"
                v-model="resolutionScale"
                :min="1"
                :max="10"
                @input="reset"
              ></ControlInput>
            </ControlGroup>

            <hr />

            <ControlInput
              label="Visual Range"
              title="Maximum distance that players will be affected by others"
              v-model="visualRange"
              :min="1"
              :max="200"
            ></ControlInput>

            <ControlGroup label="Civilian Options">
              <ControlInput
                label="Civilian Attraction"
                title="How much the civilians will be pulled towards civilians"
                v-model="centeringFactors[ItemType.Civilian][ItemType.Civilian]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Medic Attraction"
                title="How much the civilians will be pulled towards medics"
                v-model="centeringFactors[ItemType.Civilian][ItemType.Medic]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Zombie Attraction"
                title="How much the civilians will be pulled towards zombies"
                v-model="centeringFactors[ItemType.Civilian][ItemType.Zombie]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Min Distance"
                title="How close civilians are allowed to be to others"
                v-model="civilianMinDistance"
                :min="0"
                :max="20"
              ></ControlInput>
              <ControlInput
                label="Avoid Factor"
                title="How actively civilians try to avoid being too close to each other"
                v-model="civilianAvoidFactor"
                :min="0"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Velocity Matching"
                title="How much civilians will try to match the velocity of others"
                v-model="civilianVelocityMatchingFactor"
                :min="0"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Max Speed"
                title="How fast civilians can move"
                v-model="civilianSpeedLimit"
                :min="0"
                :max="2"
                :step="0.001"
              ></ControlInput>
            </ControlGroup>

            <ControlGroup label="Medic Options">
              <ControlInput
                label="Civilian Attraction"
                title="How much the medics will be pulled towards civilians"
                v-model="centeringFactors[ItemType.Medic][ItemType.Civilian]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Medic Attraction"
                title="How much the medics will be pulled towards medics"
                v-model="centeringFactors[ItemType.Medic][ItemType.Medic]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Zombie Attraction"
                title="How much the medics will be pulled towards zombies"
                v-model="centeringFactors[ItemType.Medic][ItemType.Zombie]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Min Distance"
                title="How close medics are allowed to be to others"
                v-model="medicMinDistance"
                :min="0"
                :max="20"
              ></ControlInput>
              <ControlInput
                label="Avoid Factor"
                title="How actively medics try to avoid being too close to each other"
                v-model="medicAvoidFactor"
                :min="0"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Velocity Matching"
                title="How much medics will try to match the velocity of others"
                v-model="medicVelocityMatchingFactor"
                :min="0"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Max Speed"
                title="How fast medic can move"
                v-model="medicSpeedLimit"
                :min="0"
                :max="2"
                :step="0.001"
              ></ControlInput>
            </ControlGroup>

            <ControlGroup label="Zombie Options">
              <ControlInput
                label="Civilian Attraction"
                title="How much the zombies will be pulled towards civilians"
                v-model="centeringFactors[ItemType.Zombie][ItemType.Civilian]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Medic Attraction"
                title="How much the zombies will be pulled towards medics"
                v-model="centeringFactors[ItemType.Zombie][ItemType.Medic]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Zombie Attraction"
                title="How much the zombies will be pulled towards zombies"
                v-model="centeringFactors[ItemType.Zombie][ItemType.Zombie]"
                :min="-0.1"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Min Distance"
                title="How close zombies are allowed to be to others"
                v-model="zombieMinDistance"
                :min="0"
                :max="20"
              ></ControlInput>
              <ControlInput
                label="Avoid Factor"
                title="How actively zombies try to avoid being too close to each other"
                v-model="zombieAvoidFactor"
                :min="0"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Velocity Matching"
                title="How much zombies will try to match the velocity of others"
                v-model="zombieVelocityMatchingFactor"
                :min="0"
                :max="0.1"
                :step="0.001"
              ></ControlInput>
              <ControlInput
                label="Max Speed"
                title="How fast zombies can move"
                v-model="zombieSpeedLimit"
                :min="0"
                :max="2"
                :step="0.001"
              ></ControlInput>
            </ControlGroup>
          </div>
        </div>
      </div>
    </div>

    <div class="counts">
      <div
        class="count corpse-count"
        :style="{
          'font-size': corpseFontSize,
        }"
      >
        {{ corpseCount }} Corpses
      </div>
      <div
        class="count zombie-count"
        :style="{
          'font-size': zombieFontSize,
        }"
      >
        {{ zombieCount }} zombies
      </div>
      <div
        class="count medic-count"
        :style="{
          'font-size': medicFontSize,
        }"
      >
        {{ medicCount }} medics
      </div>
      <div
        class="count civilian-count"
        :style="{
          'font-size': civilianFontSize,
        }"
      >
        {{ civilianCount }} civilians
      </div>
    </div>
  </div>
</template>

<style scoped>
.zombies {
  --zombie-color: hsl(1, 100%, 65%);
  --medic-color: hsl(212, 99%, 70%);
  --civilian-color: hsl(68, 100%, 65%);
  --corpse-color: hsl(0, 0%, 255%, 0.2);
}
hr {
  color: #eee;
  margin: 2rem 0;
}
button {
  background: transparent;
  border: 1px solid white;
  border-radius: 8px;
  margin: 2px;
  padding: 0.5em;
  color: white;
}
.button-group {
  display: flex;
  gap: 5px;
}
canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  z-index: 1;
}
.controls {
  background: hsla(258, 57%, 10%, 0.95);
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 3;
}
.controls-inner {
  height: 100%;
  padding: 0.5rem;
  width: 24rem;
}
.counts {
  font-size: 21px;
  font-weight: bold;
  left: 0;
  line-height: 1;
  opacity: 0.5;
  padding: 10px;
  position: absolute;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  top: 0;
  transform: translateZ(0);
  z-index: 2;
}
.count {
  margin-top: 0.1em;
}
.zombie-count {
  color: var(--zombie-color);
}
.medic-count {
  color: var(--medic-color);
}
.civilian-count {
  color: var(--civilian-color);
}
.corpse-count {
  color: var(--corpse-color);
}
</style>

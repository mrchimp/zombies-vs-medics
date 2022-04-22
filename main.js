class Game {
  constructor() {
    this.numCivilians = 1000;
    this.numMedics = 50;
    this.numZombies = 500;
    this.bodyScale = 3;
    this.bodyStyle = "rect";
    this.resolutionScale = 1;
    this.gameTickRateMS = 32;
    this.renderTickRateMS = 32;
    this.nearbyRange = this.bodyScale * 3;
    this.EMPTY = 0;
    this.CIVILIAN = 1;
    this.ZOMBIE = 2;
    this.MEDIC = 3;
    this.CORPSE = 4;
    this.play = false;
    this.canvas = document.getElementById("canvas");
    this.ctx = canvas.getContext("2d");
    this.board = [];

    // Display values
    this.zombieCount = 0;
    this.civilianCount = 0;
    this.medicCount = 0;
    this.corpseCount = 0;
    this.zombieStyle = {};
    this.civilianStyle = {};
    this.medicStyle = {};
    this.corpseStyle = {};

    this.updateScale();

    this.ctx.canvas.width = this.boardWidth;
    this.ctx.canvas.height = this.boardHeight;
    this.ctx.imageSmoothingEnabled = false;

    this.fillBoardRandomly();
    this.drawBoard();

    window.setInterval(() => {
      if (this.play) {
        this.drawBoard();
      }
    }, this.renderTickRateMS);

    window.setInterval(() => {
      if (this.play) {
        this.updateCounts();
      }
    }, 128);

    this.loop();
  }

  togglePlay() {
    if (this.play === true) {
      this.play = false;
    } else {
      this.play = true;
      this.loop();
    }
  }

  reset() {
    this.updateScale();
    this.fillBoardRandomly();
    this.clearBoard();
    this.drawBoard();
  }

  updateScale(e) {
    this.boardWidth = window.innerWidth / this.resolutionScale;
    this.boardHeight = window.innerHeight / this.resolutionScale;
    this.ctx.canvas.width = this.boardWidth;
    this.ctx.canvas.height = this.boardHeight;
  }

  limitX(x) {
    return Math.max(Math.min(x, this.boardWidth - 1), 0);
  }

  limitY(x) {
    return Math.max(Math.min(x, this.boardHeight - 1), 0);
  }

  countNearby(x, y) {
    const results = {
      [this.CIVILIAN]: 0,
      [this.ZOMBIE]: 0,
      [this.EMPTY]: 0,
      [this.MEDIC]: 0,
      null: 0,
    };

    this.board.forEach((item) => {
      if (item.cooldown > 0) return;
      if (item.x < x - this.nearbyRange) return;
      if (item.x > x + this.nearbyRange) return;
      if (item.y < y - this.nearbyRange) return;
      if (item.y > y + this.nearbyRange) return;

      results[item.value]++;
    });

    return results;
  }

  loop() {
    this.board.forEach((item) => {
      if (this.value !== this.CORPSE) {
        if (item.cooldown === 0) {
          let xDelta = Math.floor(Math.random() * 3) - 1;
          let yDelta = Math.floor(Math.random() * 3) - 1;

          xDelta += item.velX;
          yDelta += item.velY;

          let newX = this.limitX(item.x + xDelta);
          let newY = this.limitY(item.y + yDelta);
          // Move entity to new position
          item.x = newX;
          item.y = newY;
        } else {
          item.cooldown--;
        }

        // Bounce off walls
        if (item.x === 0) item.velX = 1;
        if (item.x === this.boardWidth - 1) item.velX = -1;
        if (item.y === 0) item.velY = 1;
        if (item.y === this.boardHeight - 1) item.velY = -1;
      }

      const nearbys = this.countNearby(item.x, item.y);

      switch (item.value) {
        case this.CIVILIAN:
          this.updateCivilian(item, nearbys);
          break;
        case this.MEDIC:
          this.updateMedic(item, nearbys);
          break;
        case this.ZOMBIE:
          this.updateZombie(item, nearbys);
          break;
        case this.CORPSE:
          this.updateCorpse(item, nearbys);
          break;
      }
    });

    if (this.play) {
      window.setTimeout(() => {
        this.loop();
      }, this.gameTickRateMS);
    }
  }

  updateCivilian(item, nearbys) {
    // Medics can teach civilians
    if (nearbys[this.MEDIC] > 1) {
      item.value = this.MEDIC;
    }

    // Zombies can get civilians
    if (nearbys[this.ZOMBIE] > 1) {
      item.value = this.ZOMBIE;
      item.cooldown = 50;
    }
  }

  updateMedic(item, nearbys) {
    // Zombies can get medics
    if (nearbys[this.ZOMBIE] > 1 && nearbys[this.CIVILIAN] < 1) {
      item.value = this.ZOMBIE;
      item.cooldown = 50;
    }
  }

  updateZombie(item, nearbys) {
    // Medics can heal zombies
    if (nearbys[this.MEDIC] > 0) {
      item.value = this.CIVILIAN;
      item.cooldown = 50;
    }
  }

  updateCorpse(item, nearbys) {
    item.zombieness++;

    // They've been a zombie for too long. They die.
    if (item.zombieness > 1000) {
      item.value = this.ZOMBIE;
      item.zombieness = 0;
      return;
    }
  }

  clearBoard() {
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);
  }

  drawBoard() {
    this.clearBoard();
    this.board.forEach((item) => {
      this.drawItem(item);
    });
  }

  fillBoardRandomly() {
    this.board = [];

    for (let i = 0; i < this.numCivilians; i++) {
      this.board.push({
        x: Math.floor(Math.random() * this.boardWidth),
        y: Math.floor(Math.random() * this.boardHeight),
        velX: Math.floor(Math.random() * 3) - 1,
        velY: Math.floor(Math.random() * 3) - 1,
        value: this.CIVILIAN,
        cooldown: 0,
        zombieness: 0,
      });
    }

    for (let i = 0; i < this.numZombies; i++) {
      this.board.push({
        x: Math.floor(Math.random() * this.boardWidth),
        y: Math.floor(Math.random() * this.boardHeight),
        velX: Math.floor(Math.random() * 3) - 1,
        velY: Math.floor(Math.random() * 3) - 1,
        value: this.ZOMBIE,
        cooldown: 0,
        zombieness: 0,
      });
    }

    for (let i = 0; i < this.numMedics; i++) {
      this.board.push({
        x: Math.floor(Math.random() * this.boardWidth),
        y: Math.floor(Math.random() * this.boardHeight),
        velX: Math.floor(Math.random() * 3) - 1,
        velY: Math.floor(Math.random() * 3) - 1,
        value: this.MEDIC,
        cooldown: 0,
        zombieness: 0,
      });
    }
  }

  drawItem(item) {
    switch (item.value) {
      case this.CIVILIAN:
        this.ctx.fillStyle = "#999";
        break;
      case this.ZOMBIE:
        this.ctx.fillStyle = "#f00";
        break;
      case this.MEDIC:
        this.ctx.fillStyle = "#0f0";
        break;
      case this.CORPSE:
        this.ctx.fillStyle = "#b62";
        break;
    }

    if (this.bodyStyle === "rect") {
      this.ctx.fillRect(item.x, item.y, this.bodyScale, this.bodyScale);
    } else {
      this.ctx.beginPath();
      this.ctx.arc(item.x, item.y, this.bodyScale, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  updateCounts() {
    const counts = {
      [this.CIVILIAN]: 0,
      [this.MEDIC]: 0,
      [this.ZOMBIE]: 0,
      [this.CORPSE]: 0,
    };

    let scaleFactor = this.board.length / 250;

    this.board.forEach((item) => {
      counts[item.value]++;
    });

    this.civilianCount = counts[this.CIVILIAN];
    this.zombieCount = counts[this.ZOMBIE];
    this.medicCount = counts[this.MEDIC];
    this.corpseCount = counts[this.CORPSE];

    this.civilianStyle = {
      fontSize: `${20 + counts[this.CIVILIAN] / scaleFactor}px`,
    };
    this.zombieStyle = {
      fontSize: `${20 + counts[this.ZOMBIE] / scaleFactor}px`,
    };
    this.medicStyle = {
      fontSize: `${20 + counts[this.MEDIC] / scaleFactor}px`,
    };
    this.corpseStyle = {
      fontSize: `${20 + counts[this.CORPSE] / scaleFactor}px`,
    };

    // this.civilianCountOutput.innerHTML = counts[this.CIVILIAN];
    // this.civilianCountOutput.style.fontSize = `${
    //   20 + counts[this.CIVILIAN] / (this.board.length / 250)
    // }px`;

    // this.zombieCountOutput.innerHTML = counts[this.ZOMBIE];
    // this.zombieCountOutput.style.fontSize = `${
    //   20 + counts[this.ZOMBIE] / (this.board.length / 250)
    // }px`;

    // this.medicCountOutput.innerHTML = counts[this.MEDIC];
    // this.medicCountOutput.style.fontSize = `${
    //   20 + counts[this.MEDIC] / (this.board.length / 250)
    // }px`;
  }
}

const game = new Game();

console.log("game", game);

document.addEventListener("alpine:init", () => {
  Alpine.data("game", () => {
    return game;
  });
});

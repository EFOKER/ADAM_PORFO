// Game constants
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 2;
const ENEMY_SPAWN_INTERVAL = 1500; // ms
const POWERUP_SPAWN_INTERVAL = 10000; // ms
const POWERUP_DURATION = 8000; // ms

// Game state
let keys = {};
let bullets = [];
let enemies = [];
let powerUps = [];
let companions = [];
let explosions = [];

let score = 0;
let highScore = 0;
let health = 3;
let powerUpCount = 0;
let powerUpActive = false;
let powerUpEndTime = 0;

let gameOver = false;

// Player object
const player = {
  x: WIDTH / 2 - PLAYER_WIDTH / 2,
  y: HEIGHT - PLAYER_HEIGHT - 10,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  speed: PLAYER_SPEED,
  canShoot: true,
  shootCooldown: 300, // ms
  lastShotTime: 0,
};

// Utility functions
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Input handlers
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  // Press H to consume a power-up and increase health
  if (e.code === 'KeyH') {
    if (powerUpCount > 0 && health < 5) {
      powerUpCount -= 1;
      health += 1;
      updateHealthUI();
      updatePowerUpsUI();
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Game functions
function drawPlayer() {
  ctx.fillStyle = powerUpActive ? '#00ffff' : '#0ff';
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.closePath();
  ctx.fill();
}

function drawBullet(bullet) {
  ctx.fillStyle = '#ff0';
  ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

function drawEnemy(enemy) {
  ctx.fillStyle = '#f00';
  ctx.beginPath();
  ctx.arc(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, enemy.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Draw power-ups with different colors for health and companion
function drawPowerUp(powerUp) {
  if (powerUp.isHealth) {
    ctx.fillStyle = '#ff69b4'; // pink for health
  } else if (powerUp.isCompanion) {
    ctx.fillStyle = '#ff69b4'; // pink for companion power-up (same color for now)
  } else {
    ctx.fillStyle = '#ff69b4'; // default pink
  }
  ctx.beginPath();
  ctx.arc(powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2, powerUp.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Companion types with different skills
const companionTypes = [
  {
    color: '#0ff',
    shootInterval: 500,
    bulletSpeed: 6,
    bulletWidth: 4,
    bulletHeight: 10,
    offsetX: -30,
  },
  {
    color: '#ff0',
    shootInterval: 700,
    bulletSpeed: 5,
    bulletWidth: 6,
    bulletHeight: 12,
    offsetX: 30,
  },
  {
    color: '#f0f',
    shootInterval: 1000,
    bulletSpeed: 8,
    bulletWidth: 3,
    bulletHeight: 8,
    offsetX: 0,
  },
];

function drawCompanion(companion) {
  ctx.fillStyle = companion.color;
  ctx.beginPath();
  // Draw a distinct shape for companion - a small diamond shape
  const cx = companion.x + companion.width / 2;
  const cy = companion.y + companion.height / 2;
  const size = Math.min(companion.width, companion.height) / 2;
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx - size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx + size, cy);
  ctx.closePath();
  ctx.fill();
}

// Update companions
function updateCompanions() {
  const now = Date.now();
  companions.forEach((companion, index) => {
    // Follow player with offset
    companion.x = player.x + companion.offsetX;
    companion.y = player.y - companion.height - 10;

    // Shoot bullets
    if (now - companion.lastShotTime > companion.shootInterval) {
      companion.bullets.push({
        x: companion.x + companion.width / 2 - companion.bulletWidth / 2,
        y: companion.y,
        width: companion.bulletWidth,
        height: companion.bulletHeight,
        speed: companion.bulletSpeed,
      });
      companion.lastShotTime = now;
    }

    // Update bullets
    companion.bullets.forEach((bullet, bIndex) => {
      bullet.y -= bullet.speed;
      if (bullet.y + bullet.height < 0) {
        companion.bullets.splice(bIndex, 1);
      }
    });

    // Remove companion after duration
    if (now > companion.endTime) {
      companions.splice(index, 1);
    }
  });
}

// Draw companion bullets
function drawCompanionBullets() {
  companions.forEach((companion) => {
    companion.bullets.forEach((bullet) => {
      ctx.fillStyle = companion.color;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
  });
}

// Check collisions for companion bullets
function checkCompanionBulletCollisions() {
  companions.forEach((companion) => {
    companion.bullets.forEach((bullet, bIndex) => {
      enemies.forEach((enemy, eIndex) => {
        if (
          bullet.x < enemy.x + enemy.size &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.size &&
          bullet.y + bullet.height > enemy.y
        ) {
          // Collision detected
          companion.bullets.splice(bIndex, 1);
          enemies.splice(eIndex, 1);
          score += 15; // companions give more score
          updateScoreUI();
          createExplosion(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
        }
      });
    });
  });
}

// Spawn companion power-up
function spawnCompanionPowerUp() {
  if (gameOver) return;
  const size = 20;
  powerUps.push({
    x: randomRange(0, WIDTH - size),
    y: -size,
    size: size,
    speed: 1.5,
    isCompanion: true,
  });
}

// Spawn health power-up (pink ball)
function spawnHealthPowerUp() {
  if (gameOver) return;
  const size = 20;
  powerUps.push({
    x: randomRange(0, WIDTH - size),
    y: -size,
    size: size,
    speed: 1.5,
    isHealth: true,
  });
}

// Override activatePowerUp to handle companion power-ups, health power-ups, and new bullet power-ups
let bulletMode = 'normal'; // normal, spread, bounce
let bulletModeEndTime = 0;

function activatePowerUp(powerUp) {
  powerUpCount += 1;
  updatePowerUpsUI();
  if (powerUp.isCompanion) {
    // Add a companion with random type
    const type = companionTypes[Math.floor(Math.random() * companionTypes.length)];
    companions.push({
      x: player.x + type.offsetX,
      y: player.y - PLAYER_HEIGHT - 10,
      width: 30,
      height: 30,
      color: type.color,
      shootInterval: type.shootInterval,
      bulletSpeed: type.bulletSpeed,
      bulletWidth: type.bulletWidth,
      bulletHeight: type.bulletHeight,
      offsetX: type.offsetX,
      lastShotTime: 0,
      bullets: [],
      endTime: Date.now() + POWERUP_DURATION,
    });
  } else if (powerUp.isHealth) {
    // Increase player health up to max 5
    if (health < 5) {
      health += 1;
      updateHealthUI();
    }
  } else if (powerUp.type === 'spread') {
    bulletMode = 'spread';
    bulletModeEndTime = Date.now() + POWERUP_DURATION;
  } else if (powerUp.type === 'bounce') {
    bulletMode = 'bounce';
    bulletModeEndTime = Date.now() + POWERUP_DURATION;
  }
}

function updatePowerUpStatus() {
  if (powerUpActive && Date.now() > powerUpEndTime) {
    powerUpActive = false;
  }
  if ((bulletMode === 'spread' || bulletMode === 'bounce') && Date.now() > bulletModeEndTime) {
    bulletMode = 'normal';
  }
}

// Update shoot function to handle bullet modes
function shoot() {
  if ((keys['Space'] || keys['KeyJ']) && player.canShoot && !gameOver) {
    const now = Date.now();
    if (now - player.lastShotTime > player.shootCooldown) {
      if (bulletMode === 'normal') {
        bullets.push({
          x: player.x + player.width / 2 - 3,
          y: player.y,
          width: 6,
          height: 12,
          speed: BULLET_SPEED,
          dx: 0,
          dy: -BULLET_SPEED,
          bounces: 0,
        });
      } else if (bulletMode === 'spread') {
        // Shoot 3 bullets in spread pattern
        bullets.push({
          x: player.x + player.width / 2 - 3,
          y: player.y,
          width: 6,
          height: 12,
          speed: BULLET_SPEED,
          dx: -2,
          dy: -BULLET_SPEED,
          bounces: 0,
        });
        bullets.push({
          x: player.x + player.width / 2 - 3,
          y: player.y,
          width: 6,
          height: 12,
          speed: BULLET_SPEED,
          dx: 0,
          dy: -BULLET_SPEED,
          bounces: 0,
        });
        bullets.push({
          x: player.x + player.width / 2 - 3,
          y: player.y,
          width: 6,
          height: 12,
          speed: BULLET_SPEED,
          dx: 2,
          dy: -BULLET_SPEED,
          bounces: 0,
        });
      } else if (bulletMode === 'bounce') {
        bullets.push({
          x: player.x + player.width / 2 - 3,
          y: player.y,
          width: 6,
          height: 12,
          speed: BULLET_SPEED,
          dx: 2,
          dy: -BULLET_SPEED,
          bounces: 3,
        });
      }
      player.lastShotTime = now;
      // Decrease score by 2 for each shot, minimum 0
      score = Math.max(0, score - 2);
      updateScoreUI();
    }
  }
}

// Update bullet movement to handle dx, dy and bouncing
function updateBullets() {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.dx || 0;
    bullet.y += bullet.dy || -bullet.speed;
    if (bulletMode === 'bounce' && bullet.bounces > 0) {
      if (bullet.x <= 0 || bullet.x + bullet.width >= WIDTH) {
        bullet.dx = -bullet.dx;
        bullet.bounces -= 1;
      }
      if (bullet.y <= 0) {
        bullet.dy = -bullet.dy;
        bullet.bounces -= 1;
      }
    }
    if (bullet.y + bullet.height < 0 || bullet.y > HEIGHT) {
      bullets.splice(index, 1);
    }
  });
}

// Update spawnPowerUp to spawn only valid power-ups
function spawnPowerUp() {
  if (gameOver) return;
  const size = 20;
  const powerUpTypes = ['health', 'companion', 'spread', 'bounce'];
  const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  const powerUp = {
    x: randomRange(0, WIDTH - size),
    y: -size,
    size: size,
    speed: 1.5,
  };
  if (type === 'health') {
    powerUp.isHealth = true;
  } else if (type === 'companion') {
    powerUp.isCompanion = true;
  } else if (type === 'spread') {
    powerUp.type = 'spread';
  } else if (type === 'bounce') {
    powerUp.type = 'bounce';
  }
  powerUps.push(powerUp);
}

function drawExplosion(explosion) {
  const alpha = 1 - (Date.now() - explosion.startTime) / explosion.duration;
  ctx.fillStyle = `rgba(255, 69, 0, ${alpha})`;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, explosion.radius * (1 - alpha), 0, Math.PI * 2);
  ctx.fill();
}

function movePlayer() {
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x -= player.speed;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.x += player.speed;
  }
  if (keys['ArrowUp'] || keys['KeyW']) {
    player.y -= player.speed;
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    player.y += player.speed;
  }
  // Keep player inside canvas
  player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
  player.y = Math.max(0, Math.min(HEIGHT - player.height, player.y));
}

function shoot() {
  if ((keys['Space'] || keys['KeyJ']) && player.canShoot && !gameOver) {
    const now = Date.now();
    if (now - player.lastShotTime > player.shootCooldown) {
      bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y,
        width: 6,
        height: 12,
        speed: BULLET_SPEED,
      });
      player.lastShotTime = now;
      // Decrease score by 2 for each shot, minimum 0
      score = Math.max(0, score - 2);
      updateScoreUI();
    }
  }
}

function updateBullets() {
  bullets.forEach((bullet, index) => {
    bullet.y -= bullet.speed;
    if (bullet.y + bullet.height < 0) {
      bullets.splice(index, 1);
    }
  });
}

const enemyTypes = [
  {
    sizeRange: [20, 30],
    speedRange: [1.5, 2.5],
    color: '#f00',
    pattern: 'straight',
  },
  {
    sizeRange: [30, 50],
    speedRange: [1, 1.8],
    color: '#a00',
    pattern: 'zigzag',
  },
  {
    sizeRange: [15, 25],
    speedRange: [2, 3],
    color: '#f55',
    pattern: 'fast',
  },
];

function spawnEnemy() {
  if (gameOver) return;
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const size = randomRange(type.sizeRange[0], type.sizeRange[1]);
  enemies.push({
    x: randomRange(0, WIDTH - size),
    y: -size,
    size: size,
    speed: randomRange(type.speedRange[0], type.speedRange[1]),
    color: type.color,
    pattern: type.pattern,
    zigzagDirection: 1,
  });
}

function updateEnemies() {
  enemies.forEach((enemy, index) => {
    if (enemy.pattern === 'zigzag') {
      enemy.x += enemy.speed * enemy.zigzagDirection;
      if (enemy.x <= 0 || enemy.x + enemy.size >= WIDTH) {
        enemy.zigzagDirection *= -1;
      }
    }
    enemy.y += enemy.speed;
    if (enemy.y > HEIGHT) {
      enemies.splice(index, 1);
      health -= 1;
      updateHealthUI();
      if (health <= 0) {
        triggerGameOver();
      }
    }
  });
}

function drawEnemy(enemy) {
  ctx.fillStyle = enemy.color || '#f00';
  ctx.beginPath();
  ctx.arc(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, enemy.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function spawnPowerUp() {
  if (gameOver) return;
  const size = 20;
  powerUps.push({
    x: randomRange(0, WIDTH - size),
    y: -size,
    size: size,
    speed: 1.5,
  });
}

function updatePowerUps() {
  powerUps.forEach((powerUp, index) => {
    powerUp.y += powerUp.speed;
    if (powerUp.y > HEIGHT) {
      powerUps.splice(index, 1);
    }
    // Check collision with player
    if (
      powerUp.x < player.x + player.width &&
      powerUp.x + powerUp.size > player.x &&
      powerUp.y < player.y + player.height &&
      powerUp.y + powerUp.size > player.y
    ) {
      powerUps.splice(index, 1);
      activatePowerUp(powerUp);
    }
  });
}


function updatePowerUpStatus() {
  if (powerUpActive && Date.now() > powerUpEndTime) {
    powerUpActive = false;
  }
}

function checkCollisions() {
  bullets.forEach((bullet, bIndex) => {
    enemies.forEach((enemy, eIndex) => {
      if (
        bullet.x < enemy.x + enemy.size &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.size &&
        bullet.y + bullet.height > enemy.y
      ) {
        // Collision detected
        bullets.splice(bIndex, 1);
        enemies.splice(eIndex, 1);
        score += 10;
        updateScoreUI();
        createExplosion(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
      }
    });
  });

  enemies.forEach((enemy, eIndex) => {
    if (
      enemy.x < player.x + player.width &&
      enemy.x + enemy.size > player.x &&
      enemy.y < player.y + player.height &&
      enemy.y + enemy.size > player.y
    ) {
      // Enemy hit player
      enemies.splice(eIndex, 1);
      health -= 1;
      updateHealthUI();
      createExplosion(player.x + player.width / 2, player.y + player.height / 2);
      if (health <= 0) {
        triggerGameOver();
      }
    }
  });

  // Check companion bullet collisions
  checkCompanionBulletCollisions();
}

function createExplosion(x, y) {
  explosions.push({
    x: x,
    y: y,
    radius: 30,
    startTime: Date.now(),
    duration: 500,
  });
}

function updateExplosions() {
  const now = Date.now();
  explosions = explosions.filter((explosion) => now - explosion.startTime < explosion.duration);
}

function updateScoreUI() {
  document.getElementById('score').textContent = score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
  }
}

function updateHighScoreUI() {
  const highScoreElement = document.getElementById('highScore');
  if (highScoreElement) {
    highScoreElement.textContent = highScore;
  }
}

function updateHealthUI() {
  document.getElementById('health').textContent = health;
}

function updatePowerUpsUI() {
  document.getElementById('powerUps').textContent = powerUpCount;
}

function triggerGameOver() {
  gameOver = true;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

function restartGame() {
  score = 0;
  highScore = localStorage.getItem('highScore') || 0;
  health = 3;
  powerUpCount = 0;
  powerUpActive = false;
  gameOver = false;
  player.x = WIDTH / 2 - PLAYER_WIDTH / 2;
  player.y = HEIGHT - PLAYER_HEIGHT - 10;
  bullets = [];
  enemies = [];
  powerUps = [];
  explosions = [];
  updateScoreUI();
  updateHighScoreUI();
  updateHealthUI();
  updatePowerUpsUI();
  document.getElementById('gameOverScreen').classList.add('hidden');
}

function drawHUD() {
  const heartSize = 20;
  const padding = 10;
  // Draw hearts for health
  for (let i = 0; i < health; i++) {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    const x = padding + i * (heartSize + 5);
    const y = padding;
    // Draw heart shape
    ctx.moveTo(x + heartSize / 2, y + heartSize / 5);
    ctx.bezierCurveTo(x + heartSize / 2, y, x, y, x, y + heartSize / 3);
    ctx.bezierCurveTo(x, y + heartSize * 2 / 3, x + heartSize / 2, y + heartSize * 4 / 5, x + heartSize / 2, y + heartSize);
    ctx.bezierCurveTo(x + heartSize / 2, y + heartSize * 4 / 5, x + heartSize, y + heartSize * 2 / 3, x + heartSize, y + heartSize / 3);
    ctx.bezierCurveTo(x + heartSize, y, x + heartSize / 2, y, x + heartSize / 2, y + heartSize / 5);
    ctx.fill();
  }
  // Draw score text
  ctx.fillStyle = 'cyan';
  ctx.font = '20px Orbitron, sans-serif';
  ctx.fillText(`Score: ${score}`, WIDTH - 120, padding + 20);
  // Draw high score text
  ctx.fillStyle = 'yellow';
  ctx.font = '18px Orbitron, sans-serif';
  ctx.fillText(`H Score: ${highScore}`, WIDTH - 140, padding + 45);
}

// Game loop
function gameLoop() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  movePlayer();
  shoot();

  updateBullets();
  updateEnemies();
  updatePowerUps();
  updateCompanions();
  updateExplosions();
  updatePowerUpStatus();

  checkCollisions();

  drawPlayer();
  bullets.forEach(drawBullet);
  enemies.forEach(drawEnemy);
  powerUps.forEach(drawPowerUp);
  drawCompanionBullets();
  companions.forEach(drawCompanion);
  explosions.forEach(drawExplosion);

  drawHUD();

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

// Spawn intervals
setInterval(spawnEnemy, ENEMY_SPAWN_INTERVAL);
setInterval(spawnPowerUp, POWERUP_SPAWN_INTERVAL);
setInterval(spawnCompanionPowerUp, POWERUP_SPAWN_INTERVAL * 3);
setInterval(spawnHealthPowerUp, POWERUP_SPAWN_INTERVAL * 4);

// Restart button
document.getElementById('restartBtn').addEventListener('click', () => {
  restartGame();
  gameLoop();
});

// Start the game
gameLoop();

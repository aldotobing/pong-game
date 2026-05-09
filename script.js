// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 90;
const BALL_RADIUS = 8;
const WINNING_SCORE = 10;
const INITIAL_BALL_SPEED = 7;
const MAX_BALL_SPEED = 24;

let screenShake = 0;
let hitPauseFrames = 0;
let rallyCount = 0;
const PADDLE_SPEED = 10;
const COMPUTER_SPEED = 5.5;

// Mobile/Safari detection — shadowBlur is ~5x slower on Safari GPU
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const REDUCE_FX = isMobile || isSafari;

// Cache ball gradient to avoid re-creating each frame
let cachedBallGradient = null;
let cachedBallRadius = -1;

// Colors
const COLOR_PLAYER = '#38bdf8';
const COLOR_COMPUTER = '#f43f5e';
const COLOR_BALL = '#ffffff';
const COLOR_BG = '#0b1120';
const COLOR_NET = 'rgba(255, 255, 255, 0.05)';

// Game State
let gameState = 'START';
let playerScore = 0;
let computerScore = 0;
let winner = '';
let gameOverStartTime = 0;

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('playerScore');
const computerScoreEl = document.getElementById('computerScore');

// Audio Context Setup
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'paddle') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'wall') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'score_win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'score_lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}

// Game Objects
const player = {
    x: 40,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    color: COLOR_PLAYER,
    hitBump: 0
};

const computer = {
    x: CANVAS_WIDTH - 40 - PADDLE_WIDTH,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    color: COLOR_COMPUTER,
    hitBump: 0
};

const ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: BALL_RADIUS,
    dx: INITIAL_BALL_SPEED,
    dy: INITIAL_BALL_SPEED,
    speed: INITIAL_BALL_SPEED,
    trail: [],
    color: COLOR_BALL,
    scaleX: 1,
    scaleY: 1,
    targetScaleX: 1,
    targetScaleY: 1
};

let particles = [];
let floatingTexts = [];

let hazards = [
    { x: 400, y: 200, radius: 20, dy: 2, color: '#d946ef' }, // 800/2
    { x: 400, y: 400, radius: 20, dy: -2, color: '#0ea5e9' }
];

let mutators = [];
let extraBalls = [];
let ballInvisibleTimer = 0;

const MUTATOR_TYPES = [
    { type: 'MULTIBALL', color: '#10b981', text: 'MULTIBALL!' },
    { type: 'SHRINK', color: '#ef4444', text: 'SHRINK PADDLE!' },
    { type: 'INVISIBLE', color: '#8b5cf6', text: 'GHOST BALL!' }
];

// Input Handling
const keys = { ArrowUp: false, ArrowDown: false };

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.key === 'ArrowUp') keys.ArrowUp = true;
    if (e.code === 'ArrowDown' || e.key === 'ArrowDown') keys.ArrowDown = true;

    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        initAudio();
        if (gameState === 'START' || gameState === 'GAME_OVER') {
            resetGame();
            gameState = 'PLAYING';
        }
    }

    if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
        if (gameState === 'PLAYING') gameState = 'PAUSED';
        else if (gameState === 'PAUSED') gameState = 'PLAYING';
    }

    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.key === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'ArrowDown' || e.key === 'ArrowDown') keys.ArrowDown = false;
});

document.addEventListener('mousemove', (e) => {
    if (gameState === 'PLAYING') {
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        const mouseY = (e.clientY - rect.top) * scaleY;
        player.y = mouseY - PADDLE_HEIGHT / 2;
        if (player.y < 0) player.y = 0;
        if (player.y + PADDLE_HEIGHT > CANVAS_HEIGHT) player.y = CANVAS_HEIGHT - PADDLE_HEIGHT;
    }
});

function handleTouchMove(e) {
    if (gameState === 'PLAYING') {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        const touch = e.touches[0];
        const mouseY = (touch.clientY - rect.top) * scaleY;
        player.y = mouseY - PADDLE_HEIGHT / 2;
        if (player.y < 0) player.y = 0;
        if (player.y + PADDLE_HEIGHT > CANVAS_HEIGHT) player.y = CANVAS_HEIGHT - PADDLE_HEIGHT;
    }
}

document.addEventListener('touchmove', handleTouchMove, { passive: false });

document.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('a')) return;

    e.preventDefault();
    initAudio();
    if (gameState === 'START' || gameState === 'GAME_OVER') {
        resetGame();
        gameState = 'PLAYING';
    } else {
        handleTouchMove(e);
    }
}, { passive: false });

document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('a')) return;

    initAudio();
    if (gameState === 'START' || gameState === 'GAME_OVER') {
        resetGame();
        gameState = 'PLAYING';
    }
});

// Particle System
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            decay: Math.random() * 0.04 + 0.02,
            color: color,
            size: Math.random() * 2.5 + 1
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    // Batch particles by color to minimize state changes
    const byColor = {};
    particles.forEach(p => {
        if (!byColor[p.color]) byColor[p.color] = [];
        byColor[p.color].push(p);
    });
    Object.entries(byColor).forEach(([color, group]) => {
        ctx.fillStyle = color;
        group.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    ctx.globalAlpha = 1.0;
}

// Hazards Logic
function updateHazards() {
    hazards.forEach(h => {
        h.y += h.dy;
        if (h.y - h.radius < 0 || h.y + h.radius > CANVAS_HEIGHT) {
            h.dy *= -1;
            h.y += h.dy;
        }

        // Check collision with ball
        let dx = ball.x - h.x;
        let dy = ball.y - h.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ball.radius + h.radius) {
            playSound('wall');
            createParticles(h.x, h.y, h.color, 15);
            screenShake += 5;
            hitPauseFrames = 3;
            // push ball out of intersection
            let nx = dx / dist;
            let ny = dy / dist;
            ball.x = h.x + nx * (ball.radius + h.radius + 1);
            ball.y = h.y + ny * (ball.radius + h.radius + 1);

            // reflect velocity
            let dot = (ball.dx * nx + ball.dy * ny);
            ball.dx -= 2 * dot * nx;
            ball.dy -= 2 * dot * ny;

            // Add random unpredictable spin
            ball.dx += (Math.random() - 0.5) * 4;
            ball.dy += (Math.random() - 0.5) * 4;

            // Normalise speed to slightly bumped
            ball.speed += 1;
            let newDist = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            ball.dx = (ball.dx / newDist) * ball.speed;
            ball.dy = (ball.dy / newDist) * ball.speed;
        }
    });
}

function drawHazards() {
    hazards.forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fillStyle = h.color;
        if (!REDUCE_FX) {
            ctx.shadowColor = h.color;
            ctx.shadowBlur = 20;
        }
        ctx.fill();
        ctx.closePath();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
    if (!REDUCE_FX) ctx.shadowBlur = 0;
}

// Floating Text System
function createFloatingText(x, y, text, color) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 1.0,
        dy: -1.5 - Math.random() * 1.5,
        scale: 0.5,
        maxScale: 1.5 + Math.random() * 0.5
    });
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.dy;
        ft.life -= 0.02;
        ft.scale += (ft.maxScale - ft.scale) * 0.15;
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawFloatingTexts() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = `bold 24px 'Space Grotesk', sans-serif`;
        if (!REDUCE_FX) {
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
        }
        ctx.translate(ft.x, ft.y);
        ctx.scale(ft.scale, ft.scale);
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
    });
    ctx.globalAlpha = 1.0;
}

// Mutators Logic
function updateMutators() {
    // Spawn logic
    if (gameState === 'PLAYING' && Math.random() < 0.003 && mutators.length === 0) {
        let typeObj = MUTATOR_TYPES[Math.floor(Math.random() * MUTATOR_TYPES.length)];
        mutators.push({
            x: CANVAS_WIDTH / 2,
            y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
            radius: 18,
            ...typeObj,
            life: 600,
            pulse: 0
        });
    }

    for (let i = mutators.length - 1; i >= 0; i--) {
        let m = mutators[i];
        m.x += m.dx;
        m.y += m.dy;

        // Bounce off invisible middle area bounds
        if (m.y < 50 || m.y > CANVAS_HEIGHT - 50) m.dy *= -1;
        if (m.x < CANVAS_WIDTH / 2 - 100 || m.x > CANVAS_WIDTH / 2 + 100) m.dx *= -1;

        m.life--;
        m.pulse += 0.1;
        if (m.life <= 0) {
            mutators.splice(i, 1);
            continue;
        }

        // Check collision main ball
        let hit = false;
        let pball = ball;
        let dx = pball.x - m.x;
        let dy = pball.y - m.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pball.radius + m.radius) {
            hit = true;
        } else {
            // also check extra balls
            for (let eb of extraBalls) {
                dx = eb.x - m.x;
                dy = eb.y - m.y;
                dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < eb.radius + m.radius) {
                    hit = true;
                    pball = eb;
                    break;
                }
            }
        }

        if (hit) {
            playSound('score_win'); // Can replace with a powerup sound if we had one
            createParticles(m.x, m.y, m.color, 30);
            createFloatingText(m.x, m.y - 30, m.text, m.color);
            applyMutator(m.type, pball);
            mutators.splice(i, 1);
        }
    }
}

function applyMutator(type, sourceBall) {
    if (type === 'MULTIBALL') {
        // spawn 2 extra balls
        for (let i = 0; i < 2; i++) {
            extraBalls.push({
                x: sourceBall.x,
                y: sourceBall.y,
                dx: sourceBall.dx + (Math.random() - 0.5) * 6,
                dy: sourceBall.dy + (Math.random() - 0.5) * 6,
                radius: sourceBall.radius,
                speed: sourceBall.speed,
                trail: [],
                color: '#10b981',
                scaleX: 1, scaleY: 1
            });
        }
    } else if (type === 'SHRINK') {
        if (sourceBall.dx < 0) {
            player.height = Math.max(30, PADDLE_HEIGHT - 40);
        } else {
            computer.height = Math.max(30, PADDLE_HEIGHT - 40);
        }
    } else if (type === 'INVISIBLE') {
        ballInvisibleTimer = 180;
    }
}

function updateExtraBalls() {
    for (let i = extraBalls.length - 1; i >= 0; i--) {
        let eb = extraBalls[i];

        eb.trail.push({ x: eb.x, y: eb.y, color: eb.color, scaleX: eb.scaleX, scaleY: eb.scaleY });
        if (eb.trail.length > 10) eb.trail.shift();

        eb.x += eb.dx;
        eb.y += eb.dy;

        // wall collision
        if (eb.y - eb.radius < 0 || eb.y + eb.radius > CANVAS_HEIGHT) {
            playSound('wall');
            eb.dy *= -1;
            if (eb.y - eb.radius < 0) eb.y = eb.radius;
            if (eb.y + eb.radius > CANVAS_HEIGHT) eb.y = CANVAS_HEIGHT - eb.radius;
            createParticles(eb.x, eb.y, eb.color, 5);
        }

        // paddle collision
        let hitPaddle = null;
        if (eb.dx < 0 && checkCollision(eb, player)) {
            hitPaddle = player;
            eb.x = player.x + player.width + eb.radius;
        } else if (eb.dx > 0 && checkCollision(eb, computer)) {
            hitPaddle = computer;
            eb.x = computer.x - eb.radius;
        }

        if (hitPaddle) {
            playSound('paddle');
            hitPaddle.hitBump = 1.0;
            createParticles(eb.x, eb.y, hitPaddle.color, 8);
            eb.speed = Math.min(eb.speed + 0.5, MAX_BALL_SPEED);
            let angle = (eb.y - (hitPaddle.y + hitPaddle.height / 2)) / (hitPaddle.height / 2) * (Math.PI / 3);
            eb.dx = (hitPaddle === player ? 1 : -1) * eb.speed * Math.cos(angle);
            eb.dy = eb.speed * Math.sin(angle);
        }

        // Hazards collision for extra balls
        hazards.forEach(h => {
            let dx = eb.x - h.x;
            let dy = eb.y - h.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < eb.radius + h.radius) {
                playSound('wall');
                createParticles(h.x, h.y, h.color, 15);
                let nx = dx / dist;
                let ny = dy / dist;
                eb.x = h.x + nx * (eb.radius + h.radius + 1);
                eb.y = h.y + ny * (eb.radius + h.radius + 1);
                let dot = (eb.dx * nx + eb.dy * ny);
                eb.dx -= 2 * dot * nx;
                eb.dy -= 2 * dot * ny;
                eb.dx += (Math.random() - 0.5) * 4;
                eb.dy += (Math.random() - 0.5) * 4;
                eb.speed += 0.5;
                let newDist = Math.sqrt(eb.dx * eb.dx + eb.dy * eb.dy);
                eb.dx = (eb.dx / newDist) * eb.speed;
                eb.dy = (eb.dy / newDist) * eb.speed;
            }
        });

        // Scoring
        if (eb.x < -50) {
            computerScore++;
            updateScoreboard('computer');
            createParticles(20, eb.y, COLOR_COMPUTER, 15);
            extraBalls.splice(i, 1);
            checkWinCondition();
        } else if (eb.x > CANVAS_WIDTH + 50) {
            playerScore++;
            updateScoreboard('player');
            createParticles(CANVAS_WIDTH - 20, eb.y, COLOR_PLAYER, 15);
            extraBalls.splice(i, 1);
            checkWinCondition();
        }
    }
}

function drawMutators() {
    mutators.forEach(m => {
        ctx.save();
        ctx.beginPath();
        let r = m.radius + Math.sin(m.pulse) * 3;
        ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = ((Math.sin(m.pulse * 2) + 1) / 2) * 20 + 5;
        ctx.stroke();
        ctx.fillStyle = m.color;
        ctx.globalAlpha = 0.5;
        ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.font = `bold 16px 'Space Grotesk', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', m.x, m.y);
        ctx.restore();
    });
}

function drawExtraBalls() {
    extraBalls.forEach(eb => {
        if (ballInvisibleTimer > 0) ctx.globalAlpha = 0.2;

        // trail
        if (ballInvisibleTimer <= 0) {
            for (let i = 0; i < eb.trail.length; i++) {
                const pos = eb.trail[i];
                const alpha = (i / eb.trail.length) * 0.4;
                drawBallSphere(pos.x, pos.y, eb.radius * 0.8, pos.color, pos.scaleX, pos.scaleY, alpha);
            }
        }

        drawBallSphere(eb.x, eb.y, eb.radius, eb.color, eb.scaleX, eb.scaleY);
        if (ballInvisibleTimer > 0) ctx.globalAlpha = 1.0;
    });
}

// Reset Ball
function resetBall(scorer) {
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    ball.speed = INITIAL_BALL_SPEED;
    rallyCount = 0;
    ball.trail = [];
    extraBalls = [];
    mutators = [];
    ballInvisibleTimer = 0;

    player.height = PADDLE_HEIGHT;
    computer.height = PADDLE_HEIGHT;

    ball.color = COLOR_BALL;
    ball.scaleX = 1;
    ball.scaleY = 1;
    ball.targetScaleX = 1;
    ball.targetScaleY = 1;

    const direction = scorer === 'player' ? -1 : 1;
    ball.dx = direction * INITIAL_BALL_SPEED;
    ball.dy = (Math.random() * 2 - 1) * INITIAL_BALL_SPEED;
}

// Reset Game
function resetGame() {
    playerScore = 0;
    computerScore = 0;
    winner = '';
    updateScoreboard();
    resetBall(Math.random() > 0.5 ? 'player' : 'computer');
    player.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    computer.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    particles = [];
    const mobileHint = document.getElementById('mobileHint');
    if (mobileHint) mobileHint.style.display = 'none';
    const gameOverUi = document.getElementById('gameOverUi');
    if (gameOverUi) gameOverUi.style.display = 'none';
    const appFooter = document.getElementById('appFooter');
    if (appFooter) appFooter.style.display = 'none';
}

// Update Scoreboard
function updateScoreboard(scorer = null) {
    playerScoreEl.innerText = playerScore;
    computerScoreEl.innerText = computerScore;

    const animateScore = (el) => {
        const dir = Math.random() > 0.5 ? 1 : -1;
        el.style.setProperty('--pop-dir', dir);
        el.classList.remove('pop');
        // prompt a reflow
        void el.offsetWidth;
        el.classList.add('pop');
        setTimeout(() => el.classList.remove('pop'), 200);
    };

    if (scorer === 'player') animateScore(playerScoreEl);
    if (scorer === 'computer') animateScore(computerScoreEl);
}

// Collision Detection (Circle vs Rectangle)
function checkCollision(b, p) {
    let testX = b.x;
    let testY = b.y;

    if (b.x < p.x) testX = p.x;
    else if (b.x > p.x + p.width) testX = p.x + p.width;

    if (b.y < p.y) testY = p.y;
    else if (b.y > p.y + p.height) testY = p.y + p.height;

    let distX = b.x - testX;
    let distY = b.y - testY;
    let distance = Math.sqrt((distX * distX) + (distY * distY));

    return distance <= b.radius;
}

// Update Logic
function update() {
    if (gameState !== 'PLAYING') return;

    if (screenShake > 0) {
        screenShake *= 0.85;
        if (screenShake < 0.5) screenShake = 0;
    }

    if (hitPauseFrames > 0) {
        hitPauseFrames--;
        return;
    }

    if (player.hitBump > 0) player.hitBump -= 0.1;
    if (computer.hitBump > 0) computer.hitBump -= 0.1;

    // Squash and stretch physics
    ball.scaleX += (ball.targetScaleX - ball.scaleX) * 0.2;
    ball.scaleY += (ball.targetScaleY - ball.scaleY) * 0.2;
    ball.targetScaleX += (1 - ball.targetScaleX) * 0.1;
    ball.targetScaleY += (1 - ball.targetScaleY) * 0.1;

    updateParticles();
    updateFloatingTexts();
    updateHazards();
    updateMutators();
    updateExtraBalls();

    if (ballInvisibleTimer > 0) ballInvisibleTimer--;

    // Player Movement
    if (keys.ArrowUp) player.y -= PADDLE_SPEED;
    if (keys.ArrowDown) player.y += PADDLE_SPEED;
    if (player.y < 0) player.y = 0;
    if (player.y + PADDLE_HEIGHT > CANVAS_HEIGHT) player.y = CANVAS_HEIGHT - PADDLE_HEIGHT;

    // Computer AI (Smooth predictive tracking for closest incoming ball)
    let closestBall = null;
    let minDist = Infinity;

    let allBalls = [ball, ...extraBalls];
    allBalls.forEach(b => {
        if (b.dx > 0) { // Heading towards computer
            let dist = (computer.x - b.x) / b.dx; // frames to reach
            if (dist > 0 && dist < minDist) {
                minDist = dist;
                closestBall = b;
            }
        }
    });

    if (closestBall) {
        const computerCenter = computer.y + computer.height / 2;
        const targetY = closestBall.y + (closestBall.dy * 5);

        if (computerCenter < targetY - 10) {
            computer.y += COMPUTER_SPEED;
        } else if (computerCenter > targetY + 10) {
            computer.y -= COMPUTER_SPEED;
        }
    } else {
        const computerCenter = computer.y + computer.height / 2;
        if (computerCenter < CANVAS_HEIGHT / 2 - 10) computer.y += COMPUTER_SPEED * 0.5;
        else if (computerCenter > CANVAS_HEIGHT / 2 + 10) computer.y -= COMPUTER_SPEED * 0.5;
    }

    if (computer.y < 0) computer.y = 0;
    if (computer.y + computer.height > CANVAS_HEIGHT) computer.y = CANVAS_HEIGHT - computer.height;

    // Record trail
    ball.trail.push({ x: ball.x, y: ball.y, color: ball.color, scaleX: ball.scaleX, scaleY: ball.scaleY });
    const maxTrail = 10 + Math.min(rallyCount * 2, 25);
    if (ball.trail.length > maxTrail) ball.trail.shift();

    // Ball Movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collision
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > CANVAS_HEIGHT) {
        playSound('wall');
        ball.dy *= -1;
        if (ball.y - ball.radius < 0) ball.y = ball.radius;
        if (ball.y + ball.radius > CANVAS_HEIGHT) ball.y = CANVAS_HEIGHT - ball.radius;

        // Squash on wall hit
        ball.scaleX = 1.3;
        ball.scaleY = 0.7;

        createParticles(ball.x, ball.y < CANVAS_HEIGHT / 2 ? 0 : CANVAS_HEIGHT, ball.color, 5);
    }

    // Paddle Collision
    let hitPaddle = null;
    if (ball.dx < 0 && checkCollision(ball, player)) {
        hitPaddle = player;
        ball.x = player.x + player.width + ball.radius;
    } else if (ball.dx > 0 && checkCollision(ball, computer)) {
        hitPaddle = computer;
        ball.x = computer.x - ball.radius;
    }

    if (hitPaddle) {
        playSound('paddle');
        hitPaddle.hitBump = 1.0;
        ball.color = hitPaddle.color;
        rallyCount++;

        // Spawn combo text
        if (rallyCount % 5 === 0 && rallyCount > 0) {
            const texts = ["NICE!", "HOT!", "SUPER!", "SMASH!", "ON FIRE!", "GODLIKE!", "UNSTOPPABLE!"];
            const textToUse = texts[Math.min(Math.floor(rallyCount / 5) - 1, texts.length - 1)];
            createFloatingText(ball.x, ball.y - 20, textToUse, hitPaddle.color);
        } else if (ball.speed > INITIAL_BALL_SPEED + 4) {
            if (Math.random() < 0.2) createFloatingText(ball.x, ball.y - 20, "SPEED UP!", "#fff");
        }

        hitPauseFrames = Math.min(2 + Math.floor(rallyCount / 4), 8);
        screenShake = Math.min(3 + rallyCount * 1.5, 20);

        // Squash on paddle hit
        ball.scaleX = 0.5 - (rallyCount * 0.01);
        ball.scaleY = 1.5 + (rallyCount * 0.02);

        createParticles(ball.x, ball.y, hitPaddle.color, 8 + Math.min(rallyCount, 15));

        // Combo & Style Bonus: Sharp Shot
        const hitPointRaw = (ball.y - (hitPaddle.y + hitPaddle.height / 2)) / (hitPaddle.height / 2);
        const hitPointAbs = Math.abs(hitPointRaw);

        if (hitPointAbs > 0.85) {
            playSound('score_win'); // use a cool sound
            createFloatingText(ball.x, ball.y, "SHARP SHOT!", "#facc15");
            ball.speed += 3; // Huge speed boost
            screenShake = 15;
            hitPauseFrames = 10;
            // Reward extra point
            if (hitPaddle === player) {
                playerScore++;
                updateScoreboard('player');
                checkWinCondition();
            } else {
                computerScore++;
                updateScoreboard('computer');
                checkWinCondition();
            }
        }

        let angle = hitPointRaw * (Math.PI / 3); // Base angle up to 60 degrees

        // Introduce a slight random variation (approx +/- 8.5 degrees) for unpredictability
        const randomVariation = (Math.random() - 0.5) * 0.3;
        angle += randomVariation;

        // Clamp the angle to prevent it from becoming too vertical
        const maxAngle = Math.PI / 2.4;
        if (angle > maxAngle) angle = maxAngle;
        if (angle < -maxAngle) angle = -maxAngle;

        ball.speed = Math.min(ball.speed + 0.6 + (rallyCount * 0.03), MAX_BALL_SPEED);
        const direction = hitPaddle === player ? 1 : -1;

        ball.dx = direction * ball.speed * Math.cos(angle);
        ball.dy = ball.speed * Math.sin(angle);
    }

    // Scoring
    if (ball.x < -50) {
        playSound('score_lose');
        computerScore++;
        updateScoreboard('computer');
        createParticles(20, ball.y, COLOR_COMPUTER, 25);
        checkWinCondition();
        if (gameState === 'PLAYING') resetBall('computer');
    } else if (ball.x > CANVAS_WIDTH + 50) {
        playSound('score_win');
        playerScore++;
        updateScoreboard('player');
        createParticles(CANVAS_WIDTH - 20, ball.y, COLOR_PLAYER, 25);
        checkWinCondition();
        if (gameState === 'PLAYING') resetBall('player');
    }
}

function checkWinCondition() {
    if (playerScore >= WINNING_SCORE) {
        winner = 'PLAYER';
        gameState = 'GAME_OVER';
        gameOverStartTime = Date.now();
        showGameOverUi();
    } else if (computerScore >= WINNING_SCORE) {
        winner = 'CPU';
        gameState = 'GAME_OVER';
        gameOverStartTime = Date.now();
        showGameOverUi();
    }
}

function showGameOverUi() {
    const ui = document.getElementById('gameOverUi');
    if (ui) {
        // slight delay to let the text animation play out first
        setTimeout(() => {
            ui.style.display = 'flex';
            ui.style.animation = 'fadeInUi 0.5s ease forwards';
            const tweetBtn = document.getElementById('tweetShare');
            if (tweetBtn) {
                const resultMsg = winner === 'PLAYER' ? 'won' : 'lost';
                const scoreText = `${playerScore} - ${computerScore}`;
                const text = `I just ${resultMsg} at Retro Pong with a score of ${scoreText}! 🏓\n\nCan you beat it?`;
                const shareUrl = "https://retropong.vercel.app/";
                tweetBtn.onclick = (e) => {
                    e.preventDefault();
                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
                    window.open(twitterUrl, '_blank', 'width=550,height=420');
                };
            }

            const igBtn = document.getElementById('igShare');
            if (igBtn) {
                igBtn.onclick = async () => {
                    const resultMsg = winner === 'PLAYER' ? 'won' : 'lost';
                    const scoreText = `${playerScore} - ${computerScore}`;
                    const shareText = `I just ${resultMsg} at Retro Pong with a score of ${scoreText}! 🏓\n\nCan you beat it?`;
                    const shareUrl = "https://retropong.vercel.app/";

                    const canvas = document.getElementById('gameCanvas');
                    
                    // 1. Capture the canvas as a Blob (screenshot)
                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            console.error('Canvas toBlob failed');
                            return;
                        }

                        // 2. Create a File object from the blob
                        const file = new File([blob], 'retropong-score.png', { type: 'image/png' });

                        // 3. Check if sharing files is supported
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: 'Retro Pong Score',
                                    text: shareText,
                                    // Note: Some platforms prefer URL in text or separate
                                });
                            } catch (err) {
                                if (err.name !== 'AbortError') console.error('Share failed:', err);
                            }
                        } else {
                            // Fallback for desktop or unsupported browsers
                            try {
                                const fullMsg = `${shareText}\n${shareUrl}`;
                                await navigator.clipboard.writeText(fullMsg);
                                alert("Score text copied! Your browser doesn't support direct image sharing, but you can take a screenshot and share it manually.");
                            } catch (clipErr) {
                                console.error('Clipboard failed:', clipErr);
                            }
                        }
                    }, 'image/png');
                };
            }

            const appFooter = document.getElementById('appFooter');
            if (appFooter) {
                appFooter.style.display = 'block';
                appFooter.style.animation = 'fadeInUi 0.5s ease forwards';
            }
        }, 1200);
    }
}

// Rendering Logic
function drawPaddle(p) {
    const bumpW = p.hitBump * 8;
    const bumpH = p.hitBump * 16;

    const width = p.width + bumpW;
    const height = p.height + bumpH;

    const xOffset = p === computer ? -bumpW : 0;
    const yOffset = -bumpH / 2;

    const grad = ctx.createLinearGradient(p.x + xOffset, p.y + yOffset, p.x + xOffset + width, p.y + yOffset);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, '#ffffff');

    ctx.fillStyle = grad;
    if (!REDUCE_FX) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.hitBump > 0 ? 15 + (p.hitBump * 15) : 5;
    }

    ctx.beginPath();
    ctx.roundRect(p.x + xOffset, p.y + yOffset, width, height, 6);
    ctx.fill();

    // White flash flash overlay
    if (p.hitBump > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.hitBump * 0.8})`;
        ctx.beginPath();
        ctx.roundRect(p.x + xOffset, p.y + yOffset, width, height, 6);
        ctx.fill();
    }

    if (!REDUCE_FX) ctx.shadowBlur = 0; // reset
}

function drawBallSphere(x, y, radius, color, scaleX, scaleY, alpha = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);

    ctx.globalAlpha = alpha;

    // Cache the radial gradient — re-creating it every frame per trail segment is expensive
    if (cachedBallRadius !== radius || cachedBallGradient === null) {
        cachedBallGradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
        cachedBallGradient.addColorStop(0, '#ffffff');
        cachedBallGradient.addColorStop(0.4, color);
        cachedBallGradient.addColorStop(1, '#000000');
        cachedBallRadius = radius;
    }

    ctx.fillStyle = cachedBallGradient;

    if (!REDUCE_FX) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * alpha;
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawText(text, x, y, size = 30, color = '#fff', weight = '600', align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px 'Inter', sans-serif`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
}

function drawNet() {
    ctx.strokeStyle = COLOR_NET;
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]); // reset
}

function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
    }

    drawNet();

    // Draw Ball Trail
    if (ballInvisibleTimer <= 0) {
        for (let i = 0; i < ball.trail.length; i++) {
            const pos = ball.trail[i];
            const alpha = (i / ball.trail.length) * 0.4;
            drawBallSphere(pos.x, pos.y, ball.radius * 0.8, pos.color, pos.scaleX, pos.scaleY, alpha);
        }
    }

    // Draw Paddles
    drawPaddle(player);
    drawPaddle(computer);

    drawHazards();
    drawMutators();
    drawExtraBalls();

    // Draw Ball
    if (ballInvisibleTimer <= 0) {
        drawBallSphere(ball.x, ball.y, ball.radius, ball.color, ball.scaleX, ball.scaleY);
    } else {
        // Draw just a faint glimmer when invisible
        ctx.globalAlpha = 0.2;
        drawBallSphere(ball.x, ball.y, ball.radius, ball.color, ball.scaleX, ball.scaleY);
        ctx.globalAlpha = 1.0;
    }

    // Draw Particles
    drawParticles();
    drawFloatingTexts();

    // Custom CRT lines effect based on screen shake / intensity
    if (rallyCount > 5) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(rallyCount * 0.002, 0.05)})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.restore();

    // UI Overlays
    if (gameState === 'START') {
        ctx.fillStyle = 'rgba(11, 17, 32, 0.85)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Prominent title with subtle blue glow
        const titlePulse = Math.sin(Date.now() / 500);
        ctx.shadowColor = COLOR_PLAYER;
        ctx.shadowBlur = 20 + 10 * titlePulse;
        drawText('PONG', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50, 88, '#fff', '800');
        ctx.shadowBlur = 0; // reset

        const pulseAlpha = 0.4 + 0.6 * Math.sin(Date.now() / 300);
        drawText('Press Space to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40, 22, `rgba(255, 255, 255, ${pulseAlpha})`, '500');

        drawText('Controls: Mouse or Up/Down Arrows', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90, 14, 'rgba(255, 255, 255, 0.4)', '400');
    } else if (gameState === 'PAUSED') {
        ctx.fillStyle = 'rgba(11, 17, 32, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        drawText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 48, '#fff', '700');

        const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
        drawText('Press P to Resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50, 18, `rgba(255, 255, 255, ${pulseAlpha})`, '500');
    } else if (gameState === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(11, 17, 32, 0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const winColor = winner === 'PLAYER' ? COLOR_PLAYER : COLOR_COMPUTER;
        const fullText = `${winner} WINS`;

        // Typewriter effect
        const elapsed = Date.now() - gameOverStartTime;
        const charsToShow = Math.min(fullText.length, Math.floor(elapsed / 150));
        const showCursor = Math.floor(elapsed / 400) % 2 === 0;
        const displayText = fullText.substring(0, charsToShow) + (showCursor ? '█' : '');

        // Subtle pulsing glow effect
        const pulse = Math.sin(Date.now() / 300);
        ctx.shadowColor = winColor;
        ctx.shadowBlur = 15 + 10 * pulse;
        ctx.globalAlpha = 0.85 + 0.15 * pulse;

        // Calculate starting X to keep it centered overall
        ctx.font = `700 56px 'Inter', sans-serif`;
        const totalWidth = ctx.measureText(fullText + '█').width;
        const startX = CANVAS_WIDTH / 2 - totalWidth / 2;

        drawText(displayText, startX, CANVAS_HEIGHT / 2 - 30, 56, winColor, '700', 'left');

        ctx.shadowBlur = 0; // Reset shadow
        ctx.globalAlpha = 1.0; // Reset alpha

        if (charsToShow === fullText.length) {
            const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
            drawText('Click or Press Space to Play Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40, 18, `rgba(255, 255, 255, ${pulseAlpha})`, '500');
        }
    }
}

// Game Loop
// Now that performance bottlenecks (shadowBlur, gradients) are fixed,
// a 1:1 update/render loop will run buttery smooth at native refresh rates.
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Initialization
resetBall('player');
updateScoreboard();
requestAnimationFrame(gameLoop);

import { state, dom } from './state.js';
import * as constants from './constants.js';
import { playSound } from './audio.js';
import { checkCollision, updateScoreboard, checkWinCondition } from './logic.js';
import { drawBallSphere } from './render.js';

// Particle System
export function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
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

export function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
}

export function drawParticles() {
    // Batch state.particles by color to minimize state changes
    const byColor = {};
    state.particles.forEach(p => {
        if (!byColor[p.color]) byColor[p.color] = [];
        byColor[p.color].push(p);
    });
    Object.entries(byColor).forEach(([color, group]) => {
        dom.ctx.fillStyle = color;
        group.forEach(p => {
            dom.ctx.globalAlpha = p.life;
            dom.ctx.beginPath();
            dom.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            dom.ctx.fill();
        });
    });
    dom.ctx.globalAlpha = 1.0;
}

// Hazards Logic
export function updateHazards() {
    state.hazards.forEach(h => {
        h.y += h.dy;
        if (h.y - h.radius < 0 || h.y + h.radius > constants.CANVAS_HEIGHT) {
            h.dy *= -1;
            h.y += h.dy;
        }

        // Check collision with state.ball
        let dx = state.ball.x - h.x;
        let dy = state.ball.y - h.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < state.ball.radius + h.radius) {
            playSound('wall');
            createParticles(h.x, h.y, h.color, 15);
            state.screenShake += 5;
            state.hitPauseFrames = 3;
            // push state.ball out of intersection
            let nx = dx / dist;
            let ny = dy / dist;
            state.ball.x = h.x + nx * (state.ball.radius + h.radius + 1);
            state.ball.y = h.y + ny * (state.ball.radius + h.radius + 1);

            // reflect velocity
            let dot = (state.ball.dx * nx + state.ball.dy * ny);
            state.ball.dx -= 2 * dot * nx;
            state.ball.dy -= 2 * dot * ny;

            // Add random unpredictable spin
            state.ball.dx += (Math.random() - 0.5) * 4;
            state.ball.dy += (Math.random() - 0.5) * 4;

            // Normalise speed to slightly bumped
            state.ball.speed += 1;
            let newDist = Math.sqrt(state.ball.dx * state.ball.dx + state.ball.dy * state.ball.dy);
            state.ball.dx = (state.ball.dx / newDist) * state.ball.speed;
            state.ball.dy = (state.ball.dy / newDist) * state.ball.speed;
        }
    });
}

export function drawHazards() {
    state.hazards.forEach(h => {
        dom.ctx.beginPath();
        dom.ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        dom.ctx.fillStyle = h.color;
        if (!constants.REDUCE_FX) {
            dom.ctx.shadowColor = h.color;
            dom.ctx.shadowBlur = 20;
        }
        dom.ctx.fill();
        dom.ctx.closePath();
        dom.ctx.fillStyle = "#fff";
        dom.ctx.beginPath();
        dom.ctx.arc(h.x, h.y, h.radius * 0.4, 0, Math.PI * 2);
        dom.ctx.fill();
        dom.ctx.closePath();
    });
    if (!constants.REDUCE_FX) dom.ctx.shadowBlur = 0;
}

// Floating Text System
export function createFloatingText(x, y, text, color) {
    state.floatingTexts.push({
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

export function updateFloatingTexts() {
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        let ft = state.floatingTexts[i];
        ft.y += ft.dy;
        ft.life -= 0.02;
        ft.scale += (ft.maxScale - ft.scale) * 0.15;
        if (ft.life <= 0) {
            state.floatingTexts.splice(i, 1);
        }
    }
}

export function drawFloatingTexts() {
    dom.ctx.textAlign = "center";
    dom.ctx.textBaseline = "middle";
    state.floatingTexts.forEach(ft => {
        dom.ctx.save();
        dom.ctx.globalAlpha = Math.max(0, ft.life);
        dom.ctx.fillStyle = ft.color;
        dom.ctx.font = `bold 24px 'Space Grotesk', sans-serif`;
        if (!constants.REDUCE_FX) {
            dom.ctx.shadowColor = ft.color;
            dom.ctx.shadowBlur = 10;
        }
        dom.ctx.translate(ft.x, ft.y);
        dom.ctx.scale(ft.scale, ft.scale);
        dom.ctx.fillText(ft.text, 0, 0);
        dom.ctx.restore();
    });
    dom.ctx.globalAlpha = 1.0;
}

export function updateExtraBalls() {
    for (let i = state.extraBalls.length - 1; i >= 0; i--) {
        let eb = state.extraBalls[i];

        eb.trail.push({ x: eb.x, y: eb.y, color: eb.color, scaleX: eb.scaleX, scaleY: eb.scaleY });
        if (eb.trail.length > 10) eb.trail.shift();

        eb.x += eb.dx;
        eb.y += eb.dy;

        // wall collision
        if (eb.y - eb.radius < 0 || eb.y + eb.radius > constants.CANVAS_HEIGHT) {
            playSound('wall');
            eb.dy *= -1;
            if (eb.y - eb.radius < 0) eb.y = eb.radius;
            if (eb.y + eb.radius > constants.CANVAS_HEIGHT) eb.y = constants.CANVAS_HEIGHT - eb.radius;
            createParticles(eb.x, eb.y, eb.color, 5);
        }

        // paddle collision
        let hitPaddle = null;
        if (eb.dx < 0 && checkCollision(eb, state.player)) {
            hitPaddle = state.player;
            eb.x = state.player.x + state.player.width + eb.radius;
        } else if (eb.dx > 0 && checkCollision(eb, state.computer)) {
            hitPaddle = state.computer;
            eb.x = state.computer.x - eb.radius;
        }

        if (hitPaddle) {
            playSound('paddle');
            hitPaddle.hitBump = 1.0;
            createParticles(eb.x, eb.y, hitPaddle.color, 8);
            eb.speed = Math.min(eb.speed + 0.5, constants.MAX_BALL_SPEED);
            let angle = (eb.y - (hitPaddle.y + hitPaddle.height / 2)) / (hitPaddle.height / 2) * (Math.PI / 3);
            eb.dx = (hitPaddle === state.player ? 1 : -1) * eb.speed * Math.cos(angle);
            eb.dy = eb.speed * Math.sin(angle);
        }

        // Hazards collision for extra balls
        state.hazards.forEach(h => {
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
            state.computerScore++;
            updateScoreboard('computer');
            createParticles(20, eb.y, constants.COLOR_COMPUTER, 15);
            state.extraBalls.splice(i, 1);
            checkWinCondition();
        } else if (eb.x > constants.CANVAS_WIDTH + 50) {
            state.playerScore++;
            updateScoreboard('player');
            createParticles(constants.CANVAS_WIDTH - 20, eb.y, constants.COLOR_PLAYER, 15);
            state.extraBalls.splice(i, 1);
            checkWinCondition();
        }
    }
}

export function drawMutators() {
    state.mutators.forEach(m => {
        dom.ctx.save();
        dom.ctx.beginPath();
        let r = m.radius + Math.sin(m.pulse) * 3;
        dom.ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
        dom.ctx.fillStyle = "transparent";
        dom.ctx.strokeStyle = m.color;
        dom.ctx.lineWidth = 3;
        dom.ctx.shadowColor = m.color;
        dom.ctx.shadowBlur = ((Math.sin(m.pulse * 2) + 1) / 2) * 20 + 5;
        dom.ctx.stroke();
        dom.ctx.fillStyle = m.color;
        dom.ctx.globalAlpha = 0.5;
        dom.ctx.fill();

        dom.ctx.globalAlpha = 1.0;
        dom.ctx.fillStyle = '#fff';
        dom.ctx.shadowBlur = 10;
        dom.ctx.font = `bold 16px 'Space Grotesk', sans-serif`;
        dom.ctx.textAlign = 'center';
        dom.ctx.textBaseline = 'middle';
        dom.ctx.fillText('?', m.x, m.y);
        dom.ctx.restore();
    });
}

export function drawExtraBalls() {
    state.extraBalls.forEach(eb => {
        if (state.ballInvisibleTimer > 0) dom.ctx.globalAlpha = 0.2;

        // trail
        if (state.ballInvisibleTimer <= 0) {
            for (let i = 0; i < eb.trail.length; i++) {
                const pos = eb.trail[i];
                const alpha = (i / eb.trail.length) * 0.4;
                drawBallSphere(pos.x, pos.y, eb.radius * 0.8, pos.color, pos.scaleX, pos.scaleY, alpha);
            }
        }

        drawBallSphere(eb.x, eb.y, eb.radius, eb.color, eb.scaleX, eb.scaleY);
        if (state.ballInvisibleTimer > 0) dom.ctx.globalAlpha = 1.0;
    });
}

export function updateMutators() {
    // Spawn logic
    if (state.gameState === 'PLAYING' && Math.random() < 0.003 && state.mutators.length === 0) {
        let typeObj = constants.MUTATOR_TYPES[Math.floor(Math.random() * constants.MUTATOR_TYPES.length)];
        state.mutators.push({
            x: constants.CANVAS_WIDTH / 2,
            y: Math.random() * (constants.CANVAS_HEIGHT - 100) + 50,
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
            radius: 18,
            ...typeObj,
            life: 600,
            pulse: 0
        });
    }

    for (let i = state.mutators.length - 1; i >= 0; i--) {
        let m = state.mutators[i];
        m.x += m.dx;
        m.y += m.dy;

        // Bounce off invisible middle area bounds
        if (m.y < 50 || m.y > constants.CANVAS_HEIGHT - 50) m.dy *= -1;
        if (m.x < constants.CANVAS_WIDTH / 2 - 100 || m.x > constants.CANVAS_WIDTH / 2 + 100) m.dx *= -1;

        m.life--;
        m.pulse += 0.1;
        if (m.life <= 0) {
            state.mutators.splice(i, 1);
            continue;
        }

        // Check collision main state.ball
        let hit = false;
        let pball = state.ball;
        let dx = pball.x - m.x;
        let dy = pball.y - m.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pball.radius + m.radius) {
            hit = true;
        } else {
            // also check extra balls
            for (let eb of state.extraBalls) {
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
            playSound('score_win');
            createParticles(m.x, m.y, m.color, 30);
            createFloatingText(m.x, m.y - 30, m.text, m.color);
            applyMutator(m.type, pball);
            state.mutators.splice(i, 1);
        }
    }
}

export function applyMutator(type, sourceBall) {
    if (type === 'MULTIBALL') {
        // spawn 2 extra balls
        for (let i = 0; i < 2; i++) {
            state.extraBalls.push({
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
            state.player.height = Math.max(30, constants.PADDLE_HEIGHT - 40);
        } else {
            state.computer.height = Math.max(30, constants.PADDLE_HEIGHT - 40);
        }
    } else if (type === 'INVISIBLE') {
        state.ballInvisibleTimer = 180;
    } else if (type === 'GRAVITY_WELL') {
        state.gravityWells.push({
            x: sourceBall.x,
            y: sourceBall.y,
            life: 300 // 5 seconds at 60fps
        });
    }
}

export function updateGravityWells() {
    for (let i = state.gravityWells.length - 1; i >= 0; i--) {
        let gw = state.gravityWells[i];
        gw.life--;
        if (gw.life <= 0) {
            state.gravityWells.splice(i, 1);
            continue;
        }

        // Apply force to all balls
        let balls = [state.ball, ...state.extraBalls];
        balls.forEach(b => {
            let dx = gw.x - b.x;
            let dy = gw.y - b.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 200) { // Attraction radius
                let force = (200 - dist) / 200 * 0.15;
                b.dx += (dx / dist) * force;
                b.dy += (dy / dist) * force;
            }
        });
    }
}

export function drawGravityWells() {
    if (!state.gravityWells) return;
    state.gravityWells.forEach(gw => {
        dom.ctx.save();
        dom.ctx.beginPath();
        dom.ctx.arc(gw.x, gw.y, 80, 0, Math.PI * 2);
        let grad = dom.ctx.createRadialGradient(gw.x, gw.y, 0, gw.x, gw.y, 80);
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
        grad.addColorStop(1, 'transparent');
        dom.ctx.fillStyle = grad;
        dom.ctx.fill();
        dom.ctx.restore();
    });
}


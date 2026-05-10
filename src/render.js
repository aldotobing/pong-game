import { state, dom } from './state.js';
import * as constants from './constants.js';
import { drawParticles, drawFloatingTexts, drawHazards, drawMutators, drawExtraBalls, drawGravityWells } from './entities.js';

// Rendering Logic
export function drawPaddle(p) {
    const bumpW = p.hitBump * 8;
    const bumpH = p.hitBump * 16;

    const width = p.width + bumpW;
    const height = p.height + bumpH;

    const xOffset = p === state.computer ? -bumpW : 0;
    const yOffset = -bumpH / 2;

    const grad = dom.ctx.createLinearGradient(p.x + xOffset, p.y + yOffset, p.x + xOffset + width, p.y + yOffset);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, '#ffffff');

    dom.ctx.fillStyle = grad;
    if (!constants.REDUCE_FX) {
        dom.ctx.shadowColor = p.color;
        dom.ctx.shadowBlur = p.hitBump > 0 ? 15 + (p.hitBump * 15) : 5;
    }

    dom.ctx.beginPath();
    dom.ctx.roundRect(p.x + xOffset, p.y + yOffset, width, height, 6);
    dom.ctx.fill();

    // White flash flash overlay
    if (p.hitBump > 0) {
        dom.ctx.fillStyle = `rgba(255, 255, 255, ${p.hitBump * 0.8})`;
        dom.ctx.beginPath();
        dom.ctx.roundRect(p.x + xOffset, p.y + yOffset, width, height, 6);
        dom.ctx.fill();
    }

    if (!constants.REDUCE_FX) dom.ctx.shadowBlur = 0; // reset
}

export function drawBallSphere(x, y, radius, color, scaleX, scaleY, alpha = 1.0) {
    dom.ctx.save();
    dom.ctx.translate(x, y);
    dom.ctx.scale(scaleX, scaleY);

    dom.ctx.globalAlpha = alpha;

    // Cache the radial gradient — re-creating it every frame per trail segment is expensive
    if (state.cachedBallRadius !== radius || state.cachedBallGradient === null) {
        state.cachedBallGradient = dom.ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
        state.cachedBallGradient.addColorStop(0, '#ffffff');
        state.cachedBallGradient.addColorStop(0.4, color);
        state.cachedBallGradient.addColorStop(1, '#000000');
        state.cachedBallRadius = radius;
    }

    dom.ctx.fillStyle = state.cachedBallGradient;

    if (!constants.REDUCE_FX) {
        dom.ctx.shadowColor = color;
        dom.ctx.shadowBlur = 10 * alpha;
    }

    dom.ctx.beginPath();
    dom.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    dom.ctx.fill();

    dom.ctx.restore();
}

export function drawText(text, x, y, size = 30, color = '#fff', weight = '600', align = 'center') {
    dom.ctx.fillStyle = color;
    dom.ctx.font = `${weight} ${size}px 'Inter', sans-serif`;
    dom.ctx.textAlign = align;
    dom.ctx.fillText(text, x, y);
}

export function drawNet() {
    dom.ctx.strokeStyle = constants.COLOR_NET;
    dom.ctx.lineWidth = 4;
    dom.ctx.setLineDash([15, 15]);
    dom.ctx.beginPath();
    dom.ctx.moveTo(constants.CANVAS_WIDTH / 2, 0);
    dom.ctx.lineTo(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT);
    dom.ctx.stroke();
    dom.ctx.setLineDash([]); // reset
}

export function render() {
    dom.ctx.clearRect(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT);

    dom.ctx.save();
    if (state.screenShake > 0) {
        const dx = (Math.random() - 0.5) * state.screenShake;
        const dy = (Math.random() - 0.5) * state.screenShake;
        dom.ctx.translate(dx, dy);
    }

    drawNet();

    // Draw Ball Trail
    if (state.ballInvisibleTimer <= 0) {
        for (let i = 0; i < state.ball.trail.length; i++) {
            const pos = state.ball.trail[i];
            const alpha = (i / state.ball.trail.length) * 0.4;
            drawBallSphere(pos.x, pos.y, state.ball.radius * 0.8, pos.color, pos.scaleX, pos.scaleY, alpha);
        }
    }

    // Draw Paddles
    drawPaddle(state.player);
    drawPaddle(state.computer);

    drawHazards();
    drawMutators();
    drawExtraBalls();
    drawGravityWells();

    // Draw Ball
    if (state.ballInvisibleTimer <= 0) {
        drawBallSphere(state.ball.x, state.ball.y, state.ball.radius, state.ball.color, state.ball.scaleX, state.ball.scaleY);
    } else {
        // Draw just a faint glimmer when invisible
        dom.ctx.globalAlpha = 0.2;
        drawBallSphere(state.ball.x, state.ball.y, state.ball.radius, state.ball.color, state.ball.scaleX, state.ball.scaleY);
        dom.ctx.globalAlpha = 1.0;
    }

    // Draw Particles
    drawParticles();
    drawFloatingTexts();

    // Custom CRT lines effect based on screen shake / intensity
    if (state.rallyCount > 5) {
        dom.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(state.rallyCount * 0.002, 0.05)})`;
        dom.ctx.fillRect(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT);
    }

    dom.ctx.restore();

    // UI Overlays
    if (state.gameState === 'START') {
        dom.ctx.fillStyle = 'rgba(11, 17, 32, 0.85)';
        dom.ctx.fillRect(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT);

        // Prominent title with subtle blue glow
        const titlePulse = Math.sin(Date.now() / 500);
        dom.ctx.shadowColor = constants.COLOR_PLAYER;
        dom.ctx.shadowBlur = 20 + 10 * titlePulse;
        drawText('PONG', constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2 - 50, 88, '#fff', '800');
        dom.ctx.shadowBlur = 0; // reset

        const pulseAlpha = 0.4 + 0.6 * Math.sin(Date.now() / 300);
        drawText('Press Space to Start', constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2 + 40, 22, `rgba(255, 255, 255, ${pulseAlpha})`, '500');

        drawText('Controls: Mouse or Up/Down Arrows', constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2 + 90, 14, 'rgba(255, 255, 255, 0.4)', '400');
    } else if (state.gameState === 'PAUSED') {
        dom.ctx.fillStyle = 'rgba(11, 17, 32, 0.7)';
        dom.ctx.fillRect(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT);

        drawText('PAUSED', constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2, 48, '#fff', '700');

        const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
        drawText('Press P to Resume', constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2 + 50, 18, `rgba(255, 255, 255, ${pulseAlpha})`, '500');
    } else if (state.gameState === 'GAME_OVER') {
        dom.ctx.fillStyle = 'rgba(11, 17, 32, 0.8)';
        dom.ctx.fillRect(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT);

        const winColor = state.winner === 'PLAYER' ? constants.COLOR_PLAYER : constants.COLOR_COMPUTER;
        const fullText = `${state.winner} WINS`;

        // Typewriter effect
        const elapsed = Date.now() - state.gameOverStartTime;
        const charsToShow = Math.min(fullText.length, Math.floor(elapsed / 150));
        const showCursor = Math.floor(elapsed / 400) % 2 === 0;
        const displayText = fullText.substring(0, charsToShow) + (showCursor ? '█' : '');

        // Subtle pulsing glow effect
        const pulse = Math.sin(Date.now() / 300);
        dom.ctx.shadowColor = winColor;
        dom.ctx.shadowBlur = 15 + 10 * pulse;
        dom.ctx.globalAlpha = 0.85 + 0.15 * pulse;

        // Calculate starting X to keep it centered overall
        dom.ctx.font = `700 56px 'Inter', sans-serif`;
        const totalWidth = dom.ctx.measureText(fullText + '█').width;
        const startX = constants.CANVAS_WIDTH / 2 - totalWidth / 2;

        drawText(displayText, startX, constants.CANVAS_HEIGHT / 2 - 30, 56, winColor, '700', 'left');

        dom.ctx.shadowBlur = 0; // Reset shadow
        dom.ctx.globalAlpha = 1.0; // Reset alpha

        if (charsToShow === fullText.length) {
            const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 400);
            drawText('Click or Press Space to Play Again', constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2 + 40, 18, `rgba(255, 255, 255, ${pulseAlpha})`, '500');
        }
    }
}


import { state, dom } from './state.js';
import * as constants from './constants.js';
import { playSound } from './audio.js';
import { createParticles, createFloatingText, updateParticles, updateFloatingTexts, updateHazards, updateMutators, updateExtraBalls, updateGravityWells } from './entities.js';

// Reset Ball
export function resetBall(scorer) {
    state.ball.x = constants.CANVAS_WIDTH / 2;
    state.ball.y = constants.CANVAS_HEIGHT / 2;
    state.ball.speed = constants.INITIAL_BALL_SPEED;
    state.rallyCount = 0;
    state.ball.trail = [];
    state.extraBalls = [];
    state.mutators = [];
    state.ballInvisibleTimer = 0;

    state.player.height = constants.PADDLE_HEIGHT;
    state.computer.height = constants.PADDLE_HEIGHT;

    state.ball.color = constants.COLOR_BALL;
    state.ball.scaleX = 1;
    state.ball.scaleY = 1;
    state.ball.targetScaleX = 1;
    state.ball.targetScaleY = 1;

    const direction = scorer === 'player' ? -1 : 1;
    state.ball.dx = direction * constants.INITIAL_BALL_SPEED;
    state.ball.dy = (Math.random() * 2 - 1) * constants.INITIAL_BALL_SPEED;
}

// Reset Game
export function resetGame() {
    state.playerScore = 0;
    state.computerScore = 0;
    state.winner = '';
    updateScoreboard();
    resetBall(Math.random() > 0.5 ? 'player' : 'computer');
    state.player.y = constants.CANVAS_HEIGHT / 2 - constants.PADDLE_HEIGHT / 2;
    state.computer.y = constants.CANVAS_HEIGHT / 2 - constants.PADDLE_HEIGHT / 2;
    state.particles = [];
    const mobileHint = document.getElementById('mobileHint');
    if (mobileHint) mobileHint.style.display = 'none';
    const gameOverUi = document.getElementById('gameOverUi');
    if (gameOverUi) gameOverUi.style.display = 'none';
    const appFooter = document.getElementById('appFooter');
    if (appFooter) appFooter.style.display = 'none';
}

// Update Scoreboard & UI
export function updateScoreboard(scorer = null) {
    dom.playerScoreEl.innerText = state.playerScore;
    dom.computerScoreEl.innerText = state.computerScore;

    // Update ultimate bar
    dom.ultimateBarEl.style.width = `${state.ultimateEnergy}%`;

    const animateScore = (el) => {
        const dir = Math.random() > 0.5 ? 1 : -1;
        el.style.setProperty('--pop-dir', dir);
        el.classList.remove('pop');
        // prompt a reflow
        void el.offsetWidth;
        el.classList.add('pop');
        setTimeout(() => el.classList.remove('pop'), 200);
    };

    if (scorer === 'player') animateScore(dom.playerScoreEl);
    if (scorer === 'computer') animateScore(dom.computerScoreEl);
}

// Ultimate Burst Ability
export function triggerUltimate() {
    if (state.ultimateEnergy < 100) return;
    
    state.ultimateEnergy = 0;
    updateScoreboard(); // Reset bar UI
    
    // Time Dilation Effect
    state.gameSpeedMultiplier = 0.3; // Global game speed multiplier
    
    createFloatingText(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2, "CHRONOS OVERLOAD!", "#f59e0b");
    playSound('score_win');
    
    setTimeout(() => {
        state.gameSpeedMultiplier = 1.0;
    }, 3000);
}

// Collision Detection (Circle vs Rectangle)
export function checkCollision(b, p) {
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
export function update() {
    if (state.gameState !== 'PLAYING') return;

    if (state.screenShake > 0) {
        state.screenShake *= 0.85;
        if (state.screenShake < 0.5) state.screenShake = 0;
    }

    if (state.hitPauseFrames > 0) {
        state.hitPauseFrames--;
        return;
    }

    if (state.player.hitBump > 0) state.player.hitBump -= 0.1;
    if (state.computer.hitBump > 0) state.computer.hitBump -= 0.1;

    // Squash and stretch physics
    state.ball.scaleX += (state.ball.targetScaleX - state.ball.scaleX) * 0.2;
    state.ball.scaleY += (state.ball.targetScaleY - state.ball.scaleY) * 0.2;
    state.ball.targetScaleX += (1 - state.ball.targetScaleX) * 0.1;
    state.ball.targetScaleY += (1 - state.ball.targetScaleY) * 0.1;

    updateParticles();
    updateFloatingTexts();
    updateHazards();
    updateMutators();
    updateExtraBalls();
    updateGravityWells();

    if (state.ballInvisibleTimer > 0) state.ballInvisibleTimer--;

    // Player Movement
    if (state.keys.ArrowUp) state.player.y -= constants.PADDLE_SPEED;
    if (state.keys.ArrowDown) state.player.y += constants.PADDLE_SPEED;
    if (state.player.y < 0) state.player.y = 0;
    if (state.player.y + constants.PADDLE_HEIGHT > constants.CANVAS_HEIGHT) state.player.y = constants.CANVAS_HEIGHT - constants.PADDLE_HEIGHT;

    // Computer AI (Smooth predictive tracking for closest incoming state.ball)
    let closestBall = null;
    let minDist = Infinity;

    let allBalls = [state.ball, ...state.extraBalls];
    allBalls.forEach(b => {
        if (b.dx > 0) { // Heading towards state.computer
            let dist = (state.computer.x - b.x) / b.dx; // frames to reach
            if (dist > 0 && dist < minDist) {
                minDist = dist;
                closestBall = b;
            }
        }
    });

    if (closestBall) {
        const computerCenter = state.computer.y + state.computer.height / 2;
        const targetY = closestBall.y + (closestBall.dy * 5);

        if (computerCenter < targetY - 10) {
            state.computer.y += constants.COMPUTER_SPEED;
        } else if (computerCenter > targetY + 10) {
            state.computer.y -= constants.COMPUTER_SPEED;
        }
    } else {
        const computerCenter = state.computer.y + state.computer.height / 2;
        if (computerCenter < constants.CANVAS_HEIGHT / 2 - 10) state.computer.y += constants.COMPUTER_SPEED * 0.5;
        else if (computerCenter > constants.CANVAS_HEIGHT / 2 + 10) state.computer.y -= constants.COMPUTER_SPEED * 0.5;
    }

    if (state.computer.y < 0) state.computer.y = 0;
    if (state.computer.y + state.computer.height > constants.CANVAS_HEIGHT) state.computer.y = constants.CANVAS_HEIGHT - state.computer.height;

    // Record trail
    state.ball.trail.push({ x: state.ball.x, y: state.ball.y, color: state.ball.color, scaleX: state.ball.scaleX, scaleY: state.ball.scaleY });
    const maxTrail = 10 + Math.min(state.rallyCount * 2, 25);
    if (state.ball.trail.length > maxTrail) state.ball.trail.shift();

    // Ball Movement
    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;

    // Wall Collision
    if (state.ball.y - state.ball.radius < 0 || state.ball.y + state.ball.radius > constants.CANVAS_HEIGHT) {
        playSound('wall');
        state.ball.dy *= -1;
        if (state.ball.y - state.ball.radius < 0) state.ball.y = state.ball.radius;
        if (state.ball.y + state.ball.radius > constants.CANVAS_HEIGHT) state.ball.y = constants.CANVAS_HEIGHT - state.ball.radius;

        // Squash on wall hit
        state.ball.scaleX = 1.3;
        state.ball.scaleY = 0.7;

        createParticles(state.ball.x, state.ball.y < constants.CANVAS_HEIGHT / 2 ? 0 : constants.CANVAS_HEIGHT, state.ball.color, 5);
    }

    // Paddle Collision
    let hitPaddle = null;
    if (state.ball.dx < 0 && checkCollision(state.ball, state.player)) {
        hitPaddle = state.player;
        state.ball.x = state.player.x + state.player.width + state.ball.radius;
    } else if (state.ball.dx > 0 && checkCollision(state.ball, state.computer)) {
        hitPaddle = state.computer;
        state.ball.x = state.computer.x - state.ball.radius;
    }

    if (hitPaddle) {
        playSound('paddle');
        hitPaddle.hitBump = 1.0;
        state.ball.color = hitPaddle.color;
        state.rallyCount++;

        // Energy gain
        state.ultimateEnergy = Math.min(state.ultimateEnergy + 2, 100);
        updateScoreboard(); // Update energy bar UI

        // Determine if this was a perfect hit (inner 20% of paddle)
        const hitPointRaw = (state.ball.y - (hitPaddle.y + hitPaddle.height / 2)) / (hitPaddle.height / 2);
        const hitPointAbs = Math.abs(hitPointRaw);
        const isPerfect = hitPointAbs < 0.2;

        if (isPerfect) {
            state.perfectStreak++;
            state.multiplier = Math.min(state.perfectStreak + 1, 5);
            state.ultimateEnergy = Math.min(state.ultimateEnergy + 8, 100); // Bonus energy
            createFloatingText(state.ball.x, state.ball.y - 40, `PERFECT! x${state.multiplier}`, '#f59e0b');
            playSound('score_win');
            state.screenShake += 5;
        } else {
            state.perfectStreak = 0;
            state.multiplier = 1;
        }

        // Spawn combo text
        if (state.rallyCount % 5 === 0 && state.rallyCount > 0) {
            const texts = ["NICE!", "HOT!", "SUPER!", "SMASH!", "ON FIRE!", "GODLIKE!", "UNSTOPPABLE!"];
            const textToUse = texts[Math.min(Math.floor(state.rallyCount / 5) - 1, texts.length - 1)];
            createFloatingText(state.ball.x, state.ball.y - 20, textToUse, hitPaddle.color);
        } else if (state.ball.speed > constants.INITIAL_BALL_SPEED + 4) {
            if (Math.random() < 0.2) createFloatingText(state.ball.x, state.ball.y - 20, "SPEED UP!", "#fff");
        }

        state.hitPauseFrames = Math.min(2 + Math.floor(state.rallyCount / 4), 8);
        state.screenShake = Math.min(3 + state.rallyCount * 1.5, 20);

        // Squash on paddle hit
        state.ball.scaleX = 0.5 - (state.rallyCount * 0.01);
        state.ball.scaleY = 1.5 + (state.rallyCount * 0.02);

        createParticles(state.ball.x, state.ball.y, hitPaddle.color, 8 + Math.min(state.rallyCount, 15));

        // Combo & Style Bonus: Sharp Shot
        if (hitPointAbs > 0.85) {
            playSound('score_win');
            createFloatingText(state.ball.x, state.ball.y, "SHARP SHOT!", "#facc15");
            state.ball.speed += 3; // Huge speed boost
            state.screenShake = 15;
            state.hitPauseFrames = 10;
        }

        let angle = hitPointRaw * (Math.PI / 3); // Base angle up to 60 degrees

        // Introduce a slight random variation (approx +/- 8.5 degrees) for unpredictability
        const randomVariation = (Math.random() - 0.5) * 0.3;
        angle += randomVariation;

        // Clamp the angle to prevent it from becoming too vertical
        const maxAngle = Math.PI / 2.4;
        if (angle > maxAngle) angle = maxAngle;
        if (angle < -maxAngle) angle = -maxAngle;

        state.ball.speed = Math.min(state.ball.speed + 0.6 + (state.rallyCount * 0.03), constants.MAX_BALL_SPEED);
        const direction = hitPaddle === state.player ? 1 : -1;

        state.ball.dx = direction * state.ball.speed * Math.cos(angle);
        state.ball.dy = state.ball.speed * Math.sin(angle);
    }

    // Scoring
    if (state.ball.x < -50) {
        playSound('score_lose');
        state.computerScore++;
        updateScoreboard('computer');
        
        // Epic Score Effect
        state.screenShake = 30;
        state.hitPauseFrames = 20;
        createParticles(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2, constants.COLOR_COMPUTER, 100);
        createFloatingText(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2, "POINT CPU!", constants.COLOR_COMPUTER);
        
        checkWinCondition();
        if (state.gameState === 'PLAYING') resetBall('computer');
    } else if (state.ball.x > constants.CANVAS_WIDTH + 50) {
        playSound('score_win');
        state.playerScore++;
        updateScoreboard('player');
        
        // Epic Score Effect
        state.screenShake = 40;
        state.hitPauseFrames = 25;
        createParticles(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2, constants.COLOR_PLAYER, 150);
        createFloatingText(constants.CANVAS_WIDTH / 2, constants.CANVAS_HEIGHT / 2, "POINT PLAYER!", constants.COLOR_PLAYER);
        
        checkWinCondition();
        if (state.gameState === 'PLAYING') resetBall('player');
    }
}

export function checkWinCondition() {
    if (state.playerScore >= constants.WINNING_SCORE) {
        state.winner = 'PLAYER';
        state.gameState = 'GAME_OVER';
        state.gameOverStartTime = Date.now();
        showGameOverUi();
    } else if (state.computerScore >= constants.WINNING_SCORE) {
        state.winner = 'CPU';
        state.gameState = 'GAME_OVER';
        state.gameOverStartTime = Date.now();
        showGameOverUi();
    }
}

export function showGameOverUi() {
    const ui = document.getElementById('gameOverUi');
    if (ui) {
        // slight delay to let the text animation play out first
        setTimeout(() => {
            ui.style.display = 'flex';
            ui.style.animation = 'fadeInUi 0.5s ease forwards';
            
            const bahlil = document.getElementById('bahlilMeme');
            if (bahlil && state.winner === 'CPU') bahlil.style.display = 'block';

            const tweetBtn = document.getElementById("tweetShare");
            if (tweetBtn) {
                const resultMsg = state.winner === 'PLAYER' ? 'won' : 'lost';
                const scoreText = `${state.playerScore} - ${state.computerScore}`;
                const text = `I just ${resultMsg} at Retro Pong with a score of ${scoreText}! 🏓\n\nCan you beat it?`;
                const shareUrl = "https://retropong.vercel.app/";
                tweetBtn.onclick = (e) => {
                    e.preventDefault();
                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
                    window.open(twitterUrl, '_blank', 'width=550,height=420');
                };
            }

            const igBtn = document.getElementById("igShare");
            if (igBtn) {
                igBtn.onclick = async () => {
                    const canvas = document.getElementById('gameCanvas');
                    
                    // Create a 1080x1920 portrait canvas for Instagram Story
                    const igCanvas = document.createElement('canvas');
                    igCanvas.width = 1080;
                    igCanvas.height = 1920;
                    const igCtx = igCanvas.getContext('2d');

                    // 1. Draw sleek gradient background
                    const grad = igCtx.createLinearGradient(0, 0, 1080, 1920);
                    grad.addColorStop(0, '#0f172a'); // slate-900
                    grad.addColorStop(1, '#312e81'); // indigo-900
                    igCtx.fillStyle = grad;
                    igCtx.fillRect(0, 0, 1080, 1920);

                    // 2. Add glowing ambient orbs in background
                    const orb1 = igCtx.createRadialGradient(200, 300, 0, 200, 300, 600);
                    orb1.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
                    orb1.addColorStop(1, 'transparent');
                    igCtx.fillStyle = orb1;
                    igCtx.fillRect(0, 0, 1080, 1920);

                    const orb2 = igCtx.createRadialGradient(900, 1600, 0, 900, 1600, 800);
                    orb2.addColorStop(0, 'rgba(244, 63, 94, 0.25)');
                    orb2.addColorStop(1, 'transparent');
                    igCtx.fillStyle = orb2;
                    igCtx.fillRect(0, 0, 1080, 1920);

                    // 3. Draw punchy copywriting at the top
                    igCtx.textAlign = 'center';
                    igCtx.fillStyle = 'white';
                    igCtx.font = "800 85px 'Inter', sans-serif";
                    const headline = state.winner === 'PLAYER' ? "I DOMINATED PONG!" : "I GOT REKT IN PONG!";
                    igCtx.fillText(headline, 540, 350);

                    igCtx.font = "600 45px 'Inter', sans-serif";
                    igCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    igCtx.fillText("CAN YOU BEAT THIS SCORE?", 540, 440);

                    // 4. Draw the actual game board in the center
                    const scale = 1.1;
                    const dw = 800 * scale;
                    const dh = 600 * scale;
                    const dx = (1080 - dw) / 2;
                    const dy = (1920 - dh) / 2 - 40; // Shift up slightly

                    // Add a glowing border around the game screenshot
                    igCtx.shadowColor = state.winner === 'PLAYER' ? '#38bdf8' : '#f43f5e';
                    igCtx.shadowBlur = 50;
                    igCtx.fillStyle = '#000';
                    igCtx.fillRect(dx - 6, dy - 6, dw + 12, dh + 12);
                    igCtx.shadowBlur = 0; // reset
                    
                    igCtx.drawImage(canvas, dx, dy, dw, dh);

                    // 5. Draw the massive score at the bottom
                    igCtx.font = "900 140px 'Inter', sans-serif";
                    igCtx.fillStyle = 'white';
                    igCtx.fillText(`${state.playerScore} - ${state.computerScore}`, 540, 1500);

                    // 6. Draw URL watermark
                    igCtx.font = "500 40px 'Inter', sans-serif";
                    igCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    igCtx.fillText("retropong.vercel.app", 540, 1750);

                    // Output this new portrait canvas instead of the main one
                    igCanvas.toBlob(async (blob) => {
                        if (!blob) {
                            console.error('Canvas toBlob failed');
                            return;
                        }

                        const file = new File([blob], 'retropong-score.png', { type: 'image/png' });
                        const shareText = `I just ${state.winner === 'PLAYER' ? 'won' : 'lost'} at Retro Pong! 🏓\n\nCan you beat it?\n\nPlay here: https://retropong.vercel.app/`;

                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: 'Retro Pong Score',
                                    text: shareText
                                });
                            } catch (err) {
                                if (err.name !== 'AbortError') console.error('Share failed:', err);
                            }
                        } else {
                            try {
                                await navigator.clipboard.writeText(shareText);
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

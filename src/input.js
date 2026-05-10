import { state, dom } from './state.js';
import * as constants from './constants.js';
import { initAudio } from './audio.js';
import { resetGame } from './logic.js';

export function setupInput() {
// Input Handling
state.keys = { ArrowUp: false, ArrowDown: false };

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.key === 'ArrowUp') state.keys.ArrowUp = true;
    if (e.code === 'ArrowDown' || e.key === 'ArrowDown') state.keys.ArrowDown = true;

    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        initAudio();
        if (state.gameState === 'START' || state.gameState === 'GAME_OVER') {
            resetGame();
            state.gameState = 'PLAYING';
        }
    }

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
        if (state.ultimateEnergy >= 100 && state.gameState === 'PLAYING') {
            triggerUltimate();
        }
    }

    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.key === 'ArrowUp') state.keys.ArrowUp = false;
    if (e.code === 'ArrowDown' || e.key === 'ArrowDown') state.keys.ArrowDown = false;
});

document.addEventListener('mousemove', (e) => {
    if (state.gameState === 'PLAYING') {
        const rect = dom.canvas.getBoundingClientRect();
        const scaleY = dom.canvas.height / rect.height;
        const mouseY = (e.clientY - rect.top) * scaleY;
        state.player.y = mouseY - constants.PADDLE_HEIGHT / 2;
        if (state.player.y < 0) state.player.y = 0;
        if (state.player.y + constants.PADDLE_HEIGHT > constants.CANVAS_HEIGHT) state.player.y = constants.CANVAS_HEIGHT - constants.PADDLE_HEIGHT;
    }
});

state.lastTouchY = null;
const TOUCH_SENSITIVITY = 1.5; // Make the paddle move a bit faster than the finger for better reach

function handleTouchMove(e) {
    if (state.gameState === 'PLAYING') {
        e.preventDefault();
        const rect = dom.canvas.getBoundingClientRect();
        const scaleY = dom.canvas.height / rect.height;
        const touch = e.touches[0];
        
        if (state.lastTouchY !== null) {
            const deltaY = (touch.clientY - state.lastTouchY) * scaleY * TOUCH_SENSITIVITY;
            state.player.y += deltaY;
            
            if (state.player.y < 0) state.player.y = 0;
            if (state.player.y + constants.PADDLE_HEIGHT > constants.CANVAS_HEIGHT) state.player.y = constants.CANVAS_HEIGHT - constants.PADDLE_HEIGHT;
        }
        
        state.lastTouchY = touch.clientY;
    }
}

document.addEventListener('touchmove', handleTouchMove, { passive: false });

document.addEventListener('touchstart', (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.social-shares')) return;

    // Only prevent default if we're actually interacting with the game
    // This allows clicking buttons normally
    e.preventDefault();
    initAudio();
    if (state.gameState === 'START' || state.gameState === 'GAME_OVER') {
        resetGame();
        state.gameState = 'PLAYING';
    }
    
    if (e.touches.length > 0) {
        state.lastTouchY = e.touches[0].clientY;
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    state.lastTouchY = null;
});

document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;

    initAudio();
    if (state.gameState === 'START' || state.gameState === 'GAME_OVER') {
        resetGame();
        state.gameState = 'PLAYING';
    }
});


}
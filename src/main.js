import { state, dom } from './state.js';
import * as constants from './constants.js';
import { setupInput } from './input.js';
import { resetBall, updateScoreboard, update } from './logic.js';
import { render } from './render.js';

let lastTime = performance.now();

// Game Loop
function gameLoop(currentTime) {
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // Cap dt to avoid massive jumps (e.g. tab switching)
    const normalizedDt = Math.min(dt, 0.1); 

    update(normalizedDt);
    render();
    requestAnimationFrame(gameLoop);
}

// Initialization
setupInput();
resetBall('player');
updateScoreboard();
requestAnimationFrame(gameLoop);

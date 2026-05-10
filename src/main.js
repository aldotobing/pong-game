import { state, dom } from './state.js';
import * as constants from './constants.js';
import { setupInput } from './input.js';
import { resetBall, updateScoreboard, update } from './logic.js';
import { render } from './render.js';

// Game Loop
// Now that performance bottlenecks (shadowBlur, gradients) are fixed,
// a 1:1 update/render loop will run buttery smooth at native refresh rates.
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Initialization
setupInput();
resetBall('player');
updateScoreboard();
requestAnimationFrame(gameLoop);

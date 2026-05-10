# Retro Pong - Chaos Edition

A fast-paced, unhinged reimagining of the classic Pong. This version pushes your reflexes to the limit with screen shake, particle effects, mutators, and hazardous obstacles. Challenge the AI or test your endurance in unpredictable, chaotic rallies!

## Features

- **Juicy Game Feel:** Screen shake on impacts, hit pause on paddle strikes, and squash & stretch physics on the ball.
- **Mutators (Glowing Orbs):** Hit these mysterious orbs in the center of the field to trigger chaos:
  - 🟢 **MULTIBALL!** - Spawns extra balls for ultimate chaos.
  - 🔴 **SHRINK PADDLE!** - Reduces your paddle size temporarily.
  - 🟣 **GHOST BALL!** - The main ball turns nearly invisible for a short duration!
  - 🟠 **GRAVITY WELL!** - Spawns a gravitational field that bends the ball's path.
  - 🔴 **CORRUPTION!** - Triggers a satirical chaos event with glitch effects, memes, and randomized political slogans.
- **Dynamic Arena Hazards:** Two roaming neon hazards bounce along the center line. Hitting one reflects the ball unpredictably.
- **Combo & Style System:** 
  - **Sharp Shots:** Hitting the ball with the extreme edge of your paddle performs a "Sharp Shot", awarding an extra point and massive speed boost.
  - **Rally Combos:** Maintain a long rally for multiplier effects, CRT scanline overlays, and hype text!
- **Juicy Graphics:** Vibrant neon colors, glowing trails, CRT scanline intensity buildup, and explosive particle effects.
- **Synthetic Sound:** Web Audio API generated sound effects with differing tones for paddle hits, wall bounces, scoring, and sharp shots.
- **Predictive AI:** A responsive AI that attempts to track the closest incoming ball.
- **Scaleable:** Plays in your browser and automatically scales to the window size.

## How to Play

### Controls
- **Up Arrow / W :** Move Paddle Up
- **Down Arrow / S :** Move Paddle Down
- **Click or Touch (Mobile):** The paddle will smoothly follow your touch or mouse Y-position.
- **Click anywhere on the "START" screen to begin.**

### Objective
- The first to reach **10 points** wins!
- Score points by passing the ball past the opponent's paddle.
- Look out for "Sharp Shots" (hitting with the tip of the paddle) which instantly give you an extra point!

## Technical Implementation Details

- **Vanilla HTML5 Canvas:** No external game engines. 
- **Web Audio API:** All sound effects are generated on the fly via oscillators — no external audio files needed.
- **Vite:** Handled via Vite for fast development and preview support.
- **TailwindCSS:** Used for styling the overlay elements on top of the canvas.

## Development

To run the game locally: 

1. Ensure you have Node.js installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the displayed `localhost:3000` URL in your browser.

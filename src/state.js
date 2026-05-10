import * as constants from './constants.js';

export const dom = {
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas') ? document.getElementById('gameCanvas').getContext('2d') : null,
    playerScoreEl: document.getElementById('playerScore'),
    computerScoreEl: document.getElementById('computerScore'),
    gameOverUi: document.getElementById('gameOverUi'),
    mobileHint: document.getElementById('mobileHint'),
    appFooter: document.getElementById('appFooter')
};

export const state = {
    screenShake: 0,
    hitPauseFrames: 0,
    rallyCount: 0,
    gameState: 'START',
    playerScore: 0,
    computerScore: 0,
    perfectStreak: 0,
    multiplier: 1,
    winner: '',
    gameOverStartTime: 0,
    particles: [],
    floatingTexts: [],
    hazards: [
        { x: 400, y: 200, radius: 20, dy: 2, color: '#d946ef' },
        { x: 400, y: 400, radius: 20, dy: -2, color: '#0ea5e9' }
    ],
    mutators: [],
    extraBalls: [],
    gravityWells: [],
    ballInvisibleTimer: 0,
    player: {
        x: 40,
        y: constants.CANVAS_HEIGHT / 2 - constants.PADDLE_HEIGHT / 2,
        width: constants.PADDLE_WIDTH,
        height: constants.PADDLE_HEIGHT,
        color: constants.COLOR_PLAYER,
        hitBump: 0
    },
    computer: {
        x: constants.CANVAS_WIDTH - 40 - constants.PADDLE_WIDTH,
        y: constants.CANVAS_HEIGHT / 2 - constants.PADDLE_HEIGHT / 2,
        width: constants.PADDLE_WIDTH,
        height: constants.PADDLE_HEIGHT,
        color: constants.COLOR_COMPUTER,
        hitBump: 0
    },
    ball: {
        x: constants.CANVAS_WIDTH / 2,
        y: constants.CANVAS_HEIGHT / 2,
        radius: constants.BALL_RADIUS,
        dx: constants.INITIAL_BALL_SPEED,
        dy: constants.INITIAL_BALL_SPEED,
        speed: constants.INITIAL_BALL_SPEED,
        trail: [],
        color: constants.COLOR_BALL,
        scaleX: 1,
        scaleY: 1,
        targetScaleX: 1,
        targetScaleY: 1
    },
    keys: { ArrowUp: false, ArrowDown: false },
    lastTouchY: null,
    cachedBallGradient: null,
    cachedBallRadius: -1
};

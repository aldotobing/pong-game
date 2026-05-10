// Game Constants
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 90;
export const BALL_RADIUS = 8;
export const WINNING_SCORE = 10;
export const INITIAL_BALL_SPEED = 7;
export const MAX_BALL_SPEED = 24;

export let screenShake = 0;
export let hitPauseFrames = 0;
export let rallyCount = 0;
export const PADDLE_SPEED = 10;
export const COMPUTER_SPEED = 5.5;

// Mobile/Safari detection — shadowBlur is ~5x slower on Safari GPU
export const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const REDUCE_FX = isMobile || isSafari;

// Cache ball gradient to avoid re-creating each frame
export let cachedBallGradient = null;
export let cachedBallRadius = -1;

// Colors
export const COLOR_PLAYER = '#38bdf8';
export const COLOR_COMPUTER = '#f43f5e';
export const COLOR_BALL = '#ffffff';
export const COLOR_BG = '#0b1120';
export const COLOR_NET = 'rgba(255, 255, 255, 0.05)';

export const MUTATOR_TYPES = [
    { type: 'MULTIBALL', color: '#10b981', text: 'MULTIBALL!' },
    { type: 'SHRINK', color: '#ef4444', text: 'SHRINK PADDLE!' },
    { type: 'INVISIBLE', color: '#8b5cf6', text: 'GHOST BALL!' },
    { type: 'GRAVITY_WELL', color: '#f59e0b', text: 'GRAVITY WELL!' },
    { type: 'CORRUPTION_BALL', color: '#ef4444', text: 'CORRUPTION!' }
];

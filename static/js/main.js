// Main entry point for Chess Application
import { 
    onDragStart, 
    onDrop, 
    onSnapEnd, 
    onDragEnd,
    initializeEventListeners,
    startLocalGame,
    selectAILevel,
    startAIGame,
    resignGame,
    offerDraw,
    flipBoard
} from './event-handlers.js';
import { showScreen } from './ui.js';
import { startGameTimer, updateTimerDisplay } from './timer.js';
import { initializeSocket } from './socket.js';
import { exitToMenu } from './game-utils.js';

// Initialize global game variables
let game = new Chess();
let board = null;

// Document ready initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // Initialize Chessboard with custom configuration
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: '../static/img/chesspieces/wikipedia/{piece}.png',
        showNotation: true,
        moveSpeed: 'fast',
        snapbackSpeed: 'fast',
        snapSpeed: 'fast',
        appearSpeed: 200,
        trashSpeed: 100
    };

    // Create board
    window.board = Chessboard('board', config);
    window.game = game;

    // Log board initialization
    console.log('Chessboard initialized:', window.board);

    // Add dark theme to board
    document.querySelector('.board-b72b1').classList.add('dark-board');

    // Initialize socket connection
    initializeSocket();

    // Set up event listeners
    initializeEventListeners();

    // Checkmate screen event listeners
    const checkmateRematchBtn = document.getElementById('checkmate-rematch-btn');
    const checkmateMenuBtn = document.getElementById('checkmate-menu-btn');

    if (checkmateRematchBtn) {
        checkmateRematchBtn.addEventListener('click', () => {
            // Reset game state and start a new game with the same difficulty
            const currentDifficulty = window.aiDifficulty || 'medium';
            selectAILevel(currentDifficulty);
        });
    }

    if (checkmateMenuBtn) {
        checkmateMenuBtn.addEventListener('click', () => {
            // Return to main menu
            exitToMenu();
        });
    }

    // Show menu screen by default
    showScreen('menu-screen');

    // Additional debug logging
    console.log('Global game:', window.game);
    console.log('Global board:', window.board);
});

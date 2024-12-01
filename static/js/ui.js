import { playSound } from './sound.js';
import { startGameTimer, updateTimerDisplay } from './timer.js';
import { escapeHtml } from './game-utils.js';

// UI Management Functions
function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });

    // Find and show the target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.style.display = 'flex';
        console.log(`Showing screen: ${screenId}`);
    } else {
        console.error(`Screen not found: ${screenId}`);
    }
}

// Show error messages
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = escapeHtml(message);
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Show generic message
function showMessage(message) {
    const messageElement = document.getElementById('message-display');
    if (messageElement) {
        messageElement.textContent = escapeHtml(message);
        messageElement.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
}

// Update game status display
function updateGameStatus() {
    const statusElement = document.getElementById('game-status');
    if (statusElement) {
        const game = window.game; // Assuming game is a global variable
        
        if (game.game_over()) {
            if (game.in_checkmate()) {
                // Determine winner based on current turn
                const winner = game.turn() === 'b' ? 'white' : 'black';
                showCheckmate(winner);
            } else if (game.in_draw()) {
                // Show draw screen if needed
                showScreen('draw-screen');
            }
        } else {
            if (game.in_checkmate()) {
                statusElement.textContent = 'Checkmate!';
                playSound('checkmate');
            } else if (game.in_draw()) {
                statusElement.textContent = 'Draw!';
                playSound('draw');
            } else if (game.in_stalemate()) {
                statusElement.textContent = 'Stalemate!';
            } else if (game.in_threefold_repetition()) {
                statusElement.textContent = 'Threefold Repetition!';
            } else if (game.insufficient_material()) {
                statusElement.textContent = 'Insufficient Material!';
            } else {
                const currentTurn = game.turn() === 'w' ? 'White' : 'Black';
                statusElement.textContent = `${currentTurn} to Move`;
            }
        }
    }
}

function showCheckmate(winner) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });

    // Show checkmate screen
    const checkmateScreen = document.getElementById('checkmate-screen');
    if (checkmateScreen) {
        checkmateScreen.classList.add('active');
        checkmateScreen.style.display = 'flex';

        // Update winner text
        const winnerText = checkmateScreen.querySelector('.winner-text');
        if (winnerText) {
            winnerText.textContent = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!`;
        }
    }
}

// Update turn indicators
function updateTurnIndicators() {
    const whiteTurnIndicator = document.getElementById('white-turn-indicator');
    const blackTurnIndicator = document.getElementById('black-turn-indicator');
    
    if (whiteTurnIndicator && blackTurnIndicator) {
        const game = window.game;
        const isWhiteTurn = game.turn() === 'w';
        
        whiteTurnIndicator.classList.toggle('active', isWhiteTurn);
        blackTurnIndicator.classList.toggle('active', !isWhiteTurn);
    }
}

// Add click handler utility
function addClickHandler(button, handler) {
    if (button) {
        button.addEventListener('click', handler);
    } else {
        console.warn('Button not found for click handler');
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Exit to main menu
function exitToMenu() {
    // Reset game state
    if (window.game) {
        window.game.reset();
    }

    // Reset board if exists
    if (window.board) {
        window.board.position('start');
    }

    // Stop game timer
    import('./timer.js').then(timer => {
        if (timer.stopGameTimer) {
            timer.stopGameTimer();
        }
    });

    // Clear any active modals or overlays
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.remove());

    // Show main menu screen
    showScreen('menu-screen');

    // Reset any game-specific variables
    window.playerColor = null;
    window.aiDifficulty = null;
    window.currentGameMode = null;

    console.log('Exited to main menu');
}

// Update room code display
function updateRoomCode(roomCode) {
    const roomCodeDisplay = document.getElementById('room-code-display');
    if (roomCodeDisplay) {
        roomCodeDisplay.textContent = `Room Code: ${roomCode}`;
        roomCodeDisplay.style.display = 'block';
    }
}

// Show modal dialog with buttons
function showModal(title, message, buttons) {
    const modalElement = document.getElementById('gameModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalButtons = document.getElementById('modalButtons');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    // Clear existing buttons
    modalButtons.innerHTML = '';
    
    // Add new buttons
    buttons.forEach(button => {
        const btnElement = document.createElement('button');
        btnElement.textContent = button.text;
        btnElement.className = 'modal-button';
        btnElement.onclick = () => {
            button.onClick();
            modalElement.style.display = 'none';
        };
        modalButtons.appendChild(btnElement);
    });

    modalElement.style.display = 'block';
}

export { 
    updateGameStatus,
    showScreen,
    showError,
    showMessage,
    updateRoomCode,
    exitToMenu,
    showModal,
    showCheckmate,
    updateTurnIndicators, 
    addClickHandler,
    closeModal 
};

import { showError, showMessage, updateRoomCode, showScreen, updateGameStatus, showModal, exitToMenu } from './ui.js';
import { onDragStart, onDrop, onSnapEnd } from './event-handlers.js';
import { playSound } from './sound.js';

// Socket.IO Implementation
let socket = null;

function initializeSocket() {
    if (window.io) {
        socket = window.io();
        window.socket = socket;  // Store socket in window object
        initializeSocketEvents();
    } else {
        console.error('Socket.IO not loaded');
        showError('Network connection failed');
    }
}

function initializeSocketEvents() {
    if (!socket) {
        console.error('Socket not initialized');
        return;
    }

    // Room creation events
    socket.on('room_created', (data) => {
        console.log('Room created:', data);
        updateRoomCode(data.room_code);
        showMessage('Room created! Share the code with your opponent.');
        window.currentGameMode = 'online';
        document.getElementById('game-mode-display').textContent = 'Multiplayer';
        window.playerColor = 'white';  // Set creator as white
        // Show the room code in room-selection-screen
        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = `Room Code: ${data.room_code}`;
        }
        showScreen('room-selection-screen'); // Show room selection screen instead of game screen
    });

    // Room joining events
    socket.on('room_joined', (data) => {
        console.log('Room joined:', data);
        showMessage(`Joined room ${data.room_code} as black`);
        window.currentGameMode = 'online';
        document.getElementById('game-mode-display').textContent = 'Multiplayer';
        window.playerColor = 'black';
        showScreen('game-screen');
        startOnlineGame('black');
    });

    // Opponent joined event
    socket.on('opponent_joined', (data) => {
        console.log('Opponent joined:', data);
        showMessage('Opponent joined the game');
        showScreen('game-screen');
        if (window.playerColor === 'white') {
            startOnlineGame('white');
        }
    });

    // Game move events
    socket.on('chess_move', (moveData) => {
        console.log('Received move from server:', moveData);
        
        // Don't process our own moves
        if (moveData.color === window.playerColor) {
            console.log('Skipping own move');
            return;
        }
        
        if (!window.game || !window.board) {
            console.error('Game not initialized');
            return;
        }

        try {
            const currentFen = window.game.fen();
            console.log('Current position:', currentFen);
            console.log('Applying move:', moveData);

            // Make the move
            const move = window.game.move({
                from: moveData.from,
                to: moveData.to,
                promotion: moveData.promotion || 'q'
            });

            if (move === null) {
                console.error('Invalid move received:', moveData);
                return;
            }

            // Update the board
            window.board.position(window.game.fen());
            
            // Play sound
            playSound(move.captured ? 'capture' : 'move');
            
            // Update game status
            updateGameStatus();

            // Reset timer for next turn
            if (window.startGameTimer) {
                window.startGameTimer();
            }
        } catch (error) {
            console.error('Error applying move:', error);
        }
    });

    // Handle draw offer received
    socket.on('draw_offered', () => {
        showModal('Draw Offer', 'Your opponent has offered a draw. Do you accept?', [
            {
                text: 'Accept',
                onClick: () => {
                    socket.emit('draw_response', { accepted: true });
                    showMessage('Game ended in a draw by agreement');
                    exitToMenu();
                }
            },
            {
                text: 'Decline',
                onClick: () => {
                    socket.emit('draw_response', { accepted: false });
                    showMessage('Draw offer declined');
                }
            }
        ]);
    });

    // Handle draw response
    socket.on('draw_response', (data) => {
        if (data.accepted) {
            showMessage('Draw offer accepted. Game ended in a draw.');
            exitToMenu();
        } else {
            showMessage('Draw offer declined.');
        }
    });

    // Handle opponent resignation
    socket.on('opponent_resigned', () => {
        showMessage('Your opponent has resigned. You win!');
        
        // Show checkmate screen with win message
        const checkmateScreen = document.getElementById('checkmate-screen');
        const winnerText = document.getElementById('checkmate-winner-text');
        const rematchButton = document.getElementById('checkmate-rematch-btn');
        
        if (checkmateScreen && winnerText) {
            winnerText.textContent = 'Your opponent resigned. You win!';
            if (rematchButton) {
                rematchButton.style.display = 'none';
            }
            showScreen('checkmate-screen');
        }
    });

    // Error handling
    socket.on('error', (data) => {
        console.error('Server error:', data);
        if (data.message) {
            showError(data.message);
        }
    });

    // Disconnection handling
    socket.on('disconnect', () => {
        showError('Disconnected from server');
    });
}

function startOnlineGame(color) {
    console.log('Starting online game as:', color);
    
    if (!window.socket) {
        console.error('Socket not initialized');
        return;
    }

    window.currentGameMode = 'online';
    window.playerColor = color;
    
    // Initialize the game
    window.game = new Chess();
    
    // Show game screen
    showScreen('game-screen');
    
    const config = {
        draggable: true,
        position: 'start',
        orientation: color,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: '/static/img/chesspieces/wikipedia/{piece}.png'
    };
    
    window.board = Chessboard('board', config);
    
    // Apply dark theme
    document.querySelector('.board-b72b1').classList.add('dark-board');
    
    console.log('Game initialized:', {
        mode: 'online',
        color: color,
        fen: window.game.fen()
    });
    
    // Start the timer
    if (window.startGameTimer) {
        window.startGameTimer();
    }
}

function createRoom() {
    if (socket) {
        // Send player data when creating room
        socket.emit('create_room', {
            player_name: 'Player 1'  // You can make this dynamic if needed
        });
        showMessage('Creating room...');
    } else {
        showError('Not connected to server');
    }
}

function joinRoom(roomCode) {
    if (!socket) {
        showError('Not connected to server');
        return;
    }

    if (!roomCode || roomCode.length !== 4) {
        showError('Invalid room code. Please enter a 4-digit code.');
        return;
    }

    socket.emit('join_room', {
        room_id: roomCode,
        player_name: 'Player 2'  // You can make this dynamic if needed
    });
    showMessage('Joining room...');
}

// Function to offer draw
function offerDraw() {
    socket.emit('offer_draw');
    showMessage('Draw offer sent to opponent');
}

// Function to resign
function resignGame() {
    socket.emit('resign_game');
    showMessage('You resigned. Game over.');
    exitToMenu();
}

export { 
    initializeSocket, 
    startOnlineGame, 
    offerDraw, 
    resignGame, 
    createRoom, 
    joinRoom 
};

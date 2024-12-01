import { makeAIMove, fallbackAIMove } from './ai.js';
import { startGameTimer } from './timer.js';
import { showScreen, showError, closeModal, exitToMenu, updateGameStatus, showMessage } from './ui.js';
import { createRoom, joinRoom } from './socket.js';
import { playSound } from './sound.js';

// Game mode and state management
let currentGameMode = null;
let playerColor = null;
let aiDifficulty = 'medium';

// Highlight-related functions
function highlightLegalMoves(square) {
    // Clear previous highlights
    clearHighlights();

    // Get legal moves for the selected piece
    const moves = window.game.moves({
        square: square,
        verbose: true
    });

    // Highlight each legal move
    moves.forEach(move => {
        const element = document.querySelector(`.square-${move.to}`);
        if (element) {
            if (move.captured) {
                element.classList.add('highlight-capture-move');
            } else {
                element.classList.add('highlight-legal-move');
            }
        }
    });
}

function clearHighlights() {
    const squares = document.querySelectorAll('.square-55d63');
    squares.forEach(square => {
        square.classList.remove('highlight-legal-move');
        square.classList.remove('highlight-capture-move');
    });
}

function onDragEnd() {
    // Remove highlights when drag ends
    clearHighlights();
}

// Chess piece movement handlers
let draggedPiece = null;
let touchStartX = 0;
let touchStartY = 0;

function onDragStart(source, piece, position, orientation) {
    // Don't allow moves if it's not our turn in online mode
    if (window.currentGameMode === 'online') {
        if ((window.game.turn() === 'w' && window.playerColor !== 'white') ||
            (window.game.turn() === 'b' && window.playerColor !== 'black')) {
            return false;
        }
    }

    // Don't allow moves if game is over
    if (window.game.game_over()) return false;

    // Only allow moving pieces for the current turn
    if ((window.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (window.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }

    // Store the dragged piece and add dragging class
    draggedPiece = document.querySelector('.square-' + source + ' .piece-417db');
    if (draggedPiece) {
        draggedPiece.classList.add('dragging');
        
        // Handle both mouse and touch events
        const e = window.event;
        if (e) {
            if (e.type === 'touchstart') {
                touchStartX = e.touches[0].pageX;
                touchStartY = e.touches[0].pageY;
                draggedPiece.style.left = touchStartX + 'px';
                draggedPiece.style.top = touchStartY + 'px';
                // Add touch event listeners
                document.addEventListener('touchmove', onTouchMove, { passive: false });
                document.addEventListener('touchend', onTouchEnd);
            } else {
                draggedPiece.style.left = e.pageX + 'px';
                draggedPiece.style.top = e.pageY + 'px';
                // Add mouse event listener
                document.addEventListener('mousemove', onMouseMove);
            }
        }
    }

    // Highlight legal moves
    highlightLegalMoves(source);
    return true;
}

function onMouseMove(e) {
    if (draggedPiece && draggedPiece.classList && draggedPiece.classList.contains('dragging')) {
        requestAnimationFrame(() => {
            if (draggedPiece && draggedPiece.style) {
                draggedPiece.style.left = e.pageX + 'px';
                draggedPiece.style.top = e.pageY + 'px';
            }
        });
    }
}

function onTouchMove(e) {
    if (draggedPiece && draggedPiece.classList && draggedPiece.classList.contains('dragging')) {
        e.preventDefault(); // Prevent scrolling while dragging
        requestAnimationFrame(() => {
            if (draggedPiece && draggedPiece.style) {
                draggedPiece.style.left = e.touches[0].pageX + 'px';
                draggedPiece.style.top = e.touches[0].pageY + 'px';
            }
        });
    }
}

function onTouchEnd(e) {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
        draggedPiece.style.left = '';
        draggedPiece.style.top = '';
        draggedPiece = null;
    }
}

function onDrop(source, target) {
    // Remove event listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);

    // Reset dragged piece
    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
        draggedPiece.style.left = '';
        draggedPiece.style.top = '';
        draggedPiece = null;
    }

    try {
        // Reset dragged piece
        if (draggedPiece) {
            draggedPiece.classList.remove('dragging');
            draggedPiece.style.left = '';
            draggedPiece.style.top = '';
            draggedPiece = null;
        }

        // Clear highlights
        clearHighlights();

        // Make the move
        const move = window.game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        // In online mode, emit move to server
        if (window.currentGameMode === 'online' && window.socket) {
            window.socket.emit('make_move', {
                move: {
                    from: source,
                    to: target,
                    promotion: 'q'
                }
            });
        }

        // Update game state
        updateGameStatus();
        
        // Reset timer for next turn
        startGameTimer();
        
        // Play move sound
        playSound(move.captured ? 'capture' : 'move');

        // Make AI move if it's AI's turn
        if (window.currentGameMode === 'ai' && !window.game.game_over()) {
            // Small delay before AI moves
            setTimeout(() => {
                const aiMove = makeAIMove(window.game);
                if (aiMove) {
                    // Update the board with AI's move
                    window.board.position(window.game.fen());
                    // Play move sound for AI
                    playSound(aiMove.captured ? 'capture' : 'move');
                    // Update game status after AI move
                    updateGameStatus();
                }
            }, 250);
        }

    } catch (error) {
        console.error('Error making move:', error);
        return 'snapback';
    }
}

function onSnapEnd() {
    window.board.position(window.game.fen());
}

// Game start functions
function startLocalGame() {
    console.log('Starting local game');
    
    window.currentGameMode = 'local';
    window.playerColor = null; // Allow both players to move in local game
    
    // Reset game and board
    window.game.reset();
    window.board.orientation('white');
    window.board.start();
    
    // Ensure board is fully initialized
    const boardElement = document.getElementById('board');
    if (boardElement) {
        boardElement.style.display = 'block';
        console.log('Board element found and displayed');
    } else {
        console.error('Board element not found');
    }
    
    // Start game timer
    startGameTimer();
    
    // Update game mode display
    const gameModeDisplay = document.getElementById('game-mode-display');
    if (gameModeDisplay) {
        gameModeDisplay.textContent = 'Local Game';
    }
    
    // Show game screen
    showScreen('game-screen');
    
    // Force board reinitialization
    setTimeout(() => {
        if (window.board) {
            window.board.resize();
            console.log('Board resized');
        }
    }, 100);
}

function startAIGame(difficulty) {
    // Prevent multiple game initializations
    if (window.gameInProgress) {
        console.log('Game already in progress');
        return;
    }
    window.gameInProgress = true;
    window.currentGameMode = 'ai';  // Set game mode to AI

    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });

    // Show game screen
    const gameScreen = document.querySelector('#game-screen');
    if (gameScreen) {
        gameScreen.classList.add('active');
        gameScreen.style.display = 'flex';
    }

    // Reset game state
    resetGameState();

    // Set AI difficulty
    window.aiDifficulty = difficulty;

    // Player is always white, AI is always black
    const playerColor = 'white';
    const aiColor = 'black';

    // Initialize chess game
    window.game = new Chess();

    // Initialize game with dark theme
    const boardConfig = {
        position: window.game.fen(),
        orientation: playerColor,
        draggable: true,
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: '/static/img/chesspieces/wikipedia/{piece}.png'
    };

    // Initialize board with dark theme
    if (window.board) {
        window.board.destroy();
    }
    window.board = Chessboard('board', boardConfig);
    
    // Add dark theme class to board
    const boardElement = document.querySelector('.board-b72b1');
    if (boardElement) {
        boardElement.classList.add('dark-board');
    }

    // Force board resize after screen transition
    setTimeout(() => {
        if (window.board) {
            window.board.resize();
            console.log('Board resized');
        }
    }, 100);

    // If AI is white (which it isn't in this case), make first move
    if (aiColor === 'white') {
        setTimeout(() => {
            makeAIMove();
        }, 500);
    }

    // Update UI to show player color
    const playerColorDisplay = document.querySelector('.player-color');
    if (playerColorDisplay) {
        playerColorDisplay.textContent = `You are playing as White`;
    }

    // Update game mode display
    const gameModeDisplay = document.getElementById('game-mode-display');
    if (gameModeDisplay) {
        gameModeDisplay.textContent = `AI: ${difficulty}`;
    }

    // Start game timer
    startGameTimer();

    console.log(`Starting AI game - Player: ${playerColor}, AI: ${aiColor}, Difficulty: ${difficulty}`);
}

function initializeLocalGame(playerColor) {
    // Reset the board
    window.board.start();
    
    // Reset the game state
    window.game.reset();
    
    // Set global game mode and player color
    window.currentGameMode = 'ai';
    window.playerColor = playerColor;
    
    // Ensure the board is oriented correctly for the player
    window.board.orientation(playerColor);
    
    // Update player color display
    const playerColorDisplay = document.querySelector('.player-color');
    if (playerColorDisplay) {
        playerColorDisplay.textContent = `You are playing as ${playerColor === 'white' ? 'White' : 'Black'}`;
    }
    
    console.log(`Initialized local game - Player color: ${playerColor}`);
}

// Game control functions
function resignGame() {
    const game = window.game;
    
    if (game) {
        // Determine winner based on current turn
        const loser = game.turn() === 'w' ? 'White' : 'Black';
        const winner = loser === 'White' ? 'Black' : 'White';
        
        showError(`${winner} wins by resignation!`);
        
        // Additional logic for game end
        exitToMenu();
    }
}

function offerDraw() {
    const game = window.game;
    
    // Check if the game is in a drawable state
    if (game.in_draw() || game.insufficient_material()) {
        // Automatic draw if game is already in a draw state
        import('./ui.js').then(ui => {
            ui.showMessage('Game is a draw by insufficient material');
            ui.exitToMenu();
        });
        return;
    }
    
    // Create draw offer modal
    const drawOfferModal = document.createElement('div');
    drawOfferModal.id = 'draw-offer-modal';
    drawOfferModal.classList.add('modal');
    drawOfferModal.innerHTML = `
        <div class="menu-content modal-content">
            <h1>Draw Offer</h1>
            <p>Do you want to accept the draw?</p>
            <div class="menu-buttons">
                <button id="accept-draw-btn" class="menu-button">Accept</button>
                <button id="reject-draw-btn" class="menu-button">Reject</button>
            </div>
        </div>
    `;
    
    // Add modal to game container
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.appendChild(drawOfferModal);
    }
    
    // Add event listeners
    const acceptDrawBtn = drawOfferModal.querySelector('#accept-draw-btn');
    const rejectDrawBtn = drawOfferModal.querySelector('#reject-draw-btn');
    
    if (acceptDrawBtn) {
        acceptDrawBtn.addEventListener('click', () => {
            import('./ui.js').then(ui => {
                ui.showMessage('Game ended in a draw');
                drawOfferModal.remove();
                ui.exitToMenu();
            });
        });
    }
    
    if (rejectDrawBtn) {
        rejectDrawBtn.addEventListener('click', () => {
            import('./ui.js').then(ui => {
                ui.showMessage('Draw offer rejected');
                drawOfferModal.remove();
            });
        });
    }
    
    // Show the modal
    drawOfferModal.style.display = 'flex';
}

// Flip board function
function flipBoard() {
    if (window.board) {
        window.board.flip();
        console.log('Board flipped');
    }
}

// Reset game state
function resetGameState() {
    // Reset chessboard
    if (window.board) {
        window.board.position('start');
    }

    // Reset game logic using global Chess constructor
    window.game = new Chess();

    // Reset any other game-related states
    window.playerColor = null;
    window.aiDifficulty = null;
    window.gameInProgress = false;
}

// Event listener initialization
function initializeEventListeners() {
    // Menu buttons
    const playAIButton = document.getElementById('play-ai');
    const playLocalButton = document.getElementById('play-local');
    const playOnlineButton = document.getElementById('play-online');
    
    // Online play buttons
    const createRoomButton = document.getElementById('create-room-btn');
    const joinRoomButton = document.getElementById('join-room-btn');
    const submitJoinButton = document.getElementById('submit-join');
    const backToMenuButton = document.getElementById('back-to-menu');
    const roomIdInput = document.getElementById('room-id');

    // Game control buttons
    const resignButton = document.getElementById('resign-button');
    const drawButton = document.getElementById('draw-button');
    const flipBoardButton = document.getElementById('flip-board');

    // AI difficulty buttons
    const easyButton = document.getElementById('ai-difficulty-easy');
    const mediumButton = document.getElementById('ai-difficulty-medium');
    const hardButton = document.getElementById('ai-difficulty-hard');

    // Menu button event listeners
    if (playAIButton) playAIButton.addEventListener('click', () => showScreen('ai-level-screen'));
    if (playLocalButton) playLocalButton.addEventListener('click', startLocalGame);
    if (playOnlineButton) playOnlineButton.addEventListener('click', () => showScreen('room-selection-screen'));

    // Online play event listeners
    if (createRoomButton) {
        createRoomButton.addEventListener('click', () => {
            createRoom();
            // Hide join room form if visible
            const joinForm = document.getElementById('join-room-form');
            if (joinForm) joinForm.style.display = 'none';
        });
    }

    if (joinRoomButton) {
        joinRoomButton.addEventListener('click', () => {
            // Show join room form
            const joinForm = document.getElementById('join-room-form');
            if (joinForm) {
                joinForm.style.display = 'block';
                // Clear and focus the input field
                if (roomIdInput) {
                    roomIdInput.value = '';
                    roomIdInput.focus();
                }
            }
        });
    }

    if (submitJoinButton && roomIdInput) {
        submitJoinButton.addEventListener('click', () => {
            const roomCode = roomIdInput.value.trim();
            if (roomCode) {
                joinRoom(roomCode);
            } else {
                showError('Please enter a room code');
            }
        });
    }

    // Game control event listeners
    if (flipBoardButton) flipBoardButton.addEventListener('click', flipBoard);
    if (backToMenuButton) backToMenuButton.addEventListener('click', exitToMenu);

    // Draw and resign event listeners for online mode
    if (drawButton) {
        drawButton.addEventListener('click', () => {
            if (window.currentGameMode === 'online' && window.socket) {
                window.socket.emit('offer_draw');
                showMessage('Draw offered to opponent');
            } else if (window.currentGameMode === 'ai') {
                // AI randomly decides to accept or decline draw
                const aiAcceptsDraw = Math.random() < 0.5;
                
                if (aiAcceptsDraw) {
                    const checkmateScreen = document.getElementById('checkmate-screen');
                    const winnerText = document.getElementById('checkmate-winner-text');
                    const rematchButton = document.getElementById('checkmate-rematch-btn');
                    
                    if (checkmateScreen && winnerText) {
                        winnerText.textContent = 'AI accepted your draw offer. Game Drawn!';
                        if (rematchButton) {
                            rematchButton.style.display = 'none';
                        }
                        showScreen('checkmate-screen');
                    }
                } else {
                    showMessage('AI declined your draw offer');
                }
            } else if (window.currentGameMode === 'local') {
                // Local game draw
                const checkmateScreen = document.getElementById('checkmate-screen');
                const winnerText = document.getElementById('checkmate-winner-text');
                const rematchButton = document.getElementById('checkmate-rematch-btn');
                
                if (checkmateScreen && winnerText) {
                    winnerText.textContent = 'Game Drawn by Agreement';
                    if (rematchButton) {
                        rematchButton.style.display = 'none';
                    }
                    showScreen('checkmate-screen');
                }
            }
        });
    }

    if (resignButton) {
        resignButton.addEventListener('click', () => {
            if (window.currentGameMode === 'online' && window.socket) {
                window.socket.emit('resign_game');
                showMessage('You resigned from the game');
                
                // Show checkmate screen with resignation message
                const checkmateScreen = document.getElementById('checkmate-screen');
                const winnerText = document.getElementById('checkmate-winner-text');
                const rematchButton = document.getElementById('checkmate-rematch-btn');
                
                if (checkmateScreen && winnerText) {
                    winnerText.textContent = 'You resigned. Game Over!';
                    if (rematchButton) {
                        rematchButton.style.display = 'none';
                    }
                    showScreen('checkmate-screen');
                }
            } else if (window.currentGameMode === 'ai') {
                // AI game resignation
                const checkmateScreen = document.getElementById('checkmate-screen');
                const winnerText = document.getElementById('checkmate-winner-text');
                const rematchButton = document.getElementById('checkmate-rematch-btn');
                
                if (checkmateScreen && winnerText) {
                    winnerText.textContent = 'You resigned. AI wins!';
                    if (rematchButton) {
                        rematchButton.style.display = 'none';
                    }
                    showScreen('checkmate-screen');
                }
            } else if (window.currentGameMode === 'local') {
                // Local game resignation
                const currentPlayer = window.game.turn() === 'w' ? 'White' : 'Black';
                const checkmateScreen = document.getElementById('checkmate-screen');
                const winnerText = document.getElementById('checkmate-winner-text');
                const rematchButton = document.getElementById('checkmate-rematch-btn');
                
                if (checkmateScreen && winnerText) {
                    winnerText.textContent = `${currentPlayer} resigned. Game Over!`;
                    if (rematchButton) {
                        rematchButton.style.display = 'none';
                    }
                    showScreen('checkmate-screen');
                }
            }
        });
    }

    // AI difficulty selection
    if (easyButton) easyButton.addEventListener('click', () => selectAILevel('easy'));
    if (mediumButton) mediumButton.addEventListener('click', () => selectAILevel('medium'));
    if (hardButton) hardButton.addEventListener('click', () => selectAILevel('hard'));
}

function selectAILevel(level) {
    // Hide AI level selection screen
    const aiLevelScreen = document.querySelector('#ai-level-screen');
    if (aiLevelScreen) {
        aiLevelScreen.classList.remove('active');
        aiLevelScreen.style.display = 'none';
    }

    // Start game with selected difficulty
    startAIGame(level);
}

export {
    onDragStart,
    onDrop,
    onSnapEnd,
    onDragEnd,
    highlightLegalMoves,
    clearHighlights,
    initializeEventListeners,
    startLocalGame,
    selectAILevel,
    startAIGame,
    resignGame,
    offerDraw,
    flipBoard,
    resetGameState,
    initializeLocalGame
};

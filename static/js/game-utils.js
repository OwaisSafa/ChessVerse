import { pieceValues } from './settings.js';
import { showScreen } from './ui.js';

// Utility functions for game logic
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Evaluate material difference
function evaluateMaterialDifference(game) {
    let whiteMaterial = 0;
    let blackMaterial = 0;

    // Iterate through all squares
    for (let i = 0; i < 64; i++) {
        const square = String.fromCharCode(97 + (i % 8)) + (8 - Math.floor(i / 8));
        const piece = game.get(square);

        if (piece) {
            const value = pieceValues[piece.type.toLowerCase()] || 0;
            if (piece.color === 'w') {
                whiteMaterial += value;
            } else {
                blackMaterial += value;
            }
        }
    }

    return whiteMaterial - blackMaterial;
}

// Evaluate position
function evaluatePosition(game) {
    // Material difference is the primary evaluation metric
    let materialScore = evaluateMaterialDifference(game);

    // Additional positional factors can be added here
    // For example, piece positioning, king safety, etc.

    return materialScore;
}

// Minimax algorithm with alpha-beta pruning
function minimax(game, depth, maximizingPlayer, alpha = -Infinity, beta = Infinity) {
    // Base case: reached maximum depth or game is over
    if (depth === 0 || game.game_over()) {
        return evaluatePosition(game);
    }

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        const moves = game.moves();
        
        for (let move of moves) {
            game.move(move);
            let evaluation = minimax(game, depth - 1, false, alpha, beta);
            game.undo();
            
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            
            if (beta <= alpha) {
                break; // Beta cutoff
            }
        }
        
        return maxEval;
    } else {
        let minEval = Infinity;
        const moves = game.moves();
        
        for (let move of moves) {
            game.move(move);
            let evaluation = minimax(game, depth - 1, true, alpha, beta);
            game.undo();
            
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            
            if (beta <= alpha) {
                break; // Alpha cutoff
            }
        }
        
        return minEval;
    }
}

// Find best move using minimax with varying strategies
function findBestMove(game, difficulty = 'medium') {
    const moves = game.moves();
    
    if (difficulty === 'easy') {
        // Easy: Completely random move
        const randomIndex = Math.floor(Math.random() * moves.length);
        return moves[randomIndex];
    }
    
    const depthMap = {
        'easy': 1,
        'medium': 2,
        'hard': 4  // Increased depth for hard mode
    };
    
    const depth = depthMap[difficulty] || 2;
    
    let bestMove = null;
    let bestValue = difficulty === 'hard' ? -Infinity : 0;
    
    for (let move of moves) {
        game.move(move);
        
        let moveValue;
        if (difficulty === 'medium') {
            // Medium: Simple material evaluation
            moveValue = evaluateMaterialDifference(game);
        } else if (difficulty === 'hard') {
            // Hard: Advanced evaluation considering multiple factors
            const materialScore = evaluateMaterialDifference(game) * 2;  // Emphasize material
            const centerControlScore = evaluateCenterControl(game) * 1.5;
            const mobilityScore = evaluateMobility(game);
            const pawnStructureScore = evaluatePawnStructure(game);
            
            // Weighted combination of different evaluation factors
            moveValue = materialScore + centerControlScore + mobilityScore + pawnStructureScore;
        }
        
        game.undo();
        
        // Different selection criteria based on difficulty
        if (difficulty === 'hard' && moveValue > bestValue) {
            bestValue = moveValue;
            bestMove = move;
        } else if (difficulty === 'medium') {
            // Prefer moves that improve material advantage
            if (moveValue > bestValue) {
                bestValue = moveValue;
                bestMove = move;
            }
        }
    }
    
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

// Evaluate center control
function evaluateCenterControl(game) {
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    let centerControlScore = 0;
    
    for (let square of centerSquares) {
        const piece = game.get(square);
        if (piece) {
            // Bonus for pieces controlling center
            centerControlScore += piece.color === 'b' ? -5 : 5;
        }
    }
    
    return centerControlScore;
}

// Evaluate piece mobility
function evaluateMobility(game) {
    const currentTurn = game.turn();
    const moves = game.moves();
    
    // More moves indicate better mobility
    return currentTurn === 'w' ? moves.length : -moves.length;
}

// Evaluate pawn structure
function evaluatePawnStructure(game) {
    const pawns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    let whiteScore = 0;
    let blackScore = 0;
    
    pawns.forEach(file => {
        let whitePawnCount = 0;
        let blackPawnCount = 0;
        
        for (let rank = 1; rank <= 8; rank++) {
            const square = `${file}${rank}`;
            const piece = game.get(square);
            
            if (piece && piece.type === 'p') {
                if (piece.color === 'w') {
                    whitePawnCount++;
                } else {
                    blackPawnCount++;
                }
            }
        }
        
        // Penalize isolated or doubled pawns
        if (whitePawnCount > 1) whiteScore -= 5 * (whitePawnCount - 1);
        if (blackPawnCount > 1) blackScore -= 5 * (blackPawnCount - 1);
    });
    
    return whiteScore - blackScore;
}

function exitToMenu() {
    // Reset game state
    if (window.game) {
        window.game.reset();
    }
    if (window.board) {
        window.board.clear();
    }
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Show menu screen
    showScreen('menu-screen');
    
    // Reset any game-specific states
    if (window.currentGameMode === 'online' && window.socket) {
        window.socket.disconnect();
    }
    window.currentGameMode = null;
}

export { 
    escapeHtml, 
    evaluateMaterialDifference, 
    evaluatePosition, 
    minimax, 
    findBestMove,
    evaluateCenterControl,
    evaluateMobility,
    evaluatePawnStructure,
    pieceValues,
    exitToMenu
};

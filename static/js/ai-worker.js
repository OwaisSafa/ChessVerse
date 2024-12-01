// AI Move Calculation Web Worker
importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

// Position evaluation weights
const PIECE_VALUES = {
    'p': 100,   // Pawn
    'n': 320,   // Knight
    'b': 330,   // Bishop
    'r': 500,   // Rook
    'q': 900,   // Queen
    'k': 20000  // King
};

// Piece position bonus tables
const POSITION_BONUS = {
    'p': [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [ 5,  5, 10, 25, 25, 10,  5,  5],
        [ 0,  0,  0, 20, 20,  0,  0,  0],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 5, 10, 10,-20,-20, 10, 10,  5],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
    ],
    'n': [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    'b': [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    'r': [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [ 5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [ 0,  0,  0,  5,  5,  0,  0,  0]
    ],
    'q': [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    'k': [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

// Evaluate board position
function evaluatePosition(game) {
    let score = 0;
    
    // Game over conditions
    if (game.in_checkmate()) {
        return game.turn() === 'w' ? -Infinity : Infinity;
    }
    if (game.in_draw() || game.in_stalemate()) {
        return 0;
    }

    // Get board representation
    const board = game.board();

    // Evaluate each piece
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                // Base piece value
                let value = PIECE_VALUES[piece.type];
                
                // Position bonus
                const posBonus = POSITION_BONUS[piece.type][piece.color === 'w' ? i : 7 - i][j];
                value += posBonus;

                // Add/subtract based on color
                score += piece.color === 'w' ? value : -value;
            }
        }
    }

    // Additional positional evaluation
    if (game.in_check()) {
        score += game.turn() === 'w' ? -50 : 50;
    }

    return score;
}

// Minimax with alpha-beta pruning
function minimax(game, depth, alpha, beta, maximizingPlayer, difficulty) {
    // Base case: return evaluation if depth is 0 or game is over
    if (depth === 0 || game.game_over()) {
        return evaluatePosition(game);
    }

    const moves = game.moves();

    // Adjust search based on difficulty
    if (difficulty === 'easy' && Math.random() < 0.5) {
        return evaluatePosition(game);
    }

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of moves) {
            game.move(move);
            const eval = minimax(game, depth - 1, alpha, beta, false, difficulty);
            game.undo();
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of moves) {
            game.move(move);
            const eval = minimax(game, depth - 1, alpha, beta, true, difficulty);
            game.undo();
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Find best move using minimax
function findBestMove(game, difficulty = 'medium') {
    try {
        const moves = game.moves();
        if (moves.length === 0) return null;

        // Depth based on difficulty
        const depthMap = {
            'easy': 1,
            'medium': 2,
            'hard': 3,
            'expert': 4
        };
        const depth = depthMap[difficulty] || 2;

        // For easy difficulty, sometimes make random moves
        if (difficulty === 'easy' && Math.random() < 0.3) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        let bestMove = null;
        let bestValue = -Infinity;
        
        // Evaluate each move
        for (let move of moves) {
            game.move(move);
            const value = minimax(game, depth - 1, -Infinity, Infinity, false, difficulty);
            game.undo();

            // Update best move if better value found
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        return bestMove;
    } catch (error) {
        console.error('Error in findBestMove:', error);
        // Fallback to random move
        return moves[Math.floor(Math.random() * moves.length)];
    }
}

// Worker message handler
self.onmessage = function(event) {
    try {
        const { fen, difficulty } = event.data;
        
        if (!fen) {
            throw new Error('No FEN position provided');
        }

        const game = new Chess(fen);
        const move = findBestMove(game, difficulty);

        if (move) {
            self.postMessage({ 
                move: move,
                success: true 
            });
        } else {
            self.postMessage({ 
                error: 'No valid move found',
                success: false 
            });
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ 
            error: error.toString(),
            success: false 
        });
    }
};

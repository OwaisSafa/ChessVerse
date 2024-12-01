// Global settings and constants
const settings = {
    timeLimit: 5000,  // AI move time limit in milliseconds
    defaultDifficulty: 'medium'
};

// Piece values for move evaluation
const pieceValues = {
    'p': 1,   // Pawn
    'n': 3,   // Knight
    'b': 3,   // Bishop
    'r': 5,   // Rook
    'q': 9,   // Queen
    'k': 0    // King (special case)
};

export { settings, pieceValues };

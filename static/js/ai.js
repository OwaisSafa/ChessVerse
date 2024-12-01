import { findBestMove } from './game-utils.js';
import { playSound } from './sound.js';

// AI Move Generation
function makeAIMove() {
    const game = window.game;
    const difficulty = window.aiDifficulty || 'medium';
    
    try {
        const bestMove = findBestMove(game, difficulty);
        
        if (bestMove) {
            game.move(bestMove);
            
            // Update board
            window.board.position(game.fen());
            
            // Play move sound
            playSound('move');
            
            // Additional post-move logic can be added here
            return bestMove;
        } else {
            console.error('No valid AI move found');
            return fallbackAIMove(difficulty);
        }
    } catch (error) {
        console.error('AI move generation failed:', error);
        return fallbackAIMove(difficulty);
    }
}

// Fallback AI move generation
function fallbackAIMove(difficulty = 'medium') {
    const game = window.game;
    const moves = game.moves();
    
    if (moves.length === 0) {
        console.error('No moves available for AI');
        return null;
    }
    
    // Simple random move selection as a fallback
    const randomIndex = Math.floor(Math.random() * moves.length);
    const randomMove = moves[randomIndex];
    
    game.move(randomMove);
    window.board.position(game.fen());
    
    playSound('move');
    
    return randomMove;
}

export { 
    makeAIMove, 
    fallbackAIMove 
};

// Timer management
let activeTimer = null;
let gameTimers = {
    white: {
        time: 45,
        element: null,
        active: true
    },
    black: {
        time: 45,
        element: null,
        active: false
    }
};

// Forceful timer formatting
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Comprehensive timer update function
function updateTimerDisplay(color) {
    try {
        const timerElement = document.querySelector(`#${color}-timer`);
        
        if (!timerElement) {
            console.error(`❌ TIMER ELEMENT NOT FOUND: ${color}`);
            return;
        }
        
        const timeRemaining = gameTimers[color].time;
        const formattedTime = formatTime(timeRemaining);
        
        // AGGRESSIVE update methods
        timerElement.textContent = formattedTime;
        timerElement.innerHTML = formattedTime;
        
        // Force reflow and repaint
        timerElement.offsetHeight;
        
        // Highlight active player's timer
        const whiteTimer = document.querySelector('#white-timer');
        const blackTimer = document.querySelector('#black-timer');
        
        if (whiteTimer && blackTimer) {
            whiteTimer.classList.toggle('active-timer', color === 'white');
            blackTimer.classList.toggle('active-timer', color === 'black');
        }
    } catch (error) {
        console.error(`❌ TIMER UPDATE ERROR for ${color}:`, error);
    }
}

// Comprehensive game timer start with dynamic player tracking
function startGameTimer() {
    console.error('🚨 INITIALIZING DYNAMIC GAME TIMER 🚨');
    
    // Stop any existing timer
    if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
    }
    
    // Reset timers with AGGRESSIVE initialization
    gameTimers.white = {
        time: 45,
        element: document.querySelector('#white-timer'),
        active: true
    };
    gameTimers.black = {
        time: 45,
        element: document.querySelector('#black-timer'),
        active: false
    };
    
    // Verify timer elements
    const whiteTimerElement = gameTimers.white.element;
    const blackTimerElement = gameTimers.black.element;
    
    if (!whiteTimerElement || !blackTimerElement) {
        console.error('❌ CRITICAL: Timer elements missing');
        return;
    }
    
    // FORCE initial display
    updateTimerDisplay('white');
    updateTimerDisplay('black');
    
    // AGGRESSIVE interval for timer tracking
    activeTimer = setInterval(() => {
        try {
            // FORCE player determination
            let actualCurrentPlayer = gameTimers.white.active ? 'white' : 'black';
            
            // FORCE game turn detection if possible
            if (window.game && typeof window.game.turn === 'function') {
                actualCurrentPlayer = window.game.turn() === 'w' ? 'white' : 'black';
            }
            
            // Decrement current player's timer
            gameTimers[actualCurrentPlayer].time--;
            
            // FORCE update
            updateTimerDisplay(actualCurrentPlayer);
            
            // Check for timeout
            if (gameTimers[actualCurrentPlayer].time <= 0) {
                console.error(`⏰ ${actualCurrentPlayer.toUpperCase()} PLAYER TIMEOUT`);
                handleTimeOut(actualCurrentPlayer);
                clearInterval(activeTimer);
                activeTimer = null;
                return;
            }
            
            // FORCE switch active player
            gameTimers.white.active = !gameTimers.white.active;
            gameTimers.black.active = !gameTimers.black.active;
        } catch (error) {
            console.error('❌ TIMER MECHANISM CATASTROPHIC FAILURE:', error);
            if (activeTimer) {
                clearInterval(activeTimer);
                activeTimer = null;
            }
        }
    }, 1000);  // ENSURE 1-second interval
}

// Handle timeout for a specific color
function handleTimeOut(color) {
    // Determine the winner based on the timed-out player
    const winner = color === 'white' ? 'Black' : 'White';
    
    // Import UI functions to show the timeout message
    import('./ui.js').then(ui => {
        // Ensure all existing screens are hidden
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });

        // Create a winner screen
        const existingTimeoutScreen = document.getElementById('timeout-winner-screen');
        if (existingTimeoutScreen) {
            existingTimeoutScreen.remove();
        }

        // Create new timeout winner screen
        const timeoutScreen = document.createElement('div');
        timeoutScreen.id = 'timeout-winner-screen';
        timeoutScreen.classList.add('screen', 'active');
        timeoutScreen.innerHTML = `
            <div class="menu-content">
                <h1>Game Over</h1>
                <h2>${winner} Wins by Timeout!</h2>
                <button id="timeout-return-btn" class="menu-button">Return to Menu</button>
            </div>
        `;

        // Add to game container
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.appendChild(timeoutScreen);
        }

        // Add event listener to return button
        const returnBtn = timeoutScreen.querySelector('#timeout-return-btn');
        if (returnBtn) {
            returnBtn.addEventListener('click', () => {
                // Remove the timeout screen and exit to menu
                timeoutScreen.remove();
                ui.exitToMenu();
            });
        }

        // Show the timeout winner screen
        timeoutScreen.style.display = 'flex';
        timeoutScreen.classList.add('active');
    });

    // Stop the game
    if (window.game) {
        window.game.game_over = true;
    }

    // Clear the active timer
    if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
    }

    // Optional: Play a timeout sound
    import('./sound.js').then(soundModule => {
        soundModule.playSound('timeout');
    });

    console.error(`⏰ TIMEOUT: ${winner} wins by timeout`);
}

export { 
    startGameTimer, 
    updateTimerDisplay, 
    formatTime, 
    handleTimeOut,
    gameTimers 
};

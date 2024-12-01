// Sound Effects Management
const sounds = {
    move: new Audio(),
    capture: new Audio(),
    check: new Audio(),
    checkmate: new Audio(),
    draw: new Audio()
};

// Initialize and preload sounds
function initSounds() {
    const soundFiles = {
        move: '/static/sounds/move.mp3',
        capture: '/static/sounds/capture.mp3',
        check: '/static/sounds/check.mp3',
        checkmate: '/static/sounds/checkmate.mp3',
        draw: '/static/sounds/draw.mp3'
    };

    Object.entries(soundFiles).forEach(([name, path]) => {
        sounds[name].src = path;
        sounds[name].preload = 'auto';
        
        // Add error handling
        sounds[name].onerror = (e) => {
            console.error(`Failed to load sound: ${name}`, e);
        };
        
        // Add load handler
        sounds[name].oncanplaythrough = () => {
            console.log(`Sound loaded successfully: ${name}`);
        };
    });
}

// Modify playSound to handle missing sound files
function playSound(soundName) {
    try {
        const sound = sounds[soundName];
        
        if (!sound) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }
        
        // Check if sound is loaded
        if (sound.readyState < 2) {
            console.warn(`Sound not loaded yet: ${soundName}`);
            return;
        }
        
        // Reset sound to beginning and play
        sound.currentTime = 0;
        sound.play().catch(error => {
            console.error(`Error playing sound ${soundName}:`, error);
        });
    } catch (error) {
        console.error(`Unexpected error in playSound: ${error}`);
    }
}

// Toggle sound on/off
function toggleSound() {
    Object.values(sounds).forEach(sound => {
        sound.muted = !sound.muted;
    });
}

// Initialize sounds when the file loads
initSounds();

export { 
    sounds, 
    playSound, 
    toggleSound 
};

/**
 * ============================================================================
 * AUDIO VISUALIZER FOR YOUTUBE - JavaScript Module
 * ============================================================================
 */

/**
 * ============================================================================
 * AUDIO VISUALIZER CLASS
 * ============================================================================
 * Main class that handles all audio visualization functionality including
 * audio processing, canvas rendering, user controls, and visual effects.
 * ============================================================================
 */
class AudioVisualizer {
    /**
     * Constructor - Initializes the AudioVisualizer instance
     * Sets up canvas, audio context, default settings, and event listeners
     */
    constructor() {
        // ===== CANVAS AND RENDERING SETUP =====
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // ===== AUDIO ELEMENTS AND WEB AUDIO API COMPONENTS =====
        this.audio = document.getElementById('audio');
        this.audioContext = null;        // Web Audio API context
        this.analyser = null;            // Audio analyser node
        this.dataArray = null;           // Frequency data array
        this.source = null;              // Audio source node
        this.animationId = null;         // Animation frame ID
        this.currentFileName = '';       // Current audio file name
        
        // ===== BACKGROUND IMAGE HANDLING =====
        this.backgroundImage = null;     // Background image object
        
        // ===== PARTICLE SYSTEM FOR PARTICLE VISUALIZATION MODE =====
        this.particles = [];             // Array of particle objects
        
        // ===== VISUALIZATION SETTINGS WITH DEFAULT VALUES =====
        this.visualMode = 'bars_mirror';  // Default to mirror bars (recommended)
        this.colorMode = 'rainbow';       // Default color scheme
        this.customColors = ['#ff6b6b', '#4ecdc4', '#45b7d1']; // Custom color palette
        this.visualizerScale = 1;         // Overall scale multiplier
        this.sensitivity = 1;             // Audio sensitivity multiplier
        this.bgOpacity = 0.7;            // Background image opacity
        this.bgScale = 1;                // Background image scale
        this.barThickness = 1;           // Bar thickness multiplier
        this.barCount = 256;             // Number of frequency bars
        this.aspectRatio = 'fullscreen'; // Display aspect ratio
        
        // ===== CANVAS DIMENSIONS =====
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;
        
        // ===== INITIALIZE COMPONENTS =====
        this.setupCanvas();           // Configure canvas and resize handling
        this.setupEventListeners();   // Bind UI event handlers
        this.setupParticles();        // Initialize particle system
    }
    
    setupCanvas() {
        this.updateCanvasSize();
        
        window.addEventListener('resize', () => {
            if (this.aspectRatio === 'fullscreen') {
                this.updateCanvasSize();
            }
        });
    }
    
    updateCanvasSize() {
        switch (this.aspectRatio) {
            case 'fullscreen':
                this.canvasWidth = window.innerWidth;
                this.canvasHeight = window.innerHeight;
                break;
            case '16:9':
                const width16_9 = Math.min(window.innerWidth, window.innerHeight * (16/9));
                this.canvasWidth = width16_9;
                this.canvasHeight = width16_9 * (9/16);
                break;
            // ...existing cases...
        }
        
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '50%';
        this.canvas.style.top = '50%';
        this.canvas.style.transform = 'translate(-50%, -50%)';
        this.canvas.style.border = this.aspectRatio !== 'fullscreen' ? '2px solid rgba(255,255,255,0.3)' : 'none';
        
        document.getElementById('currentResolution').textContent = `${Math.round(this.canvasWidth)} × ${Math.round(this.canvasHeight)}`;
    }
    
    setupEventListeners() {
        // ...existing event listener setup code...
        const fileInput = document.getElementById('audioFile');
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.currentFileName = file.name;
                this.loadAudio(file);
            }
        });
        
        playBtn.addEventListener('click', () => this.play());
        pauseBtn.addEventListener('click', () => this.pause());
        
        // ...rest of existing event listeners...
    }
    
    loadAudio(file) {
        console.log('Loading file:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        const url = URL.createObjectURL(file);
        this.audio.src = url;
        
        // Remove any existing event listeners to prevent duplicates
        this.audio.removeEventListener('loadedmetadata', this.onAudioLoaded);
        this.audio.removeEventListener('error', this.onAudioError);
        
        this.onAudioLoaded = () => {
            console.log('Audio metadata loaded successfully');
            document.getElementById('playBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = false;
            
            document.querySelector('.info').innerHTML = `
                <div style="color: #00ff88;">✓ Audio loaded: ${this.currentFileName}</div>
                <div>Duration: ${Math.floor(this.audio.duration / 60)}:${Math.floor(this.audio.duration % 60).toString().padStart(2, '0')}</div>
                <div>Click Play to start visualization</div>
            `;
        };
        
        this.onAudioError = (e) => {
            console.error('Audio loading error:', e);
            this.startDemoVisualization();
            document.querySelector('.info').innerHTML = `
                <div style="color: #ff6b6b;">⚠ Audio format issue - showing demo</div>
                <div>Try converting to standard MP3 format</div>
                <div>Demo visualization running</div>
            `;
        };
        
        this.audio.addEventListener('loadedmetadata', this.onAudioLoaded);
        this.audio.addEventListener('error', this.onAudioError);
    }
    
    async play() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 512;
                this.analyser.smoothingTimeConstant = 0.8;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                this.source = this.audioContext.createMediaElementSource(this.audio);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            await this.audio.play();
            this.startVisualization();
            
        } catch (error) {
            console.error('Error playing audio:', error);
            this.startDemoVisualization();
        }
    }
    
    pause() {
        this.audio.pause();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    startVisualization() {
        const animate = () => {
            if (this.audio.paused) return;
            this.animationId = requestAnimationFrame(animate);
            
            if (this.analyser && this.dataArray) {
                this.analyser.getByteFrequencyData(this.dataArray);
                this.draw();
            }
        };
        animate();
    }
    
    startDemoVisualization() {
        this.dataArray = new Uint8Array(256);
        
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            const time = Date.now() * 0.001;
            for (let i = 0; i < this.dataArray.length; i++) {
                this.dataArray[i] = Math.abs(
                    Math.sin(time + i * 0.1) * 128 + 
                    Math.sin(time * 2 + i * 0.05) * 64
                );
            }
            
            this.draw();
        };
        animate();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Apply scaling
        this.ctx.save();
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.visualizerScale, this.visualizerScale);
        this.ctx.translate(-centerX, -centerY);
        
        // Draw visualization
        if (!this.dataArray || this.dataArray.every(val => val === 0)) {
            this.drawDefaultAnimation();
        } else {
            this.drawBarsMirror(); // Simple default visualization
        }
        
        this.ctx.restore();
    }
    
    drawDefaultAnimation() {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const time = Date.now() * 0.005;
        const radius = 50 + Math.sin(time) * 20;
        
        this.ctx.strokeStyle = '#ff6b6b';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading audio data...', centerX, centerY + 100);
    }
    
    drawBarsMirror() {
        if (!this.dataArray) return;
        
        const barWidth = (this.canvasWidth / this.dataArray.length) * this.barThickness;
        const barSpacing = this.canvasWidth / this.dataArray.length;
        let x = (barSpacing - barWidth) / 2;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvasHeight * 0.4 * this.sensitivity;
            const centerY = this.canvasHeight / 2;
            
            const hue = (i / this.dataArray.length) * 360;
            this.ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            
            this.ctx.fillRect(x, centerY, barWidth, barHeight);
            this.ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
            
            x += barSpacing;
        }
    }
    
    setupParticles() {
        // Basic particle setup
        this.particles = [];
    }
}

/**
 * ============================================================================
 * COLOR PRESET FUNCTION
 * ============================================================================
 * Sets predefined color schemes for quick styling
 * @param {string} preset - Preset name ('neon', 'ocean', 'sunset', 'cyberpunk')
 */
function setColorPreset(preset) {
    // Get color input elements
    const color1 = document.getElementById('color1');
    const color2 = document.getElementById('color2');
    const color3 = document.getElementById('color3');
    const colorMode = document.getElementById('colorMode');
    
    // Apply preset color schemes
    switch (preset) {
        case 'neon':
            color1.value = '#ff0080';  // Hot pink
            color2.value = '#00ff80';  // Bright green
            color3.value = '#8000ff';  // Purple
            colorMode.value = 'custom';
            break;
        case 'ocean':
            color1.value = '#006994';  // Deep blue
            color2.value = '#00a8cc';  // Light blue
            color3.value = '#b3e5fc';  // Very light blue
            colorMode.value = 'gradient';
            break;
        case 'sunset':
            color1.value = '#ff4081';  // Pink
            color2.value = '#ff8a50';  // Orange
            color3.value = '#ffcc02';  // Yellow
            colorMode.value = 'gradient';
            break;
        case 'cyberpunk':
            color1.value = '#ff006e';  // Magenta
            color2.value = '#00ffff';  // Cyan
            color3.value = '#ffbe0b';  // Yellow
            colorMode.value = 'custom';
            break;
    }
    
    // Update visualizer with new colors
    visualizer.customColors = [color1.value, color2.value, color3.value];
    visualizer.colorMode = colorMode.value;
    // Show/hide custom color controls
    document.getElementById('customColors').style.display = 
        colorMode.value === 'custom' || colorMode.value === 'gradient' ? 'block' : 'none';
}

// ===== INITIALIZE APPLICATION =====
// Create the main visualizer instance when page loads
let visualizer;

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new AudioVisualizer();
});

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
        this.visualMode = 'particles';  // Default to particles (recommended)
        this.colorMode = 'rainbow';       // Default color scheme
        this.customColors = ['#ff6b6b', '#4ecdc4', '#45b7d1']; // Custom color palette
        this.visualizerScale = 1;         // Overall scale multiplier
        this.sensitivity = 1;             // Audio sensitivity multiplier
        this.bgOpacity = 0.7;            // Background image opacity
        this.bgScale = 1;                // Background image scale
        this.barThickness = 1;           // Bar thickness multiplier
        this.barCount = 256;             // Number of frequency bars
        this.aspectRatio = '1:1'; // Display aspect ratio
        
        // ===== CANVAS DIMENSIONS =====
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;
        
        // ===== INITIALIZE COMPONENTS =====
        this.setupCanvas();           // Configure canvas and resize handling
        this.setupEventListeners();   // Bind UI event handlers
        this.setupParticles();        // Initialize particle system
        
        // Select the default visualization mode in the dropdown
        document.getElementById('visualMode').value = this.visualMode;
        
        // Apply styles to fix dropdowns with white text on white background
        this.applyDropdownStyles();
        
        // Make the control panels draggable
        this.setupDraggableControls();
    }
    
    /**
     * Sets up canvas sizing and window resize handling
     * Configures initial canvas dimensions and responsive behavior
     */
    setupCanvas() {
        this.updateCanvasSize();
        
        window.addEventListener('resize', () => {
            if (this.aspectRatio === 'fullscreen') {
                this.updateCanvasSize();
                this.forceDraw(); // Force redraw when resizing
            }
        });
    }
    
    /**
     * Updates canvas dimensions based on selected aspect ratio
     * Handles multiple aspect ratios including custom dimensions
     * Updates resolution display and canvas styling
     */
    updateCanvasSize() {
        // Calculate dimensions based on aspect ratio selection
        switch (this.aspectRatio) {
            case 'fullscreen':
                this.canvasWidth = window.innerWidth;
                this.canvasHeight = window.innerHeight;
                break;
            case '16:9': // Standard YouTube format
                const width16_9 = Math.min(window.innerWidth, window.innerHeight * (16/9));
                this.canvasWidth = width16_9;
                this.canvasHeight = width16_9 * (9/16);
                break;
            case '21:9': // Ultrawide format
                const width21_9 = Math.min(window.innerWidth, window.innerHeight * (21/9));
                this.canvasWidth = width21_9;
                this.canvasHeight = width21_9 * (9/21);
                break;
            case '4:3': // Classic TV format
                const width4_3 = Math.min(window.innerWidth, window.innerHeight * (4/3));
                this.canvasWidth = width4_3;
                this.canvasHeight = width4_3 * (3/4);
                break;
            case '1:1': // Square format (Instagram)
                const size1_1 = Math.min(window.innerWidth, window.innerHeight);
                this.canvasWidth = size1_1;
                this.canvasHeight = size1_1;
                break;
            case '9:16': // Vertical format (TikTok, Stories)
                const height9_16 = Math.min(window.innerHeight, window.innerWidth * (16/9));
                this.canvasHeight = height9_16;
                this.canvasWidth = height9_16 * (9/16);
                break;
            case 'custom': // User-defined dimensions
                this.canvasWidth = parseInt(document.getElementById('customWidth').value) || 1920;
                this.canvasHeight = parseInt(document.getElementById('customHeight').value) || 1080;
                // Scale down if larger than window
                const scale = Math.min(window.innerWidth / this.canvasWidth, window.innerHeight / this.canvasHeight);
                if (scale < 1) {
                    this.canvasWidth *= scale;
                    this.canvasHeight *= scale;
                }
                break;
        }
        
        // Apply dimensions to canvas element
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Center canvas and apply styling
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '50%';
        this.canvas.style.top = '50%';
        this.canvas.style.transform = 'translate(-50%, -50%)';
        this.canvas.style.border = this.aspectRatio !== 'fullscreen' ? '2px solid rgba(255,255,255,0.3)' : 'none';
        
        // Update resolution display in UI
        document.getElementById('currentResolution').textContent = `${Math.round(this.canvasWidth)} × ${Math.round(this.canvasHeight)}`;
        
        // Reset any particles to fit new dimensions if that mode is active
        if (this.visualMode === 'particles') {
            this.setupParticles();
        }
    }
    
    /**
     * Apply aspect ratio changes and forces a redraw
     * Called when aspect ratio or custom dimensions change
     */
    applyAspectRatioChange() {
        // Update canvas dimensions based on new aspect ratio
        this.updateCanvasSize();
        
        // Force a redraw if not currently animating
        this.forceDraw();
        
        console.log('Aspect ratio changed to:', this.aspectRatio, 
                   'Canvas size:', this.canvasWidth, 'x', this.canvasHeight);
    }
    
    /**
     * Forces a single draw cycle even when not animating
     * Useful when settings change but no animation loop is active
     */
    forceDraw() {
        // If no animation is running, draw a single frame
        requestAnimationFrame(() => {
            // Clear the canvas with the proper dimensions
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Draw a frame
            this.draw();
        });
    }
    
    /**
     * Makes control panels draggable with mouse and touch interactions
     * Allows users to reposition UI elements on screen
     */
    setupDraggableControls() {
        const controlsContainer = document.querySelector('.controls');
        
        // Add a draggable header to the controls container
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<span>⋮⋮ Drag to move controls</span>';
        controlsContainer.prepend(dragHandle);
        
        // Variables for tracking drag state
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        // Apply initial styles to make position absolute
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.top = '20px';
        controlsContainer.style.left = '20px';
        controlsContainer.style.transform = 'none'; // Remove any existing transform
        controlsContainer.style.margin = '0';
        controlsContainer.style.cursor = 'default';
        
        // Add drag handle styles
        this.addDragHandleStyles();
        
        // Mouse event handlers
        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - controlsContainer.getBoundingClientRect().left;
            offsetY = e.clientY - controlsContainer.getBoundingClientRect().top;
            controlsContainer.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position based on mouse coordinates and offset
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            
            // Apply boundary constraints to keep controls on screen
            const maxLeft = window.innerWidth - controlsContainer.offsetWidth;
            const maxTop = window.innerHeight - controlsContainer.offsetHeight;
            
            controlsContainer.style.left = `${Math.max(0, Math.min(left, maxLeft))}px`;
            controlsContainer.style.top = `${Math.max(0, Math.min(top, maxTop))}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            controlsContainer.style.cursor = 'default';
        });
        
        // Touch event handlers for mobile devices
        dragHandle.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            offsetX = touch.clientX - controlsContainer.getBoundingClientRect().left;
            offsetY = touch.clientY - controlsContainer.getBoundingClientRect().top;
            e.preventDefault(); // Prevent scrolling while dragging
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const left = touch.clientX - offsetX;
            const top = touch.clientY - offsetY;
            
            const maxLeft = window.innerWidth - controlsContainer.offsetWidth;
            const maxTop = window.innerHeight - controlsContainer.offsetHeight;
            
            controlsContainer.style.left = `${Math.max(0, Math.min(left, maxLeft))}px`;
            controlsContainer.style.top = `${Math.max(0, Math.min(top, maxTop))}px`;
            
            e.preventDefault(); // Prevent scrolling while dragging
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
        
        console.log('Control panels are now draggable');
    }
    
    /**
     * Adds CSS styles for the drag handle and draggable controls
     */
    addDragHandleStyles() {
        const styleEl = document.createElement('style');
        
        styleEl.textContent = `
            .controls {
                transition: background-color 0.3s ease;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                border-radius: 8px;
                overflow: hidden;
                max-height: 90vh;
                overflow-y: auto;
                max-width: 400px;
                z-index: 1000;
            }
            
            .drag-handle {
                background: rgba(60, 60, 80, 0.9);
                padding: 5px 10px;
                cursor: grab;
                text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                user-select: none;
            }
            
            .drag-handle:active {
                cursor: grabbing;
            }
            
            .drag-handle span {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                display: block;
            }
            
            /* Make scrollbar more visible */
            .controls::-webkit-scrollbar {
                width: 8px;
            }
            
            .controls::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
            }
            
            .controls::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 4px;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    /**
     * Updates the transparency of all UI control panels
     * @param {number} transparency - Transparency value between 0 and 0.75
     */
    updateUITransparency(transparency) {
        // Create or update the CSS variables for UI transparency
        const root = document.documentElement;
        
        // Calculate the background opacity (inverse of transparency)
        const bgOpacity = 1 - transparency;
        
        // Update the CSS variables
        root.style.setProperty('--control-bg-opacity', bgOpacity.toFixed(2));
        
        // Apply the new styles to control panels
        const controls = document.querySelectorAll('.control-group');
        controls.forEach(control => {
            control.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity.toFixed(2)})`;
        });
        
        // Also update the container for better visibility
        const controlsContainer = document.querySelector('.controls');
        if (controlsContainer) {
            controlsContainer.style.backgroundColor = `rgba(0, 0, 0, ${Math.max(bgOpacity - 0.1, 0).toFixed(2)})`;
            
            // Make drag handle adjust opacity as well
            const dragHandle = document.querySelector('.drag-handle');
            if (dragHandle) {
                const handleOpacity = Math.min(bgOpacity + 0.2, 0.9); // Keep handle slightly more visible
                dragHandle.style.backgroundColor = `rgba(60, 60, 80, ${handleOpacity.toFixed(2)})`;
            }
        }
    }
    
    /**
     * Sets up all user interface event listeners
     * Handles file uploads, playback controls, visualization settings,
     * color controls, scaling options, and background management
     */
    setupEventListeners() {
        // ===== GET DOM ELEMENTS FOR EVENT BINDING =====
        const fileInput = document.getElementById('audioFile');
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const visualMode = document.getElementById('visualMode');
        const colorMode = document.getElementById('colorMode');
        const backgroundInput = document.getElementById('backgroundImage');
        const clearBgBtn = document.getElementById('clearBg');
        
        // ===== AUDIO FILE SELECTION HANDLER =====
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.currentFileName = file.name;
                this.loadAudio(file);
            }
        });
        
        // ===== PLAYBACK CONTROL HANDLERS =====
        playBtn.addEventListener('click', () => this.play());
        pauseBtn.addEventListener('click', () => this.pause());
        
        // ===== VISUALIZATION MODE CHANGE HANDLER =====
        visualMode.addEventListener('change', (e) => {
            this.visualMode = e.target.value;
            console.log('Visualization mode changed to:', this.visualMode);
            
            // Reinitialize particles if switching to particle mode
            if (this.visualMode === 'particles') {
                this.setupParticles();
            }
            
            // Force a redraw to show the new visualization immediately
            this.forceDraw();
        });
        
        // ===== COLOR MODE CHANGE HANDLER =====
        colorMode.addEventListener('change', (e) => {
            this.colorMode = e.target.value;
            const customDiv = document.getElementById('customColors');
            // Show/hide custom color controls based on mode
            customDiv.style.display = e.target.value === 'custom' || e.target.value === 'gradient' ? 'block' : 'none';
            
            // Force a redraw to update colors
            this.forceDraw();
        });
        
        // ===== CUSTOM COLOR INPUT HANDLERS =====
        document.getElementById('color1').addEventListener('change', (e) => {
            this.customColors[0] = e.target.value;
            this.forceDraw();
        });
        document.getElementById('color2').addEventListener('change', (e) => {
            this.customColors[1] = e.target.value;
            this.forceDraw();
        });
        document.getElementById('color3').addEventListener('change', (e) => {
            this.customColors[2] = e.target.value;
            this.forceDraw();
        });
        
        // ===== SCALE AND SENSITIVITY CONTROL HANDLERS WITH LIVE VALUE DISPLAY =====
        document.getElementById('visualizerScale').addEventListener('input', (e) => {
            this.visualizerScale = parseFloat(e.target.value);
            document.getElementById('scaleValue').textContent = this.visualizerScale.toFixed(1) + 'x';
            this.forceDraw();
        });
        
        document.getElementById('sensitivity').addEventListener('input', (e) => {
            this.sensitivity = parseFloat(e.target.value);
            document.getElementById('sensitivityValue').textContent = this.sensitivity.toFixed(1) + 'x';
            this.forceDraw();
        });
        
        document.getElementById('barThickness').addEventListener('input', (e) => {
            this.barThickness = parseFloat(e.target.value);
            document.getElementById('thicknessValue').textContent = this.barThickness.toFixed(1) + 'x';
            this.forceDraw();
        });
        
        document.getElementById('barCount').addEventListener('input', (e) => {
            this.barCount = parseInt(e.target.value);
            document.getElementById('barCountValue').textContent = this.barCount;
            this.forceDraw();
        });
        
        // ===== ASPECT RATIO CONTROL HANDLERS =====
        document.getElementById('aspectRatio').addEventListener('change', (e) => {
            this.aspectRatio = e.target.value;
            const customDiv = document.getElementById('customAspect');
            customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
            this.applyAspectRatioChange();
        });
        
        // ===== CUSTOM DIMENSION INPUT HANDLERS =====
        document.getElementById('customWidth').addEventListener('input', () => {
            if (this.aspectRatio === 'custom') {
                this.applyAspectRatioChange();
            }
        });
        
        document.getElementById('customHeight').addEventListener('input', () => {
            if (this.aspectRatio === 'custom') {
                this.applyAspectRatioChange();
            }
        });
        
        // ===== BACKGROUND IMAGE CONTROL HANDLERS =====
        backgroundInput.addEventListener('change', (e) => this.loadBackground(e));
        clearBgBtn.addEventListener('click', () => this.clearBackground());
        
        // ===== BACKGROUND OPACITY AND SCALE CONTROL HANDLERS =====
        document.getElementById('bgOpacity').addEventListener('input', (e) => {
            this.bgOpacity = parseFloat(e.target.value);
            document.getElementById('opacityValue').textContent = this.bgOpacity.toFixed(1);
            this.forceDraw();
        });
        
        document.getElementById('bgScale').addEventListener('input', (e) => {
            this.bgScale = parseFloat(e.target.value);
            document.getElementById('bgScaleValue').textContent = this.bgScale.toFixed(1) + 'x';
            this.forceDraw();
        });
        
        // ===== UI TRANSPARENCY CONTROL =====
        document.getElementById('uiTransparency').addEventListener('input', (e) => {
            const transparency = parseFloat(e.target.value);
            this.updateUITransparency(transparency);
            document.getElementById('transparencyValue').textContent = Math.round(transparency * 100) + '%';
        });
        
        // ===== RECORDING CONTROLS INITIALIZATION =====
        initializeRecordingControls();
        updateBitrateDisplay();
        updateAudioBitrateDisplay();
    }
    
    /**
     * Initializes particle system for particle visualization mode
     * Creates array of particle objects with random positions and velocities
     * Particle count scales with visualizer scale setting
     */
    setupParticles() {
        this.particles = [];
        const particleCount = Math.floor(100 * this.visualizerScale);
        
        // Create particles with random properties
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvasWidth,      // Random X position
                y: Math.random() * this.canvasHeight,     // Random Y position
                vx: (Math.random() - 0.5) * 2,           // X velocity
                vy: (Math.random() - 0.5) * 2,           // Y velocity
                size: Math.random() * 3 + 1,             // Particle size
                hue: Math.random() * 360                 // Color hue
            });
        }
    }
    
    /**
     * Loads and processes background image file
     * @param {Event} event - File input change event
     * Handles image loading with error checking and validation
     */
    loadBackground(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('Background file selected:', file.name, 'Size:', file.size);
        
        const img = new Image();
        
        // Success handler - store loaded image
        img.onload = () => {
            this.backgroundImage = img;
            console.log('Background image loaded successfully:', img.width, 'x', img.height);
            
            // Force a redraw to show the background immediately
            this.forceDraw();
        };
        
        // Error handler - show user feedback
        img.onerror = (e) => {
            console.error('Failed to load background image:', e);
            alert('Failed to load background image. Please try a different file.');
            this.backgroundImage = null;
        };
        
        // Load image from file
        const url = URL.createObjectURL(file);
        img.src = url;
    }
    
    /**
     * Clears the current background image
     * Resets background image and file input
     */
    clearBackground() {
        this.backgroundImage = null;
        document.getElementById('backgroundImage').value = '';
        console.log('Background cleared');
        
        // Force a redraw to update the view without the background
        this.forceDraw();
    }
    
    /**
     * Loads audio file and sets up audio element
     * @param {File} file - Audio file to load
     * Handles multiple audio formats with error fallback
     */
    loadAudio(file) {
        console.log('Loading file:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        // Create object URL for audio element
        const url = URL.createObjectURL(file);
        this.audio.src = url;
        
        // Remove any existing event listeners to prevent duplicates
        this.audio.removeEventListener('loadedmetadata', this.onAudioLoaded);
        this.audio.removeEventListener('error', this.onAudioError);
        
        // Success handler - enable controls and update UI
        this.onAudioLoaded = () => {
            console.log('Audio metadata loaded successfully');
            document.getElementById('playBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = false;
            
            // Update info panel with file details
            document.querySelector('.info').innerHTML = `
                <div style="color: #00ff88;">✓ Audio loaded: ${this.currentFileName}</div>
                <div>Duration: ${Math.floor(this.audio.duration / 60)}:${Math.floor(this.audio.duration % 60).toString().padStart(2, '0')}</div>
                <div>Click Play to start visualization</div>
            `;
            
            updateRecordingControlsState(); // Enable recording controls
        };
        
        // Error handler - fall back to demo mode
        this.onAudioError = (e) => {
            console.error('Audio loading error:', e);
            this.startDemoVisualization();
            document.querySelector('.info').innerHTML = `
                <div style="color: #ff6b6b;">⚠ Audio format issue - showing demo</div>
                <div>Try converting to standard MP3 format</div>
                <div>Demo visualization running</div>
            `;
        };
        
        // Attach event listeners
        this.audio.addEventListener('loadedmetadata', this.onAudioLoaded);
        this.audio.addEventListener('error', this.onAudioError);
    }
    
    /**
     * Starts audio playback and visualization
     * Sets up Web Audio API components for frequency analysis
     * Handles audio context initialization and connection
     */
    async play() {
        try {
            // Initialize Web Audio API components on first play
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 512;                    // FFT size for frequency analysis
                this.analyser.smoothingTimeConstant = 0.8;      // Smoothing between frames
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                // Connect audio element to analyser
                this.source = this.audioContext.createMediaElementSource(this.audio);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
            }
            
            // Resume audio context if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Start audio playback
            await this.audio.play();
            this.startVisualization();
            
        } catch (error) {
            console.error('Error playing audio:', error);
            // Fall back to demo visualization if audio fails
            this.startDemoVisualization();
        }
    }
    
    /**
     * Pauses audio playback and stops visualization animation
     */
    pause() {
        this.audio.pause();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Starts the main visualization animation loop
     * Continuously analyzes audio data and renders visualization
     */
    startVisualization() {
        console.log('Starting visualization with mode:', this.visualMode);
        const animate = () => {
            // Stop animation if audio is paused
            if (this.audio.paused) {
                this.animationId = null;
                return;
            }
            
            // Request next animation frame
            this.animationId = requestAnimationFrame(animate);
            
            // Get frequency data and render
            if (this.analyser && this.dataArray) {
                this.analyser.getByteFrequencyData(this.dataArray);
                this.draw();
            }
        };
        
        // Start animation loop
        this.animationId = requestAnimationFrame(animate);
    }
    
    /**
     * Starts demo visualization with synthetic audio data
     * Used when audio loading fails or for preview purposes
     * Generates sine wave patterns to simulate audio data
     */
    startDemoVisualization() {
        console.log('Starting demo visualization with mode:', this.visualMode);
        this.dataArray = new Uint8Array(256);
        
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            // Generate synthetic frequency data using sine waves
            const time = Date.now() * 0.001;
            for (let i = 0; i < this.dataArray.length; i++) {
                // Combine multiple sine waves for realistic audio simulation
                this.dataArray[i] = Math.abs(
                    Math.sin(time + i * 0.1) * 128 + 
                    Math.sin(time * 2 + i * 0.05) * 64
                );
            }
            
            this.draw();
        };
        
        // Start animation loop
        this.animationId = requestAnimationFrame(animate);
    }
    
    /**
     * Samples frequency data to match the desired bar count
     * @returns {Array} Sampled frequency data array
     */
    getSampledData() {
        if (!this.dataArray) return [];
        
        // If bar count is greater than available data, return all data
        if (this.barCount >= this.dataArray.length) {
            return Array.from(this.dataArray);
        }
        
        // Downsample by averaging frequency bins
        const sampledData = [];
        const sampleSize = this.dataArray.length / this.barCount;
        
        for (let i = 0; i < this.barCount; i++) {
            const start = Math.floor(i * sampleSize);
            const end = Math.floor((i + 1) * sampleSize);
            let sum = 0;
            let count = 0;
            
            // Average the frequency bins in this sample range
            for (let j = start; j < end && j < this.dataArray.length; j++) {
                sum += this.dataArray[j];
                count++;
            }
            
            sampledData.push(count > 0 ? sum / count : 0);
        }
        
        return sampledData;
    }
    
    /**
     * Main rendering function - draws current frame of visualization
     * Handles background rendering, scaling, and delegates to specific draw methods
     */
    draw() {
        // Clear the canvas first to prevent artifacts
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // ===== RENDER BACKGROUND (IMAGE OR DEFAULT) =====
        if (this.backgroundImage) {
            // Reset globalAlpha to ensure previous frames don't affect this one
            this.ctx.globalAlpha = 1.0;
            
            try {
                // Draw background image with scaling
                const scaledWidth = this.canvasWidth * this.bgScale;
                const scaledHeight = this.canvasHeight * this.bgScale;
                const offsetX = (this.canvasWidth - scaledWidth) / 2;
                const offsetY = (this.canvasHeight - scaledHeight) / 2;
                
                this.ctx.drawImage(this.backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
                
                // Apply opacity overlay after drawing the image
                this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.bgOpacity})`;
                this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            } catch (e) {
                console.error('Error drawing background image:', e);
                // Fallback to default background if image drawing fails
                this.ctx.fillStyle = 'rgba(10, 10, 10, 1)';
                this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            }
        } else {
            // Default background with fade effect
            this.ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        // ===== APPLY VISUALIZER SCALING TRANSFORMATION =====
        this.ctx.save();
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.visualizerScale, this.visualizerScale);
        this.ctx.translate(-centerX, -centerY);
        
        // ===== HANDLE NO AUDIO DATA CASE =====
        if (!this.dataArray || this.dataArray.every(val => val === 0)) {
            this.drawDefaultAnimation();
            this.ctx.restore();
            return;
        }
        
        // ===== DELEGATE TO SPECIFIC VISUALIZATION METHOD =====
        switch (this.visualMode) {
            case 'bars': 
                this.drawBars(); 
                break;
            case 'bars_mirror': 
                this.drawBarsMirror(); 
                break;
            case 'bars_center': 
                this.drawBarsCenter(); 
                break;
            case 'bars_radial': 
                this.drawBarsRadial(); 
                break;
            case 'bars_wave': 
                this.drawBarsWave(); 
                break;
            case 'bars_stacked': 
                this.drawBarsStacked(); 
                break;
            case 'circle': 
                this.drawCircle(); 
                break;
            case 'waveform': 
                this.drawWaveform(); 
                break;
            case 'particles': 
                this.drawParticles(); 
                break;
            case 'spiral': 
                this.drawSpiral(); 
                break;
            default:
                // Fallback to mirror bars if unknown mode is selected
                this.drawBarsMirror();
                break;
        }
        
        this.ctx.restore();
    }
    
    /**
     * Draws default loading animation when no audio data is available
     * Simple pulsing circle with loading text
     */
    drawDefaultAnimation() {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const time = Date.now() * 0.005;
        const radius = 50 + Math.sin(time) * 20;
        
        // Animated pulsing circle
        this.ctx.strokeStyle = this.getColor(time * 10, 360, 0.8);
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Loading text
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading audio data...', centerX, centerY + 100);
    }
    
    /**
     * Generates colors based on current color mode and settings
     * @param {number} index - Current item index for color calculation
     * @param {number} total - Total number of items
     * @param {number} intensity - Audio intensity (0-1) for brightness
     * @returns {string} CSS color string
     */
    getColor(index, total, intensity = 1) {
        switch (this.colorMode) {
            case 'rainbow':
                // HSL rainbow spectrum based on index position
                const hue = (index / total) * 360;
                const saturation = 70 + (intensity * 30);
                const lightness = 50 + (intensity * 30);
                return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            case 'custom':
                // Use predefined custom colors
                const colorIndex = Math.floor((index / total) * this.customColors.length);
                return this.customColors[colorIndex] || this.customColors[0];
            
            case 'gradient':
                // Linear interpolation between two custom colors
                const ratio = index / total;
                const color1 = this.hexToRgb(this.customColors[0]);
                const color2 = this.hexToRgb(this.customColors[1]);
                const r = Math.floor(color1.r + (color2.r - color1.r) * ratio);
                const g = Math.floor(color1.g + (color2.g - color1.g) * ratio);
                const b = Math.floor(color1.b + (color2.b - color1.b) * ratio);
                return `rgba(${r}, ${g}, ${b}, ${intensity})`;
            
            case 'monochrome':
                // Single hue with varying brightness
                const brightness = 50 + (intensity * 50);
                return `hsl(220, 30%, ${brightness}%)`;
            
            default:
                return `hsl(${(index / total) * 360}, 80%, 60%)`;
        }
    }
    
    /**
     * Converts hex color string to RGB object
     * @param {string} hex - Hex color string (e.g., "#ff0000")
     * @returns {Object} RGB object with r, g, b properties
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 255, g: 107, b: 107}; // Default red if parsing fails
    }
    
    /**
     * Applies custom styles to dropdown elements to ensure visibility
     * Fixes the white text on white background issue
     */
    applyDropdownStyles() {
        // Create a style element
        const styleEl = document.createElement('style');
        
        // Define styles for dropdowns and add CSS variables for UI transparency
        styleEl.textContent = `
            :root {
                --control-bg-opacity: 1.0;
            }
            
            .controls {
                transition: background-color 0.3s ease;
            }
            
            .control-group {
                background-color: rgba(0, 0, 0, var(--control-bg-opacity));
                transition: background-color 0.3s ease;
            }
            
            select {
                background-color: #121212;
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 14px;
                appearance: auto;
            }
            
            select:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.6);
                box-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
            }
            
            option {
                background-color: #121212;
                color: white;
            }
        `;
        
        // Add the style element to the document head
        document.head.appendChild(styleEl);
        
        console.log('Applied custom dropdown and UI transparency styles');
    }
    
    // ========================================================================
    // VISUALIZATION METHODS
    // ========================================================================
    
    drawBars() {
        const sampledData = this.getSampledData();
        const barWidth = (this.canvasWidth / sampledData.length) * this.barThickness;
        const barSpacing = this.canvasWidth / sampledData.length;
        let x = (barSpacing - barWidth) / 2;
        
        for (let i = 0; i < sampledData.length; i++) {
            const barHeight = (sampledData[i] / 255) * this.canvasHeight * 0.8 * this.sensitivity;
            const intensity = sampledData[i] / 255;
            
            this.ctx.fillStyle = this.getColor(i, sampledData.length, intensity);
            this.ctx.fillRect(x, this.canvasHeight - barHeight, barWidth, barHeight);
            
            this.ctx.fillStyle = this.getColor(i, sampledData.length, intensity * 0.3);
            this.ctx.fillRect(x, 0, barWidth, barHeight * 0.5);
            
            x += barSpacing;
        }
    }
    
    drawBarsMirror() {
        const sampledData = this.getSampledData();
        const barWidth = (this.canvasWidth / sampledData.length) * this.barThickness;
        const barSpacing = this.canvasWidth / sampledData.length;
        let x = (barSpacing - barWidth) / 2;
        
        for (let i = 0; i < sampledData.length; i++) {
            const barHeight = (sampledData[i] / 255) * this.canvasHeight * 0.4 * this.sensitivity;
            const centerY = this.canvasHeight / 2;
            const intensity = sampledData[i] / 255;
            
            const color = this.getColor(i, sampledData.length, intensity);
            this.ctx.fillStyle = color;
            
            this.ctx.fillRect(x, centerY, barWidth, barHeight);
            this.ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
            
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
            this.ctx.fillRect(x, centerY, barWidth, barHeight);
            this.ctx.shadowBlur = 0;
            
            x += barSpacing;
        }
    }
    
    drawBarsCenter() {
        const sampledData = this.getSampledData();
        const barWidth = (this.canvasWidth / sampledData.length) * this.barThickness;
        const barSpacing = this.canvasWidth / sampledData.length;
        const centerX = this.canvasWidth / 2;
        
        for (let i = 0; i < sampledData.length; i++) {
            const barHeight = (sampledData[i] / 255) * this.canvasHeight * 0.8 * this.sensitivity;
            const intensity = sampledData[i] / 255;
            
            this.ctx.fillStyle = this.getColor(i, sampledData.length, intensity);
            
            const leftX = centerX - (i + 1) * barSpacing + (barSpacing - barWidth) / 2;
            if (leftX >= 0) {
                this.ctx.fillRect(leftX, this.canvasHeight - barHeight, barWidth, barHeight);
            }
            
            const rightX = centerX + i * barSpacing + (barSpacing - barWidth) / 2;
            if (rightX < this.canvasWidth) {
                this.ctx.fillRect(rightX, this.canvasHeight - barHeight, barWidth, barHeight);
            }
        }
    }
    
    drawBarsRadial() {
        const sampledData = this.getSampledData();
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const baseRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.15;
        
        for (let i = 0; i < sampledData.length; i++) {
            const angle = (i / sampledData.length) * Math.PI * 2;
            const barLength = (sampledData[i] / 255) * Math.min(this.canvasWidth, this.canvasHeight) * 0.3 * this.sensitivity;
            const intensity = sampledData[i] / 255;
            
            const x1 = centerX + Math.cos(angle) * baseRadius;
            const y1 = centerY + Math.sin(angle) * baseRadius;
            const x2 = centerX + Math.cos(angle) * (baseRadius + barLength);
            const y2 = centerY + Math.sin(angle) * (baseRadius + barLength);
            
            const color = this.getColor(i, sampledData.length, intensity);
            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, color.replace(')', ', 0.1)').replace('rgb', 'rgba'));
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 4 * this.barThickness;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    drawBarsWave() {
        const sampledData = this.getSampledData();
        const barWidth = (this.canvasWidth / sampledData.length) * this.barThickness;
        const barSpacing = this.canvasWidth / sampledData.length;
        let x = (barSpacing - barWidth) / 2;
        const time = Date.now() * 0.002;
        
        for (let i = 0; i < sampledData.length; i++) {
            const baseHeight = (sampledData[i] / 255) * this.canvasHeight * 0.6 * this.sensitivity;
            const wave = Math.sin(time + i * 0.1) * 20;
            const barHeight = baseHeight + wave;
            const intensity = sampledData[i] / 255;
            
            this.ctx.fillStyle = this.getColor(i + time * 50, sampledData.length, intensity);
            this.ctx.fillRect(x, this.canvasHeight - Math.abs(barHeight), barWidth, Math.abs(barHeight));
            
            x += barSpacing;
        }
    }
    
    drawBarsStacked() {
        const sampledData = this.getSampledData();
        const barWidth = (this.canvasWidth / sampledData.length) * this.barThickness;
        const barSpacing = this.canvasWidth / sampledData.length;
        let x = (barSpacing - barWidth) / 2;
        
        for (let i = 0; i < sampledData.length; i++) {
            const totalHeight = (sampledData[i] / 255) * this.canvasHeight * 0.8 * this.sensitivity;
            const segments = 5;
            const segmentHeight = totalHeight / segments;
            const intensity = sampledData[i] / 255;
            
            for (let j = 0; j < segments; j++) {
                const alpha = 1 - (j * 0.15);
                const color = this.getColor(i + j * 10, sampledData.length, intensity * alpha);
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, this.canvasHeight - (j + 1) * segmentHeight, barWidth, segmentHeight - 1);
            }
            
            x += barSpacing;
        }
    }
    
    drawCircle() {
        const sampledData = this.getSampledData();
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const radius = Math.min(this.canvasWidth, this.canvasHeight) * 0.2;
        
        for (let i = 0; i < sampledData.length; i++) {
            const angle = (i / sampledData.length) * Math.PI * 2;
            const amplitude = (sampledData[i] / 255) * Math.min(this.canvasWidth, this.canvasHeight) * 0.3 * this.sensitivity;
            const intensity = sampledData[i] / 255;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + amplitude);
            const y2 = centerY + Math.sin(angle) * (radius + amplitude);
            
            this.ctx.strokeStyle = this.getColor(i, sampledData.length, intensity);
            this.ctx.lineWidth = 3 * this.barThickness;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    drawWaveform() {
        const sampledData = this.getSampledData();
        this.ctx.strokeStyle = this.getColor(0, 1, 1);
        this.ctx.lineWidth = 2 * this.barThickness;
        this.ctx.beginPath();
        
        const sliceWidth = this.canvasWidth / sampledData.length;
        let x = 0;
        
        for (let i = 0; i < sampledData.length; i++) {
            const v = (sampledData[i] / 128) * this.sensitivity;
            const y = v * this.canvasHeight / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
    }
    
    drawParticles() {
        const sampledData = this.getSampledData();
        const avgFreq = sampledData.reduce((a, b) => a + b, 0) / sampledData.length;
        
        this.particles.forEach((particle, index) => {
            const freqData = sampledData[index % sampledData.length];
            const intensity = (freqData / 255) * this.sensitivity;
            
            particle.x += particle.vx * (1 + intensity);
            particle.y += particle.vy * (1 + intensity);
            particle.size = (1 + intensity * 5) * this.barThickness;
            
            if (particle.x < 0 || particle.x > this.canvasWidth) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvasHeight) particle.vy *= -1;
            
            this.ctx.fillStyle = this.getColor(particle.hue + avgFreq, 360, intensity);
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawSpiral() {
        const sampledData = this.getSampledData();
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        this.ctx.strokeStyle = this.getColor(0, 1, 1);
        this.ctx.lineWidth = 2 * this.barThickness;
        this.ctx.beginPath();
        
        for (let i = 0; i < sampledData.length; i++) {
            const angle = (i / sampledData.length) * Math.PI * 8;
            const amplitude = (sampledData[i] / 255) * 3 * this.sensitivity;
            const scaleFactor = Math.min(this.canvasWidth, this.canvasHeight) * 0.003;
            const radius = (i * scaleFactor) + (amplitude * 50);
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
}

/**
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
    if (window.visualizer) {
        window.visualizer.customColors = [color1.value, color2.value, color3.value];
        window.visualizer.colorMode = colorMode.value;
        // Show/hide custom color controls
        document.getElementById('customColors').style.display = 
            colorMode.value === 'custom' || colorMode.value === 'gradient' ? 'block' : 'none';
        
        // Force a redraw to show new colors immediately
        window.visualizer.forceDraw();
    }
}

// Recording state variables
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = 0;

// Recording quality presets
const qualityPresets = {
    '720p': { width: 1280, height: 720, videoBitrate: 4000000, audioBitrate: 192000 },
    '1080p': { width: 1920, height: 1080, videoBitrate: 8000000, audioBitrate: 192000 },
    '4K': { width: 3840, height: 2160, videoBitrate: 20000000, audioBitrate: 320000 }
};

// Enable/disable recording controls based on audio state
function updateRecordingControlsState() {
    const recordBtn = document.getElementById('recordBtn');
    const audio = document.getElementById('audio');
    
    if (audio && audio.src && audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        recordBtn.disabled = false;
    } else {
        recordBtn.disabled = true;
    }
}

// Modified audio file handling to enable recording controls
function handleAudioLoad() {
    const audioFile = document.getElementById('audioFile');
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (audioFile.files.length > 0) {
        const file = audioFile.files[0];
        const url = URL.createObjectURL(file);
        audio.src = url;
        
        audio.addEventListener('loadeddata', function() {
            playBtn.disabled = false;
            pauseBtn.disabled = false;
            updateRecordingControlsState(); // Enable recording controls
        });
        
        audio.addEventListener('canplaythrough', function() {
            updateRecordingControlsState(); // Ensure recording is enabled when fully loaded
        });
    }
}

// Initialize recording controls
function initializeRecordingControls() {
    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const qualitySelect = document.getElementById('recordingQuality');
    const customBitrate = document.getElementById('customBitrate');
    const videoBitrateSlider = document.getElementById('videoBitrate');
    const audioBitrateSlider = document.getElementById('audioBitrate');
    const bitrateValue = document.getElementById('bitrateValue');
    const audioBitrateValue = document.getElementById('audioBitrateValue');

    recordBtn.addEventListener('click', startRecording);
    stopRecordBtn.addEventListener('click', stopRecording);
    
    qualitySelect.addEventListener('change', handleQualityChange);
    videoBitrateSlider.addEventListener('input', updateBitrateDisplay);
    audioBitrateSlider.addEventListener('input', updateAudioBitrateDisplay);
    
    // Add audio file change event listener
    const audioFile = document.getElementById('audioFile');
    audioFile.addEventListener('change', handleAudioLoad);
}

// Handle quality selection changes
function handleQualityChange() {
    const qualitySelect = document.getElementById('recordingQuality');
    const customBitrate = document.getElementById('customBitrate');
    
    if (qualitySelect.value === 'custom') {
        customBitrate.style.display = 'block';
    } else {
        customBitrate.style.display = 'none';
    }
}

// Update bitrate display values
function updateBitrateDisplay() {
    const videoBitrateSlider = document.getElementById('videoBitrate');
    const bitrateValue = document.getElementById('bitrateValue');
    bitrateValue.textContent = `${videoBitrateSlider.value} Mbps`;
}

function updateAudioBitrateDisplay() {
    const audioBitrateSlider = document.getElementById('audioBitrate');
    const audioBitrateValue = document.getElementById('audioBitrateValue');
    audioBitrateValue.textContent = `${audioBitrateSlider.value} kbps`;
}

// Get recording configuration based on selected quality
function getRecordingConfig() {
    const qualitySelect = document.getElementById('recordingQuality');
    const outputFormat = document.getElementById('outputFormat');
    const quality = qualitySelect.value;
    
    let config;
    
    if (quality === 'custom') {
        const videoBitrate = document.getElementById('videoBitrate').value * 1000000; // Convert to bps
        const audioBitrate = document.getElementById('audioBitrate').value * 1000; // Convert to bps
        config = {
            videoBitrate,
            audioBitrate,
            width: window.visualizer?.canvas?.width || 1920,
            height: window.visualizer?.canvas?.height || 1080
        };
    } else {
        config = qualityPresets[quality];
    }
    
    const mimeType = outputFormat.value === 'mp4' && MediaRecorder.isTypeSupported('video/mp4') 
        ? 'video/mp4' 
        : 'video/webm;codecs=vp9,opus';
    
    return { ...config, mimeType };
}

// Create media stream from canvas and audio
function createRecordingStream(config) {
    try {
        // Access canvas and audio context from the visualizer instance
        const canvas = window.visualizer.canvas;
        const audioContext = window.visualizer.audioContext;
        const analyser = window.visualizer.analyser;
        
        if (!canvas) {
            throw new Error('Canvas not available');
        }
        
        // Capture canvas stream
        const canvasStream = canvas.captureStream(30); // 30 fps
        const videoTrack = canvasStream.getVideoTracks()[0];
        
        if (!videoTrack) {
            throw new Error('Could not capture video from canvas');
        }
        
        let combinedStream;
        
        // Check if audio context and analyser are available
        if (audioContext && analyser) {
            try {
                // Create audio destination for recording
                const audioDestination = audioContext.createMediaStreamDestination();
                
                // Connect audio nodes to destination
                analyser.connect(audioDestination);
                
                const audioTrack = audioDestination.stream.getAudioTracks()[0];
                
                if (audioTrack) {
                    // Combine video and audio tracks
                    combinedStream = new MediaStream([videoTrack, audioTrack]);
                } else {
                    // Fall back to video only if no audio track
                    console.warn('No audio track available, recording video only');
                    combinedStream = new MediaStream([videoTrack]);
                }
            } catch (audioError) {
                console.warn('Error setting up audio recording, falling back to video only:', audioError);
                combinedStream = new MediaStream([videoTrack]);
            }
        } else {
            // No audio context available, record video only
            console.warn('No audio context available, recording video only');
            combinedStream = new MediaStream([videoTrack]);
        }
        
        return combinedStream;
    } catch (error) {
        console.error('Error creating recording stream:', error);
        updateRecordingStatus('Error: Could not create recording stream - ' + error.message);
        return null;
    }
}

// Start recording process
function startRecording() {
    const audio = document.getElementById('audio');
    
    if (!window.visualizer) {
        updateRecordingStatus('Error: Visualizer not initialized');
        return;
    }
    
    if (!audio.src) {
        updateRecordingStatus('Error: No audio file loaded');
        return;
    }
    
    if (!audio.readyState || audio.readyState < 2) {
        updateRecordingStatus('Error: Audio not ready for playback');
        return;
    }
    
    const config = getRecordingConfig();
    const stream = createRecordingStream(config);
    
    if (!stream) return;
    
    try {
        // Reset audio to beginning for full recording
        audio.currentTime = 0;
        
        // Configure MediaRecorder
        const options = {
            mimeType: config.mimeType
        };
        
        // Add bitrate options if specified
        if (config.videoBitrate) {
            options.videoBitsPerSecond = config.videoBitrate;
        }
        if (config.audioBitrate) {
            options.audioBitsPerSecond = config.audioBitrate;
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = handleRecordingData;
        mediaRecorder.onstop = handleRecordingStop;
        mediaRecorder.onerror = handleRecordingError;
        
        // Start recording and audio playback
        mediaRecorder.start();
        
        // Start audio playback through the visualizer's play method
        window.visualizer.play();
        
        isRecording = true;
        recordingStartTime = Date.now();
        
        updateRecordingUI(true);
        updateRecordingStatus('Recording in progress...');
        
        // Auto-stop when audio ends
        audio.addEventListener('ended', autoStopRecording, { once: true });
        
        // Update progress during recording
        startRecordingProgressUpdate();
        
    } catch (error) {
        console.error('Error starting recording:', error);
        updateRecordingStatus('Error: Could not start recording - ' + error.message);
    }
}

// Handle recording data chunks
function handleRecordingData(event) {
    if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
    }
}

// Stop recording process
function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    
    try {
        mediaRecorder.stop();
        
        // Stop audio playback through the visualizer
        if (window.visualizer) {
            window.visualizer.pause();
        }
        
        isRecording = false;
        
        updateRecordingStatus('Processing recording...');
    } catch (error) {
        console.error('Error stopping recording:', error);
        updateRecordingStatus('Error stopping recording');
    }
}

// Auto-stop recording when audio ends
function autoStopRecording() {
    if (isRecording) {
        stopRecording();
    }
}

// Handle recording completion
function handleRecordingStop() {
    if (recordedChunks.length === 0) {
        updateRecordingStatus('Error: No recording data');
        updateRecordingUI(false);
        return;
    }
    
    try {
        const config = getRecordingConfig();
        const blob = new Blob(recordedChunks, { type: config.mimeType });
        const filename = generateRecordingFilename(config);
        
        downloadRecording(blob, filename);
        
        const fileSize = (blob.size / (1024 * 1024)).toFixed(2);
        updateRecordingStatus(`Recording saved: ${filename} (${fileSize} MB)`);
        
    } catch (error) {
        console.error('Error processing recording:', error);
        updateRecordingStatus('Error processing recording');
    }
    
    updateRecordingUI(false);
    recordedChunks = [];
}

// Handle recording errors
function handleRecordingError(event) {
    console.error('Recording error:', event.error);
    updateRecordingStatus(`Recording error: ${event.error.message}`);
    updateRecordingUI(false);
    isRecording = false;
}

// Generate filename for recording
function generateRecordingFilename(config) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const quality = document.getElementById('recordingQuality').value;
    const format = document.getElementById('outputFormat').value;
    
    return `audio-visualization-${quality}-${timestamp}.${format}`;
}

// Download recorded video
function downloadRecording(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up object URL after download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Update recording UI state
function updateRecordingUI(recording) {
    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    recordBtn.style.display = recording ? 'none' : 'inline-block';
    stopRecordBtn.style.display = recording ? 'inline-block' : 'none';
    
    recordBtn.disabled = recording;
    playBtn.disabled = recording;
    pauseBtn.disabled = recording;
}

// Update recording status message
function updateRecordingStatus(message) {
    const statusElement = document.getElementById('recordingStatus');
    statusElement.textContent = message;
}

// Update recording progress
function startRecordingProgressUpdate() {
    const updateProgress = () => {
        if (!isRecording) return;
        
        const audio = document.getElementById('audio');
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const duration = Math.floor(audio.duration || 0);
        const remaining = Math.max(0, duration - elapsed);
        
        updateRecordingStatus(
            `Recording: ${formatTime(elapsed)}/${formatTime(duration)} (${formatTime(remaining)} remaining)`
        );
        
        if (isRecording) {
            setTimeout(updateProgress, 1000);
        }
    };
    
    updateProgress();
}

// Format time in MM:SS format
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Initialize recording when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    
    initializeRecordingControls();
    updateBitrateDisplay();
    updateAudioBitrateDisplay();
    updateRecordingControlsState(); // Initial state check
});

// Create the main visualizer instance when page loads
let visualizer;
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new AudioVisualizer();
    window.visualizer = visualizer; // Make it globally accessible for color presets
});

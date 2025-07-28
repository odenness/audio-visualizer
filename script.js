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
        
        // ===== VIDEO RECORDING COMPONENTS =====
        this.mediaRecorder = null;        // MediaRecorder instance
        this.recordedChunks = [];         // Video data chunks
        this.isRecording = false;         // Recording state
        this.recordingStream = null;      // Canvas + Audio stream
        this.recordingQuality = '1080p';  // Default quality
        this.videoBitrate = 8;            // Video bitrate in Mbps
        this.audioBitrate = 192;          // Audio bitrate in kbps
        this.outputFormat = 'webm';       // Output format
        this.recordingTimer = null;       // Timer for recording duration display
        
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
        this.setupRecordingControls(); // Configure recording functionality
    }
    
    setupCanvas() {
        this.updateCanvasSize();
        
        window.addEventListener('resize', () => {
            if (this.aspectRatio === 'fullscreen') {
                this.updateCanvasSize();
            }
        });
    }
    
    /**
     * Applies aspect ratio changes and forces a redraw
     * Called when aspect ratio or custom dimensions change
     */
    applyAspectRatioChange() {
        // Update canvas dimensions based on new aspect ratio
        this.updateCanvasSize();
        
        // Force a redraw if not currently animating
        if (!this.animationId) {
            this.forceDraw();
        }
        
        // Log the aspect ratio change
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
     * Main rendering function - draws current frame of visualization
     * Handles background rendering, scaling, and delegates to specific draw methods
     */
    draw() {
        // Clear the canvas with the proper dimensions
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
            case 'bars': this.drawBars(); break;
            case 'bars_mirror': this.drawBarsMirror(); break;
            case 'bars_center': this.drawBarsCenter(); break;
            case 'bars_radial': this.drawBarsRadial(); break;
            case 'bars_wave': this.drawBarsWave(); break;
            case 'bars_stacked': this.drawBarsStacked(); break;
            case 'circle': this.drawCircle(); break;
            case 'waveform': this.drawWaveform(); break;
            case 'particles': this.drawParticles(); break;
            case 'spiral': this.drawSpiral(); break;
        }
        
        this.ctx.restore();
    }
    
    setupEventListeners() {
        // ===== GET DOM ELEMENTS FOR EVENT BINDING =====
        const fileInput = document.getElementById('audioFile');
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
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
        
        // ===== BACKGROUND IMAGE CONTROL HANDLERS =====
        backgroundInput.addEventListener('change', (e) => this.loadBackground(e));
        clearBgBtn.addEventListener('click', () => this.clearBackground());
        
        // ===== BACKGROUND OPACITY AND SCALE CONTROL HANDLERS =====
        document.getElementById('bgOpacity').addEventListener('input', (e) => {
            this.bgOpacity = parseFloat(e.target.value);
            document.getElementById('opacityValue').textContent = this.bgOpacity.toFixed(1);
        });
        
        document.getElementById('bgScale').addEventListener('input', (e) => {
            this.bgScale = parseFloat(e.target.value);
            document.getElementById('bgScaleValue').textContent = this.bgScale.toFixed(1) + 'x';
        });
        
        // ===== ASPECT RATIO CONTROL HANDLERS =====
        document.getElementById('aspectRatio').addEventListener('change', (e) => {
            this.aspectRatio = e.target.value;
            const customDiv = document.getElementById('customAspect');
            customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
            
            // Apply aspect ratio change and force redraw
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
            document.getElementById('recordBtn').disabled = false; // Enable recording
            
            document.querySelector('.info').innerHTML = `
                <div style="color: #00ff88;">✓ Audio loaded: ${this.currentFileName}</div>
                <div>Duration: ${Math.floor(this.audio.duration / 60)}:${Math.floor(this.audio.duration % 60).toString().padStart(2, '0')}</div>
                <div>Click Play to start visualization</div>
                <div>Use 🔴 button to record visualization</div>
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
        console.log('Starting visualization animation loop');
        const animate = () => {
            // Stop animation if audio is paused
            if (this.audio.paused) {
                console.log('Audio paused, stopping animation');
                return;
            }
            
            // Request next animation frame
            this.animationId = requestAnimationFrame(animate);
            
            // Get frequency data and render
            if (this.analyser && this.dataArray) {
                this.analyser.getByteFrequencyData(this.dataArray);
                this.draw();
            } else {
                console.warn('Analyser or dataArray not available');
            }
        };
        animate();
    }
    
    startDemoVisualization() {
        console.log('Starting demo visualization with synthetic data');
        this.dataArray = new Uint8Array(256);
        
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            // Generate synthetic frequency data using sine waves
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
    
    /**
     * ========================================================================
     * BACKGROUND IMAGE MANAGEMENT
     * ========================================================================
     */
    
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
        console.log('Created URL for background image:', url);
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
     * ========================================================================
     * VIDEO RECORDING FUNCTIONALITY
     * ========================================================================
     * Methods for recording the audio visualization to video using
     * MediaRecorder API with high-quality settings
     */
    
    /**
     * Sets up event listeners and controls for video recording
     * Called during initialization
     */
    setupRecordingControls() {
        const recordBtn = document.getElementById('recordBtn');
        const stopRecordBtn = document.getElementById('stopRecordBtn');
        const qualitySelect = document.getElementById('recordingQuality');
        const formatSelect = document.getElementById('outputFormat');
        const videoBitrateSlider = document.getElementById('videoBitrate');
        const audioBitrateSlider = document.getElementById('audioBitrate');
        
        // Quality selection handler
        qualitySelect.addEventListener('change', (e) => {
            this.recordingQuality = e.target.value;
            const customDiv = document.getElementById('customBitrate');
            customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
            
            // Set predefined bitrates
            switch (e.target.value) {
                case '720p':
                    this.videoBitrate = 5;
                    videoBitrateSlider.value = 5;
                    document.getElementById('bitrateValue').textContent = '5 Mbps';
                    break;
                case '1080p':
                    this.videoBitrate = 8;
                    videoBitrateSlider.value = 8;
                    document.getElementById('bitrateValue').textContent = '8 Mbps';
                    break;
                case '4K':
                    this.videoBitrate = 25;
                    videoBitrateSlider.value = 25;
                    document.getElementById('bitrateValue').textContent = '25 Mbps';
                    break;
            }
        });
        
        // Format selection handler
        formatSelect.addEventListener('change', (e) => {
            this.outputFormat = e.target.value;
        });
        
        // Bitrate sliders
        videoBitrateSlider.addEventListener('input', (e) => {
            this.videoBitrate = parseInt(e.target.value);
            document.getElementById('bitrateValue').textContent = this.videoBitrate + ' Mbps';
        });
        
        audioBitrateSlider.addEventListener('input', (e) => {
            this.audioBitrate = parseInt(e.target.value);
            document.getElementById('audioBitrateValue').textContent = this.audioBitrate + ' kbps';
        });
        
        // Recording control handlers
        recordBtn.addEventListener('click', () => this.startRecording());
        stopRecordBtn.addEventListener('click', () => this.stopRecording());
        
        // Enable recording button when audio is loaded
        this.audio.addEventListener('loadedmetadata', () => {
            recordBtn.disabled = false;
        });
    }
    
    /**
     * Starts recording the visualization and audio
     * Uses MediaRecorder API to capture canvas and audio streams
     */
    async startRecording() {
        try {
            // Update status
            this.updateRecordingStatus('Preparing recording...', '#ffaa00');
            
            // Get canvas stream
            const canvasStream = this.canvas.captureStream(60); // 60 FPS
            
            // Get audio stream if available
            let audioStream = null;
            if (this.audioContext && this.source) {
                // Create a destination for recording
                const dest = this.audioContext.createMediaStreamDestination();
                this.source.connect(dest);
                audioStream = dest.stream;
            }
            
            // Combine streams
            const tracks = [...canvasStream.getTracks()];
            if (audioStream) {
                tracks.push(...audioStream.getTracks());
            }
            
            this.recordingStream = new MediaStream(tracks);
            
            // Determine MIME type and codec
            const mimeType = this.getMimeType();
            
            // Configure MediaRecorder options
            const options = {
                mimeType: mimeType,
                videoBitsPerSecond: this.videoBitrate * 1000000, // Convert to bits
                audioBitsPerSecond: this.audioBitrate * 1000     // Convert to bits
            };
            
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.recordingStream, options);
            
            // Reset recorded chunks
            this.recordedChunks = [];
            
            // Handle data chunks
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            // Handle recording stop
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            // Handle errors
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.updateRecordingStatus('Recording error: ' + event.error.message, '#ff6666');
                this.resetRecordingUI();
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            
            // Update UI
            document.getElementById('recordBtn').style.display = 'none';
            document.getElementById('stopRecordBtn').style.display = 'inline-block';
            document.getElementById('stopRecordBtn').disabled = false;
            this.updateRecordingStatus('🔴 Recording...', '#ff4444');
            
            // Start recording timer
            this.startRecordingTimer();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateRecordingStatus('Failed to start recording: ' + error.message, '#ff6666');
            this.resetRecordingUI();
        }
    }
    
    /**
     * Stops the active recording and processes the recorded data
     */
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop all tracks
            if (this.recordingStream) {
                this.recordingStream.getTracks().forEach(track => track.stop());
            }
            
            this.updateRecordingStatus('Processing video...', '#ffaa00');
            this.resetRecordingUI();
        }
    }
    
    /**
     * Saves the recorded video data as a file and initiates download
     * Processes the collected data chunks and creates a download link
     */
    saveRecording() {
        if (this.recordedChunks.length === 0) {
            this.updateRecordingStatus('No data recorded', '#ff6666');
            return;
        }
        
        // Create blob from recorded chunks
        const mimeType = this.getMimeType();
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = this.outputFormat === 'mp4' ? 'mp4' : 'webm';
        const audioName = this.currentFileName ? this.currentFileName.replace(/\.[^/.]+$/, '') : 'visualizer';
        a.download = `${audioName}_visualized_${timestamp}.${extension}`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Cleanup
        URL.revokeObjectURL(url);
        this.recordedChunks = [];
        
        this.updateRecordingStatus('✅ Video saved successfully!', '#00ff88');
        setTimeout(() => {
            this.updateRecordingStatus('Ready to record', 'rgba(255,255,255,0.7)');
        }, 3000);
    }
    
    /**
     * Determines the best MIME type and codec for recording
     * Checks browser support and falls back to WebM if necessary
     * @returns {string} MIME type string for MediaRecorder
     */
    getMimeType() {
        // Check format support and return appropriate MIME type
        const format = this.outputFormat;
        
        if (format === 'mp4') {
            if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.424028,mp4a.40.2"')) {
                return 'video/mp4; codecs="avc1.424028,mp4a.40.2"';
            }
        }
        
        // Fallback to WebM with VP9 codec
        if (MediaRecorder.isTypeSupported('video/webm; codecs="vp9,opus"')) {
            return 'video/webm; codecs="vp9,opus"';
        }
        
        // Basic WebM fallback
        return 'video/webm';
    }
    
    /**
     * Updates the recording status display
     * @param {string} message - Status message to display
     * @param {string} color - Text color for the status message
     */
    updateRecordingStatus(message, color = 'rgba(255,255,255,0.7)') {
        const statusDiv = document.getElementById('recordingStatus');
        statusDiv.textContent = message;
        statusDiv.style.color = color;
    }
    
    /**
     * Resets the recording UI to initial state
     * Called after recording stops or on error
     */
    resetRecordingUI() {
        document.getElementById('recordBtn').style.display = 'inline-block';
        document.getElementById('stopRecordBtn').style.display = 'none';
        document.getElementById('recordBtn').disabled = !this.audio.src;
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }
    
    /**
     * Starts a timer to show recording duration
     * Updates status message with current duration
     */
    startRecordingTimer() {
        let seconds = 0;
        this.recordingTimer = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            this.updateRecordingStatus(
                `🔴 Recording: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`, 
                '#ff4444'
            );
        }, 1000);
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

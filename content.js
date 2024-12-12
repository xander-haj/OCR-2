/* ------------------------------
   Initial Check for Reload Flag
------------------------------ */
(function() {
    if (sessionStorage.getItem('cameraPermissionsGranted')) {
        // Set a flag to indicate that the page has just reloaded after granting permissions
        sessionStorage.setItem('cameraReloaded', 'true');
        // Remove the flag to prevent further reloads
        sessionStorage.removeItem('cameraPermissionsGranted');
    }
})();

/* ------------------------------
   Side Menu Functionality
------------------------------ */
(function() {
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const container = document.getElementById('container');

    let isMenuOpen = false;

    function openMenu() {
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        container.classList.add('side-menu-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        isMenuOpen = true;
    }

    function closeMenu() {
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        container.classList.remove('side-menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        isMenuOpen = false;
    }

    menuToggle.addEventListener('click', function() {
        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close the side menu when clicking on the overlay
    menuOverlay.addEventListener('click', function() {
        if (isMenuOpen) {
            closeMenu();
        }
    });

    // Optional: Close the menu with the Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });
})();

/* ------------------------------
   Theme Toggle Functionality
------------------------------ */
(function() {
    const toggleCheckbox = document.getElementById('theme-checkbox');
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        document.body.classList.add('dark-theme');
        toggleCheckbox.checked = true;
    }

    toggleCheckbox.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.classList.add('dark-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark-theme');
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
})();

/* ------------------------------
   Capture and Display Console Logs in Debug Console
------------------------------ */
(function() {
    const debugConsole = document.getElementById('debugConsole');
    function addLogEntry(type, args) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${type.toUpperCase()}] ` + Array.from(args).join(' ');
        debugConsole.appendChild(entry);
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    console.log = function(...args) {
        originalLog.apply(console, args);
        addLogEntry('log', args);
    };
    console.warn = function(...args) {
        originalWarn.apply(console, args);
        addLogEntry('warn', args);
    };
    console.error = function(...args) {
        originalError.apply(console, args);
        addLogEntry('error', args);
    };
})();

/* ------------------------------
   Function to Save Logs to a File
------------------------------ */
function saveLogs() {
    const debugConsole = document.getElementById('debugConsole');
    const logsText = debugConsole.innerText;
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('save-logs-button').addEventListener('click', saveLogs);

/* ------------------------------
   Debug Button Functionality (Moved to Side Menu)
------------------------------ */
(function() {
    const debugButton = document.getElementById('debug-button');
    const debugCanvas = document.getElementById('debugCanvas');
    const debugConsole = document.getElementById('debugConsole');
    const debugControls = document.getElementById('debugControls');

    // Initially hide the debug elements
    debugCanvas.style.display = 'none';
    debugConsole.style.display = 'none';
    debugControls.style.display = 'none';

    let isDebugVisible = false;

    debugButton.addEventListener('click', function() {
        isDebugVisible = !isDebugVisible;
        if (isDebugVisible) {
            debugCanvas.style.display = 'block';
            debugConsole.style.display = 'block';
            debugControls.style.display = 'block';
            debugButton.innerText = 'Hide Debug';
        } else {
            debugCanvas.style.display = 'none';
            debugConsole.style.display = 'none';
            debugControls.style.display = 'none';
            debugButton.innerText = 'Show Debug';
        }
    });
})();

/* ------------------------------
   OCR Scanning Functionality
------------------------------ */
(function() {
    // References to DOM elements
    const video = document.getElementById('video');
    const roiOverlay = document.getElementById('overlay'); // ROI Bounding Box
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const restartButton = document.getElementById('restart-button'); // New Restart Button
    const debugButton = document.getElementById('debug-button'); // Now in side menu
    const output = document.getElementById('output');
    const errorMsg = document.getElementById('errorMsg');
    const debugCanvas = document.getElementById('debugCanvas');
    const focusIndicator = document.getElementById('focusIndicator');
    const workersSelect = document.getElementById('workers-select');
    const webglCanvas = document.getElementById('webglCanvas');
    const toggleWebglButton = document.getElementById('toggleWebglButton');
    const roiFiltersSelect = document.getElementById('roi-filters-select'); // New ROI Filters Select
    const frameSkippingSelect = document.getElementById('frame-skipping-select'); // New Frame Skipping Select
    const frequencySelect = document.getElementById('frequency-select'); // New Frequency Select
    const ocrInfo = document.getElementById('ocr-info'); // New OCR Info Text
    const confidenceThresholdInput = document.getElementById('confidence-threshold-input'); // New Confidence Threshold Input

    let stream = null;
    let scanning = false;
    let lastScanTime = 0;
    let confidenceThreshold = parseInt(confidenceThresholdInput.value, 10) || 60; // Dynamic Confidence Threshold
    let selectedFilter = 'none'; // Default filter
    let frameSkipping = 1; // Default: scan every frame
    let ocrFrequency = 1; // Default: 1 Hz
    let frameCounter = 0; // Initialize frame counter
    let lastOcrTime = 0; // Initialize last OCR time

    // Create off-screen canvases
    const videoCanvas = document.createElement('canvas');
    const roiCanvas = document.createElement('canvas');
    const scaledCanvas = document.createElement('canvas');
    const debugCtx = debugCanvas.getContext('2d');

    // Tesseract.js Workers Management
    let workers = [];
    let isTesseractInitialized = false;

    /* ------------------------------
       Common Resolutions
    ------------------------------ */
    const COMMON_RESOLUTIONS = [
        { width: 320, height: 240 },
        { width: 640, height: 480 },
        { width: 800, height: 600 },
        { width: 1024, height: 768 },
        { width: 1280, height: 720 },
        { width: 1280, height: 800 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1600, height: 900 },
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 },
        { width: 3840, height: 2160 },
    ];

    /* ------------------------------
       Function to Show Error Messages
    ------------------------------ */
    function showError(message) {
        console.error(`Error: ${message}`);
        errorMsg.innerText = message;
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 5000);
    }

    /* ------------------------------
       Function to Get Available Cameras
    ------------------------------ */
    async function getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            return videoDevices;
        } catch (err) {
            console.error('Error enumerating devices:', err);
            showError('Unable to access camera devices.');
            return [];
        }
    }

    /* ------------------------------
       Function to Populate Cameras Dropdown
    ------------------------------ */
    async function populateCameras() {
        const cameraSelect = document.getElementById('camera-select');
        cameraSelect.innerHTML = ''; // Clear existing options

        // Add a default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Select Camera';
        cameraSelect.appendChild(defaultOption);

        const cameras = await getAvailableCameras();
        cameras.forEach(camera => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.text = camera.label || `Camera ${cameraSelect.length}`;
            cameraSelect.appendChild(option);
        });

        if (cameras.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.text = 'No cameras found';
            cameraSelect.appendChild(option);
        }
    }

    /* ------------------------------
       Function to Preprocess Image with ROI Filters
    ------------------------------ */
    function preprocessImage(videoCanvas, width, height, filter) {
        const ctx = videoCanvas.getContext('2d');
        ctx.filter = filterMap[filter] || 'none'; // Apply selected filter
        ctx.drawImage(video, 0, 0, width, height);
        ctx.filter = 'none'; // Reset filter for future operations
        console.log(`Image drawn on videoCanvas with filter: ${filter}`);
    }

    /* ------------------------------
       Function to Initialize Camera
    ------------------------------ */
    async function initCamera(resolution = null, cameraId = null) {
        try {
            const videoConstraints = {};

            if (cameraId) {
                // If a specific camera is selected, set deviceId only
                videoConstraints.deviceId = { exact: cameraId };
            } else {
                // If no specific camera is selected, default to environment-facing camera
                videoConstraints.facingMode = { exact: "environment" };
            }

            if (resolution) {
                videoConstraints.width = { exact: resolution.width };
                videoConstraints.height = { exact: resolution.height };
            } else {
                // Set a default resolution if none selected
                videoConstraints.width = { ideal: 1280 };
                videoConstraints.height = { ideal: 720 };
            }

            // Limit frame rate for performance
            videoConstraints.frameRate = { ideal: 60, max: 60 };

            const constraints = {
                video: videoConstraints,
                audio: false
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await video.play();
            console.log('Camera initialized successfully.');

            // After successful camera initialization, check and set reload flag
            if (!sessionStorage.getItem('cameraPermissionsGranted') && !sessionStorage.getItem('cameraReloaded')) {
                sessionStorage.setItem('cameraPermissionsGranted', 'true');
                location.reload();
                return;
            }
        } catch (err) {
            console.error('Camera initialization failed:', err);
            showError('Unable to access the selected camera. Please check permissions or try a different device.');
            throw err;
        }
    }

    /* ------------------------------
       Function to Initialize Tesseract.js Workers with Dynamic Count
    ------------------------------ */
    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    function getOptimalWorkerCount() {
        const cores = navigator.hardwareConcurrency || 2; // Default to 2 if not available
        if (isMobileDevice()) {
            return Math.min(cores, 1); // Limit to 1 worker on mobile
        } else {
            return Math.min(cores, 3); // Allow up to 3 workers on desktops
        }
    }

    const filterMap = {
        'none': 'none',
        'grayscale': 'grayscale(100%)',
        'contrast': 'contrast(1.3)',
        'brightness': 'brightness(1.2)'
    };

    async function initializeTesseract(workersCount) {
        try {
            // Terminate existing workers if any
            if (workers.length > 0) {
                await Promise.all(workers.map(worker => worker.terminate()));
                workers = [];
                console.log('Existing Tesseract.js workers terminated.');
            }

            // Initialize new workers based on the selected count
            for (let i = 0; i < workersCount; i++) {
                // Ensure Tesseract.createWorker exists
                if (typeof Tesseract.createWorker !== 'function') {
                    throw new TypeError('Tesseract.createWorker is not a function. Check the Tesseract.js version and script loading.');
                }

                // Create worker with appropriate options
                const worker = await Tesseract.createWorker({
                    lang: 'eng', // Default language
                    logger: m => console.log(`[Tesseract.js Worker ${i + 1}] ${m.status}: ${Math.round(m.progress * 100)}%`)
                });

                console.log(`Initializing Tesseract.js Worker ${i + 1}...`);

                // Load language data without using the deprecated load method
                await worker.loadLanguage('eng');
                await worker.initialize('eng');
                workers.push(worker);
                console.log(`Tesseract.js Worker ${i + 1} initialized.`);
            }

            isTesseractInitialized = true;
            console.log(`Initialized ${workersCount} Tesseract.js workers.`);
        } catch (err) {
            console.error('Failed to initialize Tesseract.js workers:', err);
            showError('Failed to initialize OCR workers.');
            throw err; // Re-throw to handle it in the caller if necessary
        }
    }

    /* ------------------------------
       Function to Perform OCR Using Workers
    ------------------------------ */
    let isPerformingOCR = false;

    async function performOCR(blob) {
        if (isPerformingOCR) {
            console.warn('OCR is already in progress.');
            return;
        }
        isPerformingOCR = true;

        console.log('Starting OCR process.');
        if (!isTesseractInitialized || workers.length === 0) {
            console.warn('Tesseract.js workers are not initialized.');
            showError('OCR workers are not initialized.');
            isPerformingOCR = false;
            return;
        }

        try {
            const ocrPromises = workers.map(worker => worker.recognize(blob));
            const results = await Promise.all(ocrPromises);

            // Aggregate results
            let aggregatedText = '';
            let totalConfidence = 0;
            results.forEach(result => {
                aggregatedText += result.data.text + '\n';
                totalConfidence += result.data.confidence;
            });

            const averageConfidence = totalConfidence / workers.length;
            console.log(`OCR Average Confidence: ${averageConfidence}`);

            if (averageConfidence >= confidenceThreshold && aggregatedText.trim().length > 0) {
                roiOverlay.style.borderColor = '#2cb67d';
                if (!output.value.includes(aggregatedText.trim())) {
                    output.value += aggregatedText.trim() + '\n';
                    console.log('Text appended to output.');
                }
            } else {
                roiOverlay.style.borderColor = '#d00000';
                console.log('OCR confidence too low or no text detected.');
            }
        } catch (err) {
            console.error('Tesseract.js OCR error:', err);
            showError('An error occurred while processing the image.');
            roiOverlay.style.borderColor = '#d00000';
        } finally {
            isPerformingOCR = false;
        }
    }

    /* ------------------------------
       Function to Process Each Video Frame
    ------------------------------ */
    async function processFrame() {
        if (!scanning) return;

        const now = Date.now();
        const timeSinceLastOcr = now - lastScanTime;
        const desiredInterval = 1000 / ocrFrequency; // in milliseconds

        frameCounter++;
        if (frameCounter < frameSkipping) {
            if (scanning) requestAnimationFrame(processFrame);
            return;
        }
        frameCounter = 0; // Reset frame counter after skipping

        if (timeSinceLastOcr < desiredInterval) {
            if (scanning) requestAnimationFrame(processFrame);
            return;
        }

        lastOcrTime = now;

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            console.warn('Video not ready');
            if (scanning) requestAnimationFrame(processFrame);
            return;
        }

        console.log('Processing a new frame for OCR.');

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        videoCanvas.width = videoWidth;
        videoCanvas.height = videoHeight;

        // Apply selected ROI filter
        preprocessImage(videoCanvas, videoWidth, videoHeight, selectedFilter);

        const overlayRect = roiOverlay.getBoundingClientRect();
        const videoRect = video.getBoundingClientRect();

        const scaleX = videoWidth / videoRect.width;
        const scaleY = videoHeight / videoRect.height;

        const roiX = (overlayRect.left - videoRect.left) * scaleX;
        const roiY = (overlayRect.top - videoRect.top) * scaleY;
        const roiWidth = overlayRect.width * scaleX;
        const roiHeight = overlayRect.height * scaleY;

        console.log(`ROI Coordinates: (${roiX.toFixed(2)}, ${roiY.toFixed(2)}, ${roiWidth.toFixed(2)}, ${roiHeight.toFixed(2)})`);

        // Validate ROI boundaries
        if (roiX < 0 || roiY < 0 || (roiX + roiWidth) > videoWidth || (roiY + roiHeight) > videoHeight) {
            console.warn('ROI is out of video frame bounds.');
            showError('ROI is out of video frame bounds.');
            stopScanning();
            return;
        }

        // Extract ROI
        roiCanvas.width = roiWidth;
        roiCanvas.height = roiHeight;
        const roiCtx = roiCanvas.getContext('2d');
        roiCtx.drawImage(videoCanvas, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
        console.log('ROI extracted.');

        // Scale ROI for better OCR accuracy
        const scaleFactor = 1.5;
        scaledCanvas.width = roiWidth * scaleFactor;
        scaledCanvas.height = roiHeight * scaleFactor;
        const scaledCtx = scaledCanvas.getContext('2d');
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = 'high';
        scaledCtx.drawImage(roiCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        console.log('ROI scaled.');

        // Update Debug Canvas
        debugCanvas.width = scaledCanvas.width;
        debugCanvas.height = scaledCanvas.height;
        debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
        debugCtx.drawImage(scaledCanvas, 0, 0);
        console.log('Debugging canvas updated.');

        // Convert Canvas to Blob for OCR
        scaledCanvas.toBlob(async (blob) => {
            if (blob && scanning) {
                console.log('Blob created for OCR.');
                await performOCR(blob);
            } else {
                console.warn('Blob conversion failed or scanning stopped.');
            }
            if (scanning) requestAnimationFrame(processFrame);
        }, 'image/png');
    }

    /* ------------------------------
       Function to Start Scanning
    ------------------------------ */
    async function startScanning() {
        if (scanning) return;

        // Initialize the camera
        startButton.disabled = true;
        stopButton.disabled = true;
        restartButton.style.display = 'none'; // Hide Restart button when starting
        startButton.innerText = 'Starting...';
        console.log('Initializing camera...');
        try {
            // Get the selected camera device ID
            const cameraSelect = document.getElementById('camera-select');
            const selectedCameraId = cameraSelect.value || null;

            // Get the selected resolution
            const resolutionSelect = document.getElementById('resolution-select');
            const selectedResolutionValue = resolutionSelect.value;
            let selectedResolution = null;
            if (selectedResolutionValue) {
                const [width, height] = selectedResolutionValue.split('x').map(Number);
                selectedResolution = { width, height };
            }

            await initCamera(selectedResolution, selectedCameraId);
        } catch (err) {
            startButton.disabled = false;
            stopButton.disabled = true;
            startButton.innerText = 'Start Scanner';
            return;
        }

        // Check if the page was just reloaded after granting camera permissions
        if (sessionStorage.getItem('cameraReloaded')) {
            // Remove the flag to prevent multiple reloads
            sessionStorage.removeItem('cameraReloaded');
        }

        // Determine optimal worker count based on device type
        const workersCount = getOptimalWorkerCount();
        console.log(`Determined workers count: ${workersCount}`);
        try {
            await initializeTesseract(workersCount);
        } catch (err) {
            console.error('Failed to initialize Tesseract.js workers:', err);
            showError('Failed to initialize OCR workers.');
            startButton.disabled = false;
            stopButton.disabled = true;
            startButton.innerText = 'Start Scanner';
            return;
        }

        // Retrieve Frame Skipping and Frequency Settings
        frameSkipping = parseInt(frameSkippingSelect.value);
        ocrFrequency = parseFloat(frequencySelect.value);
        console.log(`Frame Skipping set to: Every ${frameSkipping} frame(s)`);
        console.log(`OCR Frequency set to: ${ocrFrequency} Hz`);

        // Update OCR Info Text
        updateOcrInfo();

        scanning = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        startButton.innerText = 'Scanning...';
        output.value = '';
        console.log('Scanning started.');

        requestAnimationFrame(processFrame);
    }

    /* ------------------------------
       Function to Stop Scanning (Full Stop)
    ------------------------------ */
    async function stopScanning() {
        if (!scanning) return;
        scanning = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        restartButton.style.display = 'block'; // Show Restart button when stopped
        startButton.innerText = 'Start Scanner';
        roiOverlay.style.borderColor = '#00b4d8';
        console.log('Scanning stopped.');

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        // Terminate Tesseract.js workers
        if (workers.length > 0) {
            await Promise.all(workers.map(worker => worker.terminate()));
            workers = [];
            isTesseractInitialized = false;
            console.log('Tesseract.js workers terminated.');
        }

        debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
        console.log('Camera stream stopped and debugging canvas cleared.');
    }

    /* ------------------------------
       Function to Pause Scanning (For OCR Capture)
    ------------------------------ */
    async function pauseScanning() {
        if (!scanning) return;
        scanning = false;
        startButton.disabled = true;
        stopButton.disabled = true;
        restartButton.style.display = 'block'; // Show Restart button when paused
        startButton.innerText = 'Start Scanner';
        roiOverlay.style.borderColor = '#00b4d8';
        console.log('Scanning paused.');

        // Note: Do not terminate workers or stop the camera
    }

    /* ------------------------------
       Function to Capture Frame and Perform OCR
    ------------------------------ */
    async function captureFrameAndPerformOCR() {
        if (!scanning) return;

        console.log('Capturing frame for OCR.');

        // **Call pauseScanning to pause the scanner without terminating workers**
        await pauseScanning();

        // Capture the current frame from video
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        videoCanvas.width = videoWidth;
        videoCanvas.height = videoHeight;
        const ctx = videoCanvas.getContext('2d');
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        console.log('Frame captured.');

        // Extract ROI
        const overlayRect = roiOverlay.getBoundingClientRect();
        const videoRect = video.getBoundingClientRect();

        const scaleX = videoWidth / videoRect.width;
        const scaleY = videoHeight / videoRect.height;

        const roiX = (overlayRect.left - videoRect.left) * scaleX;
        const roiY = (overlayRect.top - videoRect.top) * scaleY;
        const roiWidth = overlayRect.width * scaleX;
        const roiHeight = overlayRect.height * scaleY;

        console.log(`ROI Coordinates: (${roiX.toFixed(2)}, ${roiY.toFixed(2)}, ${roiWidth.toFixed(2)}, ${roiHeight.toFixed(2)})`);

        // Validate ROI boundaries
        if (roiX < 0 || roiY < 0 || (roiX + roiWidth) > videoWidth || (roiY + roiHeight) > videoHeight) {
            console.warn('ROI is out of video frame bounds.');
            showError('ROI is out of video frame bounds.');
            return;
        }

        // Extract ROI
        roiCanvas.width = roiWidth;
        roiCanvas.height = roiHeight;
        const roiCtx = roiCanvas.getContext('2d');
        roiCtx.drawImage(videoCanvas, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
        console.log('ROI extracted.');

        // Scale ROI for better OCR accuracy
        const scaleFactor = 1.5;
        scaledCanvas.width = roiWidth * scaleFactor;
        scaledCanvas.height = roiHeight * scaleFactor;
        const scaledCtx = scaledCanvas.getContext('2d');
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = 'high';
        scaledCtx.drawImage(roiCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        console.log('ROI scaled.');

        // Update Debug Canvas
        debugCanvas.width = scaledCanvas.width;
        debugCanvas.height = scaledCanvas.height;
        debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
        debugCtx.drawImage(scaledCanvas, 0, 0);
        console.log('Debugging canvas updated.');

        // Convert Canvas to Blob for OCR
        scaledCanvas.toBlob(async (blob) => {
            if (blob) {
                console.log('Blob created for OCR.');
                await performOCR(blob);
            } else {
                console.warn('Blob conversion failed.');
            }
            // Scanning remains paused; user can restart manually
        }, 'image/png');
    }

    /* ------------------------------
       Function to Request Focus (Tap-to-Focus) - Repurposed
    ------------------------------ */
    async function requestFocus() {
        // Instead of attempting to focus, capture frame and perform OCR
        await captureFrameAndPerformOCR();
    }

    /* ------------------------------
       Function to Handle Resolution Changes
    ------------------------------ */
    function handleResolutionChange() {
        const selectedResolution = getSelectedResolution();
        if (!selectedResolution) return;

        console.log(`Selected resolution: ${selectedResolution.width}x${selectedResolution.height}`);

        // Store the current scanning state
        const wasScanning = scanning;

        // Stop current scanning if active
        if (wasScanning) {
            stopScanning();
        }

        // Stop current stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        if (wasScanning) {
            // Get the selected camera device ID
            const cameraSelect = document.getElementById('camera-select');
            const selectedCameraId = cameraSelect.value || null;

            // Re-initialize camera with selected resolution and camera
            initCamera(selectedResolution, selectedCameraId).then(() => {
                console.log('Camera re-initialized with new resolution.');
                if (wasScanning) {
                    startScanning();
                }
            }).catch(err => {
                console.error('Failed to re-initialize camera with selected resolution:', err);
                showError('Failed to set the selected resolution.');
            });
        } else {
            // If not scanning, do not initialize camera
            console.log('Resolution changed, but scanning is not active. Camera not initialized.');
        }
    }

    /* ------------------------------
       Function to Handle Camera Changes
    ------------------------------ */
    function handleCameraChange() {
        const selectedCameraId = document.getElementById('camera-select').value;
        if (selectedCameraId === '') return; // Do nothing if default option is selected

        console.log(`Selected camera ID: ${selectedCameraId}`);

        // Store the current scanning state
        const wasScanning = scanning;

        // Stop current scanning if active
        if (wasScanning) {
            stopScanning();
        }

        // Stop current stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        if (wasScanning) {
            // Get the selected resolution
            const selectedResolution = getSelectedResolution();

            // Re-initialize camera with selected camera and resolution
            initCamera(selectedResolution, selectedCameraId).then(() => {
                console.log('Camera re-initialized with new camera.');
                if (wasScanning) {
                    startScanning();
                }
            }).catch(err => {
                console.error('Failed to re-initialize camera with selected camera:', err);
                showError('Failed to set the selected camera.');
            });
        } else {
            // If not scanning, do not initialize camera
            console.log('Camera changed, but scanning is not active. Camera not initialized.');
        }
    }

    /* ------------------------------
       Function to Handle Workers Changes
    ------------------------------ */
    async function handleWorkersChange() {
        const selectedWorkers = parseInt(workersSelect.value);
        console.log(`Selected workers count: ${selectedWorkers}`);

        if (isTesseractInitialized) {
            // Inform the user about the worker count change
            showTemporaryMessage('Updating workers...', 2000);
            console.log('Updating workers...');

            try {
                // Store whether scanning was active
                const wasScanning = scanning;

                // Stop scanning if active
                if (wasScanning) {
                    await stopScanning();
                }

                // Reinitialize workers with the new count
                await initializeTesseract(selectedWorkers);

                // Restart scanning if it was active before
                if (wasScanning) {
                    await startScanning();
                }

                console.log(`Reinitialized Tesseract.js with ${selectedWorkers} workers.`);
            } catch (err) {
                console.error('Failed to reinitialize Tesseract.js workers:', err);
                showError('Failed to reinitialize OCR workers.');
            }
        } else {
            // If workers are not initialized yet, simply initialize them
            try {
                await initializeTesseract(selectedWorkers);
                console.log(`Initialized Tesseract.js with ${selectedWorkers} workers.`);
            } catch (err) {
                console.error('Failed to initialize Tesseract.js workers:', err);
                showError('Failed to initialize OCR workers.');
            }
        }
    }

    /* ------------------------------
       Function to Handle ROI Filters Changes
    ------------------------------ */
    function handleROIFiltersChange() {
        selectedFilter = roiFiltersSelect.value;
        console.log(`Selected ROI Filter: ${selectedFilter}`);
    }

    /* ------------------------------
       Function to Handle Frame Skipping Changes
    ------------------------------ */
    function handleFrameSkippingChange() {
        frameSkipping = parseInt(frameSkippingSelect.value);
        console.log(`Frame Skipping set to: Every ${frameSkipping} frame(s)`);
        updateOcrInfo();
    }

    /* ------------------------------
       Function to Handle Frequency Changes
    ------------------------------ */
    function handleFrequencyChange() {
        ocrFrequency = parseFloat(frequencySelect.value);
        console.log(`OCR Frequency set to: ${ocrFrequency} Hz`);
        updateOcrInfo();
    }

    /* ------------------------------
       Function to Handle Confidence Threshold Changes
    ------------------------------ */
    confidenceThresholdInput.addEventListener('change', function() {
        let value = parseInt(this.value, 10);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 100) value = 100;
        this.value = value;
        confidenceThreshold = value;
        console.log(`Confidence threshold set to: ${confidenceThreshold}`);
    });

    /* ------------------------------
       Function to Show Temporary Messages
    ------------------------------ */
    function showTemporaryMessage(message, duration) {
        const tempMsg = document.createElement('div');
        tempMsg.innerText = message;
        tempMsg.style.position = 'fixed';
        tempMsg.style.bottom = '220px';
        tempMsg.style.left = '50%';
        tempMsg.style.transform = 'translateX(-50%)';
        tempMsg.style.backgroundColor = 'rgba(0,0,0,0.75)';
        tempMsg.style.color = '#fff';
        tempMsg.style.padding = '8px 16px';
        tempMsg.style.borderRadius = '4px';
        tempMsg.style.zIndex = '1004';
        document.body.appendChild(tempMsg);
        setTimeout(() => {
            document.body.removeChild(tempMsg);
        }, duration);
    }

    /* ------------------------------
       Function to Get Selected Resolution
    ------------------------------ */
    function getSelectedResolution() {
        const resolutionSelect = document.getElementById('resolution-select');
        const selectedValue = resolutionSelect.value;
        if (selectedValue === '') return null;
        const [width, height] = selectedValue.split('x').map(Number);
        return { width, height };
    }

    /* ------------------------------
       Function to Update OCR Info Text
    ------------------------------ */
    function updateOcrInfo() {
        // Assume approximate FPS of 60
        const approximateFPS = 60;
        const frameBasedFrequency = approximateFPS / frameSkipping;
        const effectiveFrequency = Math.min(frameBasedFrequency, ocrFrequency);
        ocrInfo.innerText = `Effective OCR Scans per Second: ${effectiveFrequency.toFixed(2)} Hz`;
    }

    /* ------------------------------
       Event Listeners
    ------------------------------ */
    roiOverlay.addEventListener('click', requestFocus);
    startButton.addEventListener('click', startScanning);
    stopButton.addEventListener('click', stopScanning);
    restartButton.addEventListener('click', startScanning); // Restart uses startScanning

    document.getElementById('resolution-select').addEventListener('change', handleResolutionChange);
    document.getElementById('camera-select').addEventListener('change', handleCameraChange);
    workersSelect.addEventListener('change', handleWorkersChange);
    roiFiltersSelect.addEventListener('change', handleROIFiltersChange);
    frameSkippingSelect.addEventListener('change', handleFrameSkippingChange);
    frequencySelect.addEventListener('change', handleFrequencyChange);

    /* ------------------------------
       Initial Population of Cameras
    ------------------------------ */
    (async function populateInitialCameras() {
        try {
            await populateCameras();
        } catch (err) {
            console.error('Failed to populate cameras:', err);
        }
    })();

    /* ------------------------------
       Cleanup on Page Unload
    ------------------------------ */
    window.addEventListener('beforeunload', async () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (workers.length > 0) {
            await Promise.all(workers.map(worker => worker.terminate()));
            workers = [];
        }
    });

    /* ------------------------------
       WebGL Integration within Side Menu
    ------------------------------ */
    (function() {
        const glCanvas = document.getElementById('webglCanvas');
        const toggleButton = document.getElementById('toggleWebglButton');
        let gl = null;
        let shaderProgram = null;
        let vertexBuffer = null;

        // Vertex Shader Source
        const vertexShaderSource = `
            attribute vec3 coordinates;
            void main(void) {
                gl_Position = vec4(coordinates, 1.0);
            }
        `;

        // Fragment Shader Source
        const fragmentShaderSource = `
            void main(void) {
                gl_FragColor = vec4(0.0, 0.5, 1.0, 1.0);
            }
        `;

        // Function to initialize WebGL
        function initWebGL() {
            gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');

            if (!gl) {
                console.error('Unable to initialize WebGL.');
                showError('WebGL is not supported by your browser.');
                return;
            }

            // Set clear color to black, fully opaque
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            // Clear the color buffer with specified clear color
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Initialize shaders
            initShaders();

            // Initialize buffers
            initBuffers();

            // Draw the scene
            drawScene();
        }

        // Function to compile shader
        function compileShader(source, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const info = gl.getShaderInfoLog(shader);
                console.error('Could not compile WebGL shader. \n\n' + info);
                showError('Failed to compile WebGL shader.');
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        // Function to initialize shaders
        function initShaders() {
            const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
            const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

            shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                const info = gl.getProgramInfoLog(shaderProgram);
                console.error('Could not initialize WebGL shader program. \n\n' + info);
                showError('Failed to initialize WebGL shader program.');
                return;
            }

            gl.useProgram(shaderProgram);

            shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'coordinates');
            gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
        }

        // Function to initialize buffers
        function initBuffers() {
            vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

            // Define a triangle
            const vertices = [
                0.0,  1.0,  0.0,
               -1.0, -1.0,  0.0,
                1.0, -1.0,  0.0
            ];

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        }

        // Function to draw the scene
        function drawScene() {
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        // Function to toggle WebGL canvas visibility
        toggleButton.addEventListener('click', function() {
            if (glCanvas.style.display === 'none' || glCanvas.style.display === '') {
                glCanvas.style.display = 'block';
                toggleButton.innerText = 'Hide WebGL';
                initWebGL();
            } else {
                glCanvas.style.display = 'none';
                toggleButton.innerText = 'Show WebGL';
                // Optionally, release WebGL context to free resources
                if (gl) {
                    gl.getExtension('WEBGL_lose_context')?.loseContext();
                    gl = null;
                    shaderProgram = null;
                    vertexBuffer = null;
                }
            }
        });

        // Initialize WebGL on load if needed
        // Uncomment the following line if you want to initialize WebGL by default
        // initWebGL();
    })();

    /* ------------------------------
       FPS Counter Functionality
    ------------------------------ */
    (function() {
        const fpsCounter = document.getElementById('fpsCounter');
        let frameCount = 0;
        let fps = 0;
        let lastTime = performance.now();

        function updateFPS() {
            const now = performance.now();
            frameCount++;
            if (now - lastTime >= 1000) {
                fps = frameCount;
                frameCount = 0;
                lastTime = now;
                fpsCounter.innerText = `FPS: ${fps}`;
            }
            requestAnimationFrame(updateFPS);
        }

        requestAnimationFrame(updateFPS);
    })();
})();
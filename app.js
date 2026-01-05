/**
 * MAIN APPLICATION
 */

let chart;
let currentSymbol = 'XAUUSD';
let currentTimeframe = 300;

window.addEventListener('load', async () => {
    console.log('🚀 Initializing MzanziFx...');
    
    // Initialize chart first
    chart = new ChartRenderer('chart');
    
    try {
        // Show loading
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('hidden');
        
        // Connect to Deriv
        console.log('📡 Connecting to Deriv...');
        await dataManager.connect();
        
        // Load chart data
        console.log('📊 Loading chart data...');
        loadChartData();
        
        // Start signal tracker
        console.log('📈 Starting tracker...');
        signalTracker.startTracking();
        
        // Check if auto-generate is enabled
        const autoGenerate = localStorage.getItem('autoGenerate') === 'true';
        if (autoGenerate) {
            console.log('🤖 Auto-generate enabled');
            startAutoGenerate();
        }
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('⚠️ Connection failed. Retrying...');
        setTimeout(() => window.location.reload(), 3000);
    }
});

function loadChartData() {
    console.log(`📊 Loading ${currentSymbol} ${dataManager.getTimeframeName(currentTimeframe)}`);
    
    dataManager.loadData(currentSymbol, currentTimeframe, (data, isLiveUpdate) => {
        if (isLiveUpdate) {
            // Update last candle
            if (data && data.length > 0) {
                chart.updateLastCandle(data[0]);
                updatePriceDisplay();
                
                // Analyze and draw SMC on every update
                analyzeSMC();
            }
        } else {
            // Set full chart data
            if (data && data.length > 0) {
                console.log(`✅ Got ${data.length} candles`);
                chart.setData(data);
                
                // Hide loading
                const loading = document.getElementById('loading');
                if (loading) loading.classList.add('hidden');
                
                updatePriceDisplay();
                
                // Initial SMC analysis
                analyzeSMC();
            } else {
                console.warn('⚠️ No data received');
            }
        }
    });
}

/**
 * Analyze SMC and update chart drawings (SYNCHRONOUS - no await)
 */
function analyzeSMC() {
    try {
        const candles = dataManager.getChartData();
        if (!candles || candles.length < 50) return;
        
        // Run analysis synchronously (just for drawing, not signal generation)
        smcAnalyzer.candles = candles;
        smcAnalyzer.identifyMarketStructure();
        smcAnalyzer.findOrderBlocks();
        smcAnalyzer.detectFairValueGaps();
        smcAnalyzer.findLiquidityZones();
        smcAnalyzer.drawTrendlines();
        smcAnalyzer.findSupportResistance();
        smcAnalyzer.calculatePremiumDiscount();
        smcAnalyzer.analyzeWyckoff();
        
        // Get drawable elements
        const drawings = smcAnalyzer.getDrawables();
        
        // Update chart with drawings
        if (chart && drawings) {
            chart.updateDrawings(drawings);
            console.log('📊 SMC drawings updated');
        }
    } catch (error) {
        console.error('❌ SMC drawing error:', error);
    }
}

function updatePriceDisplay() {
    try {
        const currentPrice = dataManager.getCurrentPrice();
        const priceChange = dataManager.getPriceChange();
        const decimals = dataManager.getDecimals(currentSymbol);
        
        if (currentPrice) {
            const priceEl = document.getElementById('currentPrice');
            if (priceEl) {
                priceEl.textContent = currentPrice.toFixed(decimals);
                priceEl.style.color = priceChange.change >= 0 ? '#4caf50' : '#f44336';
            }
            
            const changeEl = document.getElementById('priceChange');
            if (changeEl) {
                const sign = priceChange.change >= 0 ? '+' : '';
                changeEl.textContent = `${sign}${priceChange.change.toFixed(decimals)} (${priceChange.percent.toFixed(2)}%)`;
                changeEl.className = priceChange.change >= 0 ? 'price-change' : 'price-change negative';
            }
        }
    } catch (error) {
        console.error('❌ Error updating price:', error);
    }
}

function changeSymbol() {
    const select = document.getElementById('symbolSelect');
    currentSymbol = select.value;
    
    console.log(`🔄 Changing to ${currentSymbol}`);
    
    // Unsubscribe from old symbol
    dataManager.unsubscribe();
    
    // Show loading
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('hidden');
    
    // Load new symbol
    loadChartData();
    
    showNotification(`✅ Switched to ${currentSymbol}`);
}

function selectTimeframe(timeframe) {
    currentTimeframe = timeframe;
    
    console.log(`🔄 Changing to ${dataManager.getTimeframeName(timeframe)}`);
    
    // Update active state
    document.querySelectorAll('.tf-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.tf) === timeframe) {
            item.classList.add('active');
        }
    });
    
    // Hide ring
    const ring = document.getElementById('timeframeRing');
    if (ring) ring.classList.remove('show');
    
    // Reload data
    dataManager.unsubscribe();
    
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('hidden');
    
    loadChartData();
    
    showNotification(`✅ ${dataManager.getTimeframeName(timeframe)}`);
}

function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    if (page === 'signals') {
        window.location.href = 'signals.html';
    } else if (page === 'settings') {
        window.location.href = 'settings.html';
    }
}

function zoomIn() {
    if (chart) {
        chart.zoomIn();
        showNotification('🔍 Zoomed In');
    }
}

function zoomOut() {
    if (chart) {
        chart.zoomOut();
        showNotification('🔍 Zoomed Out');
    }
}

function resetView() {
    if (chart) {
        chart.resetZoom();
        showNotification('↩️ View Reset');
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 2000);
}

/**
 * Generate trading signal with progress display
 */
async function generateSignal() {
    const btnTop = document.getElementById('generateBtnTop');
    const btnBottom = document.getElementById('generateBtn');
    
    if (btnTop) btnTop.classList.add('loading');
    if (btnBottom) btnBottom.classList.add('loading');
    
    // Set up progress callback
    smcAnalyzer.setProgressCallback((percent, message) => {
        showNotification(`${percent}% - ${message}`);
    });
    
    showNotification('0% - Starting analysis...');
    
    try {
        const candles = dataManager.getChartData();
        
        if (!candles || candles.length < 100) {
            showNotification('⚠️ Not enough data');
            if (btnTop) btnTop.classList.remove('loading');
            if (btnBottom) btnBottom.classList.remove('loading');
            return;
        }
        
        console.log('🎯 Starting professional analysis with progress...');
        
        // Run analysis with progress tracking
        const signal = await smcAnalyzer.analyze(candles, currentSymbol, currentTimeframe);
        
        if (signal) {
            console.log('✅ Signal generated:', signal.action, signal.confidence + '%');
            
            // Save to Firebase
            await signalTracker.saveSignal(signal);
            
            // Show notification
            showSignalNotification(signal);
            
            showNotification(`✅ ${signal.action} signal! (${signal.confidence}%)`);
        } else {
            console.log('⚠️ No valid signal');
            showNotification('⚠️ No valid signal found');
        }
    } catch (error) {
        console.error('❌ Signal generation error:', error);
        showNotification('❌ Generation failed: ' + error.message);
    }
    
    if (btnTop) btnTop.classList.remove('loading');
    if (btnBottom) btnBottom.classList.remove('loading');
}

/**
 * Show signal notification with vibration and sound
 */
function showSignalNotification(signal) {
    // Vibrate if supported
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 400]);
    }
    
    // Play notification sound
    playNotificationSound();
    
    // Show rich notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎯 New Trading Signal!', {
            body: `${signal.action} ${signal.symbol} at ${signal.entry}\nConfidence: ${signal.confidence}%`,
            requireInteraction: true
        });
    }
}

/**
 * Play notification sound
 */
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('🔇 Sound not available');
    }
}

/**
 * Auto-generate signals
 */
let autoGenerateInterval = null;

function startAutoGenerate() {
    if (autoGenerateInterval) return;
    
    console.log('🤖 Auto-generate started');
    showNotification('🤖 Auto-generate ON');
    
    // Generate immediately
    generateSignal();
    
    // Then every 5 minutes
    autoGenerateInterval = setInterval(() => {
        console.log('🔄 Auto-generating...');
        generateSignal();
    }, 5 * 60 * 1000);
    
    localStorage.setItem('autoGenerate', 'true');
}

function stopAutoGenerate() {
    if (autoGenerateInterval) {
        clearInterval(autoGenerateInterval);
        autoGenerateInterval = null;
    }
    
    console.log('🛑 Auto-generate stopped');
    showNotification('🛑 Auto-generate OFF');
    localStorage.setItem('autoGenerate', 'false');
}

/**
 * Request notification permission
 */
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    if (dataManager) {
        dataManager.disconnect();
    }
});

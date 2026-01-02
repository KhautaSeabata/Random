/**
 * MAIN APPLICATION
 * Coordinates data manager and chart renderer
 */

let chart;
let currentSymbol = 'XAUUSD';
let currentTimeframe = 300;

// Initialize on load
window.addEventListener('load', async () => {
    console.log('🚀 Initializing app...');
    
    // Initialize chart
    chart = new ChartRenderer('chart');
    
    // Connect to data source
    try {
        document.getElementById('loading').classList.remove('hidden');
        await dataManager.connect();
        loadChartData();
    } catch (error) {
        console.error('Failed to connect:', error);
        showNotification('Connection failed. Retrying...');
        setTimeout(() => window.location.reload(), 3000);
    }
});

/**
 * Load chart data for current symbol and timeframe
 */
function loadChartData() {
    console.log(`📊 Loading ${currentSymbol} ${dataManager.getTimeframeName(currentTimeframe)}`);
    
    dataManager.loadData(currentSymbol, currentTimeframe, (data, isLiveUpdate) => {
        if (isLiveUpdate) {
            // Update last candle
            chart.updateLastCandle(data[0]);
            updatePriceDisplay();
        } else {
            // Set full chart data
            chart.setData(data);
            document.getElementById('loading').classList.add('hidden');
            updatePriceDisplay();
        }
    });
}

/**
 * Update price display in top bar
 */
function updatePriceDisplay() {
    const currentPrice = dataManager.getCurrentPrice();
    const priceChange = dataManager.getPriceChange();
    const decimals = dataManager.getDecimals(currentSymbol);
    
    if (currentPrice) {
        document.getElementById('currentPrice').textContent = currentPrice.toFixed(decimals);
        
        const changeEl = document.getElementById('priceChange');
        const sign = priceChange.change >= 0 ? '+' : '';
        changeEl.textContent = `${sign}${priceChange.change.toFixed(decimals)} (${priceChange.percent.toFixed(2)}%)`;
        changeEl.className = priceChange.change >= 0 ? 'price-change' : 'price-change negative';
        
        // Update current price color
        document.getElementById('currentPrice').style.color = priceChange.change >= 0 ? '#4caf50' : '#f44336';
    }
}

/**
 * Change symbol
 */
function changeSymbol() {
    const select = document.getElementById('symbolSelect');
    currentSymbol = select.value;
    
    // Unsubscribe from old symbol
    dataManager.unsubscribe();
    
    // Load new symbol
    document.getElementById('loading').classList.remove('hidden');
    loadChartData();
    
    showNotification(`Switched to ${currentSymbol}`);
}

/**
 * Select timeframe from ring
 */
function selectTimeframe(timeframe) {
    currentTimeframe = timeframe;
    
    // Update active state
    document.querySelectorAll('.tf-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.tf) === timeframe) {
            item.classList.add('active');
        }
    });
    
    // Hide ring
    document.getElementById('timeframeRing').classList.remove('show');
    
    // Reload data
    dataManager.unsubscribe();
    document.getElementById('loading').classList.remove('hidden');
    loadChartData();
    
    showNotification(`Changed to ${dataManager.getTimeframeName(timeframe)}`);
}

/**
 * Navigate between pages
 */
function navigate(page) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    if (page === 'signals') {
        window.location.href = 'signals.html';
    } else if (page === 'settings') {
        window.location.href = 'settings.html';
    }
}

/**
 * Show notification
 */
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    dataManager.disconnect();
});

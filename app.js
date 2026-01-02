/**
 * MAIN APPLICATION
 */

let chart;
let currentSymbol = 'XAUUSD';
let currentTimeframe = 300;

window.addEventListener('load', async () => {
    console.log('🚀 Initializing MzanziFx...');
    
    chart = new ChartRenderer('chart');
    
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

function loadChartData() {
    console.log(`📊 Loading ${currentSymbol}`);
    
    dataManager.loadData(currentSymbol, currentTimeframe, (data, isLiveUpdate) => {
        if (isLiveUpdate) {
            chart.updateLastCandle(data[0]);
            updatePriceDisplay();
        } else {
            chart.setData(data);
            document.getElementById('loading').classList.add('hidden');
            updatePriceDisplay();
        }
    });
}

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
        document.getElementById('currentPrice').style.color = priceChange.change >= 0 ? '#4caf50' : '#f44336';
    }
}

function changeSymbol() {
    const select = document.getElementById('symbolSelect');
    currentSymbol = select.value;
    dataManager.unsubscribe();
    document.getElementById('loading').classList.remove('hidden');
    loadChartData();
    showNotification(`Switched to ${currentSymbol}`);
}

function selectTimeframe(timeframe) {
    currentTimeframe = timeframe;
    
    document.querySelectorAll('.tf-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.tf) === timeframe) {
            item.classList.add('active');
        }
    });
    
    document.getElementById('timeframeRing').classList.remove('show');
    dataManager.unsubscribe();
    document.getElementById('loading').classList.remove('hidden');
    loadChartData();
    showNotification(`Changed to ${dataManager.getTimeframeName(timeframe)}`);
}

function navigate(page) {
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
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 2000);
}

window.addEventListener('beforeunload', () => {
    dataManager.disconnect();
});

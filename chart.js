/**
 * CHART RENDERER - VERSION 5.13
 * - Centered S/R labels
 * - No trendlines
 * - Current price line
 */

class TradingChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.visible = [];
        this.startIndex = 0;
        this.candleWidth = 8;
        this.candleSpacing = 2;
        this.panOffset = 0;
        this.isPanning = false;
        this.lastX = 0;
        this.drawings = {};
        this.symbol = 'XAUUSD';
        
        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    setupEventListeners() {
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Mouse events for desktop
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        
        // Prevent scrolling on canvas
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    handleTouchStart(e) {
        this.isPanning = true;
        this.lastX = e.touches[0].clientX;
    }

    handleTouchMove(e) {
        if (!this.isPanning) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.lastX;
        this.pan(deltaX);
        this.lastX = touch.clientX;
    }

    handleTouchEnd() {
        this.isPanning = false;
    }

    handleMouseDown(e) {
        this.isPanning = true;
        this.lastX = e.clientX;
    }

    handleMouseMove(e) {
        if (!this.isPanning) return;
        const deltaX = e.clientX - this.lastX;
        this.pan(deltaX);
        this.lastX = e.clientX;
    }

    handleMouseUp() {
        this.isPanning = false;
    }

    pan(deltaX) {
        const candlesPerScreen = Math.floor(this.canvas.width / (this.candleWidth + this.candleSpacing));
        const panSpeed = 0.5;
        const candlesDelta = Math.round(deltaX * panSpeed);
        
        this.startIndex = Math.max(0, Math.min(this.data.length - candlesPerScreen, this.startIndex - candlesDelta));
        this.draw();
    }

    updateData(candles) {
        this.data = candles;
        const rect = this.canvas.getBoundingClientRect();
        const candlesPerScreen = Math.floor(rect.width / (this.candleWidth + this.candleSpacing));
        
        if (this.startIndex === 0) {
            this.startIndex = Math.max(0, this.data.length - candlesPerScreen);
        }
        
        this.draw();
    }

    updateDrawings(drawings) {
        this.drawings = drawings || {};
        this.draw();
    }

    updateSymbol(symbol) {
        this.symbol = symbol;
    }

    zoomIn() {
        this.candleWidth = Math.min(20, this.candleWidth + 2);
        this.draw();
    }

    zoomOut() {
        this.candleWidth = Math.max(4, this.candleWidth - 2);
        this.draw();
    }

    resetView() {
        this.candleWidth = 8;
        const rect = this.canvas.getBoundingClientRect();
        const candlesPerScreen = Math.floor(rect.width / (this.candleWidth + this.candleSpacing));
        this.startIndex = Math.max(0, this.data.length - candlesPerScreen);
        this.draw();
    }

    draw() {
        if (!this.data || this.data.length === 0) return;

        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const padding = 60;

        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, width, height);

        const candlesPerScreen = Math.floor(width / (this.candleWidth + this.candleSpacing));
        this.visible = this.data.slice(this.startIndex, this.startIndex + candlesPerScreen);

        if (this.visible.length === 0) return;

        const minPrice = Math.min(...this.visible.map(c => c.low));
        const maxPrice = Math.max(...this.visible.map(c => c.high));
        const priceRange = maxPrice - minPrice;
        const chartHeight = height - padding * 2;

        const priceToY = (price) => {
            return padding + (maxPrice - price) / priceRange * chartHeight;
        };

        const indexToX = (index) => {
            return (index - this.startIndex) * (this.candleWidth + this.candleSpacing);
        };

        // Draw grid
        this.drawGrid(width, height, minPrice, maxPrice);

        // Draw SMC elements (S/R only)
        this.drawSMCElements(this.visible, width, height, minPrice, maxPrice, this.candleWidth, priceToY, indexToX, this.startIndex);

        // Draw candles
        this.visible.forEach((candle, i) => {
            const x = indexToX(i);
            const color = candle.close >= candle.open ? '#4caf50' : '#f44336';
            
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            
            // Wick
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x + this.candleWidth / 2, highY);
            this.ctx.lineTo(x + this.candleWidth / 2, lowY);
            this.ctx.stroke();
            
            // Body
            const bodyHeight = Math.abs(closeY - openY);
            const bodyY = Math.min(openY, closeY);
            
            if (bodyHeight < 1) {
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x, openY);
                this.ctx.lineTo(x + this.candleWidth, openY);
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, bodyY, this.candleWidth, bodyHeight);
            }
        });

        // Draw current price line (blue dotted)
        this.drawCurrentPriceLine(width, height, priceToY);
    }

    drawCurrentPriceLine(width, height, priceToY) {
        if (!this.data || this.data.length === 0) return;
        
        const currentPrice = this.data[this.data.length - 1].close;
        const y = priceToY(currentPrice);
        
        // Blue dotted line
        this.ctx.strokeStyle = '#2196f3';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Price label on the right
        const decimals = this.getDecimals();
        const priceText = currentPrice.toFixed(decimals);
        
        this.ctx.font = 'bold 11px -apple-system, sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        
        const metrics = this.ctx.measureText(priceText);
        const padding = 4;
        const boxWidth = metrics.width + padding * 2;
        const boxHeight = 18;
        const boxX = width - boxWidth;
        const boxY = y - boxHeight / 2;
        
        this.ctx.fillStyle = '#2196f3';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(priceText, width - padding, y);
    }

    getDecimals() {
        const symbol = this.symbol || 'XAUUSD';
        const decimalMap = {
            'XAUUSD': 2,
            'BTCUSD': 2,
            'USDJPY': 2,
            'EURUSD': 4,
            'GBPUSD': 4,
            'USDCAD': 4,
            'AUDUSD': 4,
            'AUDCAD': 4
        };
        return decimalMap[symbol] || 4;
    }

    drawGrid(width, height, minPrice, maxPrice) {
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
            
            const price = maxPrice - (maxPrice - minPrice) * (i / 5);
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(price.toFixed(5), width - 5, y - 5);
        }
    }

    drawSMCElements(visible, width, height, minPrice, maxPrice, candleWidth, priceToY, indexToX, startIndex) {
        // 1. Premium/Discount Zones
        if (this.drawings.premiumDiscount) {
            this.drawPremiumDiscount(this.drawings.premiumDiscount, width, height, priceToY);
        }
        
        // 2. Support/Resistance (CENTERED LABELS)
        if (this.drawings.supportResistance) {
            this.drawings.supportResistance.forEach(sr => {
                this.drawSupportResistance(sr, width, priceToY);
            });
        }
        
        // 3. Trendlines - DISABLED
        // NO TRENDLINE DRAWING IN V5.13
    }

    drawSupportResistance(sr, width, priceToY) {
        const y = priceToY(sr.price);
        const color = sr.type === 'support' ? '#4caf50' : '#f44336';
        
        // Draw dotted line
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw CENTERED label on top of line
        const labelText = `${sr.type.toUpperCase()} (${sr.touches}x)`;
        this.ctx.font = 'bold 12px -apple-system, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        
        const metrics = this.ctx.measureText(labelText);
        const padding = 6;
        const boxWidth = metrics.width + padding * 2;
        const boxHeight = 20;
        const centerX = width / 2;
        const boxX = centerX - (boxWidth / 2);
        const boxY = y - boxHeight - 3;
        
        // Black background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Colored border
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Centered text
        this.ctx.fillStyle = color;
        this.ctx.fillText(labelText, centerX, y - 5);
    }

    drawPremiumDiscount(pd, width, height, priceToY) {
        if (!pd || !pd.levels) return;
        
        const levels = pd.levels;
        
        // Premium zone (red)
        const premiumTop = priceToY(pd.high);
        const premiumBottom = priceToY(levels.premium_low);
        this.ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
        this.ctx.fillRect(0, premiumTop, width, premiumBottom - premiumTop);
        
        // Discount zone (green)
        const discountTop = priceToY(levels.discount_high);
        const discountBottom = priceToY(pd.low);
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        this.ctx.fillRect(0, discountTop, width, discountBottom - discountTop);
        
        // Equilibrium line
        const eqY = priceToY(levels.eq);
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, eqY);
        this.ctx.lineTo(width, eqY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
}

let chart = null;

function initChart() {
    chart = new TradingChart('chart');
    return chart;
}

function zoomIn() {
    if (chart) chart.zoomIn();
}

function zoomOut() {
    if (chart) chart.zoomOut();
}

function resetView() {
    if (chart) chart.resetView();
}

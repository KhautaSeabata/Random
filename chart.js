/**
 * CHART RENDERER
 */

class ChartRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chartData = [];
        this.zoom = 80;
        this.offset = 0;
        this.autoScroll = true;
        this.isDragging = false;
        this.dragStart = 0;
        this.dragStartOffset = 0;
        this.lastTouchTime = 0;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInteraction();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(dpr, dpr);
        this.draw();
    }

    setupInteraction() {
        this.canvas.addEventListener('touchstart', (e) => {
            const now = Date.now();
            const timeDiff = now - this.lastTouchTime;
            
            if (timeDiff < 300 && timeDiff > 0) {
                e.preventDefault();
                this.showTimeframeRing();
                return;
            }
            
            this.lastTouchTime = now;
            this.isDragging = true;
            this.dragStart = e.touches[0].clientX;
            this.dragStartOffset = this.offset;
            this.autoScroll = false;
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                const delta = e.touches[0].clientX - this.dragStart;
                const candleDelta = Math.floor(delta / (this.zoom / 2));
                this.offset = Math.max(0, this.dragStartOffset + candleDelta);
                this.draw();
            }
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    showTimeframeRing() {
        const ring = document.getElementById('timeframeRing');
        ring.classList.add('show');
        setTimeout(() => ring.classList.remove('show'), 3000);
    }

    setData(data) {
        this.chartData = data;
        if (this.autoScroll) this.offset = 0;
        this.draw();
    }

    updateLastCandle(candle) {
        if (this.chartData.length > 0) {
            // Replace the last candle with updated one
            this.chartData[this.chartData.length - 1] = candle;
        } else {
            // If no candles yet, add this one
            this.chartData.push(candle);
        }
        
        // Always keep view at latest candle if auto-scroll is on
        if (this.autoScroll) {
            this.offset = 0;
        }
        
        this.draw();
    }

    draw() {
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;
        
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, width, height);
        
        if (this.chartData.length === 0) return;
        
        const candleWidth = this.zoom / 2;
        const maxVisible = Math.floor(width / candleWidth) + 1;
        const start = Math.max(0, this.chartData.length - maxVisible - this.offset);
        const end = this.chartData.length - this.offset;
        const visible = this.chartData.slice(start, end);
        
        if (visible.length === 0) return;
        
        let minPrice = Math.min(...visible.map(c => c.low));
        let maxPrice = Math.max(...visible.map(c => c.high));
        const padding = (maxPrice - minPrice) * 0.05;
        minPrice -= padding;
        maxPrice += padding;
        
        this.drawGrid(width, height, minPrice, maxPrice);
        this.drawCandles(visible, width, height, minPrice, maxPrice, candleWidth);
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

    drawCandles(visible, width, height, minPrice, maxPrice, candleWidth) {
        const bodyWidth = Math.max(1, candleWidth * 0.7);
        
        visible.forEach((candle, index) => {
            const x = width - (visible.length - index) * candleWidth;
            const priceToY = (price) => height - ((price - minPrice) / (maxPrice - minPrice)) * height;
            
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            const isBullish = candle.close >= candle.open;
            
            const color = isBullish ? '#4caf50' : '#f44336';
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x + candleWidth / 2, highY);
            this.ctx.lineTo(x + candleWidth / 2, lowY);
            this.ctx.stroke();
            
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.abs(closeY - openY) || 1;
            this.ctx.fillRect(x + (candleWidth - bodyWidth) / 2, bodyY, bodyWidth, bodyHeight);
        });
    }

    getChartData() {
        return this.chartData;
    }
}

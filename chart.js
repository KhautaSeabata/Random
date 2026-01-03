/**
 * CHART RENDERER
 */

class ChartRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('❌ Canvas not found:', canvasId);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.chartData = [];
        this.zoom = 80;          // Default zoom
        this.minZoom = 10;       // Minimum zoom (smallest candles)
        this.maxZoom = 200;      // Maximum zoom (biggest candles)
        this.offset = 0;
        this.autoScroll = true;
        
        // Interaction
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
        let lastPinchDistance = 0;
        let isPinching = false;
        
        // Touch start
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Two fingers - pinch zoom
                isPinching = true;
                lastPinchDistance = this.getPinchDistance(e.touches);
                e.preventDefault();
                return;
            }
            
            if (e.touches.length === 1) {
                const now = Date.now();
                const timeDiff = now - this.lastTouchTime;
                
                // Double-tap detection
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
            }
            
            e.preventDefault();
        }, { passive: false });

        // Touch move
        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && isPinching) {
                // Pinch zoom
                const distance = this.getPinchDistance(e.touches);
                const delta = distance - lastPinchDistance;
                
                // Adjust zoom based on pinch
                this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta * 0.5));
                lastPinchDistance = distance;
                this.draw();
                e.preventDefault();
                return;
            }
            
            if (this.isDragging && e.touches.length === 1) {
                // Pan
                const delta = e.touches[0].clientX - this.dragStart;
                const candleDelta = Math.floor(delta / (this.zoom / 2));
                this.offset = Math.max(0, this.dragStartOffset + candleDelta);
                this.draw();
            }
            
            e.preventDefault();
        }, { passive: false });

        // Touch end
        this.canvas.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                isPinching = false;
            }
            if (e.touches.length === 0) {
                this.isDragging = false;
            }
        });
        
        // Mouse wheel zoom (for desktop)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -5 : 5;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
            this.draw();
        }, { passive: false });
    }

    getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    showTimeframeRing() {
        const ring = document.getElementById('timeframeRing');
        if (ring) {
            ring.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                ring.classList.remove('show');
            }, 3000);
        }
    }

    setData(data) {
        if (!data || data.length === 0) {
            console.warn('⚠️ No data to display');
            return;
        }
        
        this.chartData = data;
        if (this.autoScroll) {
            this.offset = 0;
        }
        console.log(`📊 Chart data set: ${data.length} candles`);
        this.draw();
    }

    updateLastCandle(candle) {
        if (!candle) return;
        
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
        if (!this.ctx) return;
        
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;
        
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, width, height);
        
        if (this.chartData.length === 0) {
            // Draw "No data" message
            this.ctx.fillStyle = '#666';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('No data available', width / 2, height / 2);
            return;
        }
        
        // Calculate visible candles
        const candleWidth = this.zoom / 2;
        const maxVisible = Math.floor(width / candleWidth) + 1;
        const start = Math.max(0, this.chartData.length - maxVisible - this.offset);
        const end = this.chartData.length - this.offset;
        const visible = this.chartData.slice(start, end);
        
        if (visible.length === 0) return;
        
        // Calculate price range
        let minPrice = Math.min(...visible.map(c => c.low));
        let maxPrice = Math.max(...visible.map(c => c.high));
        const padding = (maxPrice - minPrice) * 0.05;
        minPrice -= padding;
        maxPrice += padding;
        
        // Avoid division by zero
        if (maxPrice === minPrice) {
            maxPrice = minPrice + 1;
        }
        
        // Draw grid
        this.drawGrid(width, height, minPrice, maxPrice);
        
        // Draw candles
        this.drawCandles(visible, width, height, minPrice, maxPrice, candleWidth);
    }

    drawGrid(width, height, minPrice, maxPrice) {
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
            
            // Price labels
            const price = maxPrice - (maxPrice - minPrice) * (i / 5);
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(price.toFixed(5), width - 5, y - 5);
        }
    }

    drawCandles(visible, width, height, minPrice, maxPrice, candleWidth) {
        const bodyWidth = Math.max(1, candleWidth * 0.7);
        const priceRange = maxPrice - minPrice;
        
        visible.forEach((candle, index) => {
            const x = width - (visible.length - index) * candleWidth;
            const priceToY = (price) => height - ((price - minPrice) / priceRange) * height;
            
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            const isBullish = candle.close >= candle.open;
            
            // Colors
            const color = isBullish ? '#4caf50' : '#f44336';
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            
            // Draw wick
            this.ctx.beginPath();
            this.ctx.moveTo(x + candleWidth / 2, highY);
            this.ctx.lineTo(x + candleWidth / 2, lowY);
            this.ctx.stroke();
            
            // Draw body
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));
            this.ctx.fillRect(x + (candleWidth - bodyWidth) / 2, bodyY, bodyWidth, bodyHeight);
        });
    }

    getChartData() {
        return this.chartData;
    }
    
    zoomIn() {
        this.zoom = Math.min(this.maxZoom, this.zoom + 15);
        this.draw();
    }
    
    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom - 15);
        this.draw();
    }
    
    resetZoom() {
        this.zoom = 80;
        this.offset = 0;
        this.autoScroll = true;
        this.draw();
    }
}

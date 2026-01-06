/**
 * CHART RENDERER WITH SMC/ICT DRAWING
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
        this.zoom = 10;          // Default zoom (was 80)
        this.minZoom = 1;        // Minimum zoom
        this.maxZoom = 200;      // Maximum zoom
        this.zoomStep = 0.5;     // Zoom interval
        this.offset = 0;
        this.autoScroll = true;
        this.rightMargin = 0.3;  // 30% margin on right
        
        // SMC drawings
        this.drawings = {
            orderBlocks: [],
            fvgs: [],
            liquidityZones: [],
            trendlines: [],
            supportResistance: [],
            premiumDiscount: null
        };
        
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
                isPinching = true;
                lastPinchDistance = this.getPinchDistance(e.touches);
                e.preventDefault();
                return;
            }
            
            if (e.touches.length === 1) {
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
            }
            
            e.preventDefault();
        }, { passive: false });

        // Touch move
        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && isPinching) {
                const distance = this.getPinchDistance(e.touches);
                const delta = distance - lastPinchDistance;
                
                this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta * 0.1));
                lastPinchDistance = distance;
                this.draw();
                e.preventDefault();
                return;
            }
            
            if (this.isDragging && e.touches.length === 1) {
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
        
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
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
            setTimeout(() => ring.classList.remove('show'), 3000);
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

    updateSymbol(symbol) {
        this.symbol = symbol;
        console.log(`📊 Chart symbol updated to: ${symbol}`);
    }

    updateLastCandle(candle) {
        if (!candle) return;
        
        if (this.chartData.length > 0) {
            this.chartData[this.chartData.length - 1] = candle;
        } else {
            this.chartData.push(candle);
        }
        
        if (this.autoScroll) {
            this.offset = 0;
        }
        
        this.draw();
    }

    /**
     * Update SMC drawings
     */
    updateDrawings(drawings) {
        if (drawings) {
            this.drawings = drawings;
            this.draw();
        }
    }

    draw() {
        if (!this.ctx) return;
        
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;
        
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, width, height);
        
        if (this.chartData.length === 0) {
            this.ctx.fillStyle = '#666';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('No data available', width / 2, height / 2);
            return;
        }
        
        // Calculate visible area with 30% right margin
        const chartWidth = width * (1 - this.rightMargin);
        const candleWidth = this.zoom / 2;
        const maxVisible = Math.floor(chartWidth / candleWidth) + 1;
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
        
        if (maxPrice === minPrice) {
            maxPrice = minPrice + 1;
        }
        
        // Helper function
        const priceToY = (price) => height - ((price - minPrice) / (maxPrice - minPrice)) * height;
        const indexToX = (index) => (visible.length - index - 1) * candleWidth;
        
        // Draw grid
        this.drawGrid(width, height, minPrice, maxPrice);
        
        // Draw SMC elements FIRST (behind candles)
        this.drawSMCElements(visible, width, height, minPrice, maxPrice, candleWidth, priceToY, indexToX, start);
        
        // Draw candles on top
        this.drawCandles(visible, width, height, minPrice, maxPrice, candleWidth);
        
        // Draw current price line (on top of everything)
        this.drawCurrentPriceLine(width, height, priceToY);
    }

    /**
     * Draw current price line (horizontal blue dotted line)
     */
    drawCurrentPriceLine(width, height, priceToY) {
        if (this.chartData.length === 0) return;
        
        const currentCandle = this.chartData[this.chartData.length - 1];
        const currentPrice = currentCandle.close;
        const y = priceToY(currentPrice);
        
        // Draw dotted line
        this.ctx.strokeStyle = '#2196f3'; // Blue
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]); // Dotted pattern
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset
        
        // Draw price label on the right
        const decimals = this.getDecimals();
        const priceText = currentPrice.toFixed(decimals);
        
        this.ctx.font = 'bold 11px -apple-system, sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        
        // Background box
        const metrics = this.ctx.measureText(priceText);
        const padding = 4;
        const boxWidth = metrics.width + padding * 2;
        const boxHeight = 18;
        const boxX = width - boxWidth;
        const boxY = y - boxHeight / 2;
        
        this.ctx.fillStyle = '#2196f3'; // Blue background
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Price text
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(priceText, width - padding, y);
    }

    getDecimals() {
        // Determine decimal places based on current symbol
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

    /**
     * Draw SMC/ICT elements
     */
    drawSMCElements(visible, width, height, minPrice, maxPrice, candleWidth, priceToY, indexToX, startIndex) {
        const priceRange = maxPrice - minPrice;
        
        // 1. Premium/Discount Zones
        if (this.drawings.premiumDiscount) {
            this.drawPremiumDiscount(this.drawings.premiumDiscount, width, height, priceToY);
        }
        
        // 2. Support/Resistance
        if (this.drawings.supportResistance) {
            this.drawings.supportResistance.forEach(sr => {
                this.drawSupportResistance(sr, width, priceToY);
            });
        }
        
        // 3. Trendlines - DISABLED (only showing S/R lines)
        // if (this.drawings.trendlines) {
        //     this.drawings.trendlines.forEach(tl => {
        //         this.drawTrendline(tl, width, height, startIndex, visible.length, candleWidth, priceToY);
        //     });
        // }
        
        // 4. Order Blocks
        if (this.drawings.orderBlocks) {
            this.drawings.orderBlocks.forEach(ob => {
                if (ob.index >= startIndex && ob.index < startIndex + visible.length) {
                    this.drawOrderBlock(ob, startIndex, indexToX, priceToY, candleWidth, width);
                }
            });
        }
        
        // 5. Fair Value Gaps
        if (this.drawings.fvgs) {
            this.drawings.fvgs.forEach(fvg => {
                if (fvg.index >= startIndex && fvg.index < startIndex + visible.length) {
                    this.drawFVG(fvg, startIndex, indexToX, priceToY, candleWidth, width);
                }
            });
        }
        
        // 6. Liquidity Zones
        if (this.drawings.liquidityZones) {
            this.drawings.liquidityZones.forEach(lz => {
                if (lz.index >= startIndex && lz.index < startIndex + visible.length) {
                    this.drawLiquidityZone(lz, startIndex, indexToX, priceToY, width);
                }
            });
        }
    }

    /**
     * Draw Premium/Discount Zones (Fibonacci)
     */
    drawPremiumDiscount(pd, width, height, priceToY) {
        const levels = pd.levels;
        
        // Premium zone (61.8% - 100%)
        this.ctx.fillStyle = 'rgba(244, 67, 54, 0.1)';
        const premiumTop = priceToY(levels.high);
        const premiumBottom = priceToY(levels.premium);
        this.ctx.fillRect(0, premiumTop, width, premiumBottom - premiumTop);
        
        // Discount zone (0% - 38.2%)
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        const discountTop = priceToY(levels.discount);
        const discountBottom = priceToY(levels.low);
        this.ctx.fillRect(0, discountTop, width, discountBottom - discountTop);
        
        // Equilibrium line (50%)
        this.ctx.strokeStyle = 'rgba(255, 193, 7, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        const eqY = priceToY(levels.equilibrium);
        this.ctx.beginPath();
        this.ctx.moveTo(0, eqY);
        this.ctx.lineTo(width, eqY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Labels
        this.ctx.fillStyle = '#f44336';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText('Premium', 5, premiumTop + 12);
        
        this.ctx.fillStyle = '#4caf50';
        this.ctx.fillText('Discount', 5, discountBottom - 5);
        
        this.ctx.fillStyle = '#ffc107';
        this.ctx.fillText('50%', 5, eqY - 5);
    }

    /**
     * Draw Support/Resistance
     */
    drawSupportResistance(sr, width, priceToY) {
        const y = priceToY(sr.price);
        const color = sr.type === 'support' ? '#4caf50' : '#f44336';
        
        // Draw the dotted line
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Label CENTERED and ON TOP of line
        const labelText = `${sr.type.toUpperCase()} (${sr.touches}x)`;
        this.ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        
        // Measure text for background box
        const metrics = this.ctx.measureText(labelText);
        const padding = 8;
        const boxWidth = metrics.width + padding * 2;
        const boxHeight = 22;
        const centerX = width / 2;
        const boxX = centerX - (boxWidth / 2);
        const boxY = y - boxHeight - 3; // Position above the line
        
        // Draw background box
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw border around box (same color as line)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw text centered
        this.ctx.fillStyle = color;
        this.ctx.fillText(labelText, centerX, y - 5);
    }

    /**
     * Draw Trendlines
     */
    drawTrendline(tl, width, height, startIndex, visibleCount, candleWidth, priceToY) {
        if (!tl.points || tl.points.length < 2) return;
        
        const color = tl.type === 'support' ? '#4caf50' : '#f44336';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        let started = false;
        let lastX = 0;
        let lastY = 0;
        
        tl.points.forEach((point, i) => {
            if (point.index >= startIndex && point.index < startIndex + visibleCount) {
                const relIndex = point.index - startIndex;
                const x = (visibleCount - relIndex - 1) * candleWidth + candleWidth / 2;
                const y = priceToY(point.price);
                
                if (!started) {
                    this.ctx.moveTo(x, y);
                    started = true;
                } else {
                    this.ctx.lineTo(x, y);
                }
                lastX = x;
                lastY = y;
            }
        });
        
        // Extend to edge of screen
        if (tl.points.length >= 2 && started) {
            const lastPoint = tl.points[tl.points.length - 1];
            const secondLast = tl.points[tl.points.length - 2];
            const slope = (lastPoint.price - secondLast.price) / (lastPoint.index - secondLast.index);
            
            // Extend to right edge
            const candlesBeyond = 50;
            const futureIndex = lastPoint.index + candlesBeyond;
            const futurePrice = lastPoint.price + (slope * candlesBeyond);
            const futureX = width;
            const futureY = priceToY(futurePrice);
            this.ctx.lineTo(futureX, futureY);
            lastX = futureX;
            lastY = futureY;
        }
        
        this.ctx.stroke();
        
        // Draw label at the end of the line
        if (tl.label && lastX > 0) {
            const labelText = `${tl.label} (${tl.touches}x)`;
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 11px -apple-system, sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            
            // Background box
            const metrics = this.ctx.measureText(labelText);
            const padding = 4;
            const boxX = Math.min(lastX + 5, width - metrics.width - padding * 2 - 5);
            const boxY = lastY - 10;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(boxX - padding, boxY - padding, metrics.width + padding * 2, 20);
            
            // Text
            this.ctx.fillStyle = color;
            this.ctx.fillText(labelText, boxX, boxY + 6);
        }
    }

    /**
     * Draw Order Blocks
     */
    drawOrderBlock(ob, startIndex, indexToX, priceToY, candleWidth, width) {
        const relIndex = ob.index - startIndex;
        const x = indexToX(relIndex);
        const top = priceToY(ob.top);
        const bottom = priceToY(ob.bottom);
        const height = bottom - top;
        
        // Draw rectangle extending to right
        const color = ob.type === 'bullish' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, top, width - x, height);
        
        // Border
        const borderColor = ob.type === 'bullish' ? '#4caf50' : '#f44336';
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, top, width - x, height);
        
        // Label
        this.ctx.fillStyle = borderColor;
        this.ctx.font = 'bold 9px sans-serif';
        this.ctx.fillText(`OB ${ob.type.toUpperCase()}`, x + 3, top + 12);
    }

    /**
     * Draw Fair Value Gaps
     */
    drawFVG(fvg, startIndex, indexToX, priceToY, candleWidth, width) {
        const relIndex = fvg.index - startIndex;
        const x = indexToX(relIndex);
        const top = priceToY(fvg.top);
        const bottom = priceToY(fvg.bottom);
        const height = bottom - top;
        
        // Draw gap extending to right
        const color = fvg.type === 'bullish' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, top, width - x, height);
        
        // Dashed border
        const borderColor = fvg.type === 'bullish' ? '#4caf50' : '#f44336';
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.strokeRect(x, top, width - x, height);
        this.ctx.setLineDash([]);
        
        // Label
        this.ctx.fillStyle = borderColor;
        this.ctx.font = '9px sans-serif';
        this.ctx.fillText('FVG', x + 3, top + 10);
    }

    /**
     * Draw Liquidity Zones
     */
    drawLiquidityZone(lz, startIndex, indexToX, priceToY, width) {
        const relIndex = lz.index - startIndex;
        const x = indexToX(relIndex);
        const y = priceToY(lz.price);
        
        // Draw line
        const color = lz.type === 'buy-side' ? '#2196f3' : '#ff9800';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Mark swept
        if (lz.swept) {
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x + 10, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.font = 'bold 8px sans-serif';
            this.ctx.fillText('SWEPT', x + 15, y + 3);
        }
    }

    drawCandles(visible, width, height, minPrice, maxPrice, candleWidth) {
        const bodyWidth = Math.max(1, candleWidth * 0.7);
        const priceRange = maxPrice - minPrice;
        
        // Calculate position with 30% right margin
        const chartWidth = width * (1 - this.rightMargin);
        
        visible.forEach((candle, index) => {
            const x = chartWidth - (visible.length - index) * candleWidth;
            const priceToY = (price) => height - ((price - minPrice) / priceRange) * height;
            
            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            const isBullish = candle.close >= candle.open;
            
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
        this.zoom = Math.min(this.maxZoom, this.zoom + this.zoomStep);
        this.draw();
    }
    
    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom - this.zoomStep);
        this.draw();
    }
    
    resetZoom() {
        this.zoom = 10;
        this.offset = 0;
        this.autoScroll = true;
        this.draw();
    }
}

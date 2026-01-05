/**
 * COMPLETE TRADING ANALYSIS
 * Combines: Trendlines + SMC/ICT + Sentiment
 * Draws: Only trendlines and S/R on chart
 */

class SMCAnalyzer {
    constructor() {
        this.candles = [];
        this.analysisProgress = 0;
        this.progressCallback = null;
        this.analysis = {
            // Chart drawing (visible)
            trendlines: [],
            channels: [],
            supportResistance: [],
            premiumDiscount: null,
            
            // SMC analysis (invisible but used for signals)
            marketStructure: null,
            orderBlocks: [],
            advancedOBs: [],
            fvgs: [],
            liquidityZones: [],
            breakouts: [],
            retests: [],
            chochs: [],
            bos: [],
            wyckoff: null
        };
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    updateProgress(percent, message) {
        this.analysisProgress = percent;
        if (this.progressCallback) {
            this.progressCallback(percent, message);
        }
        console.log(`📊 ${percent}% - ${message}`);
    }

    async analyze(candles, symbol, timeframe) {
        if (!candles || candles.length < 100) {
            console.warn('⚠️ Not enough candles');
            return null;
        }

        this.candles = candles;
        this.analysisProgress = 0;
        
        try {
            // PHASE 1: TRENDLINES (for chart drawing)
            this.updateProgress(5, 'Identifying market structure...');
            await this.sleep(100);
            this.identifyMarketStructure();
            
            this.updateProgress(10, 'Drawing trendlines...');
            await this.sleep(100);
            this.drawTrendlines();
            
            this.updateProgress(15, 'Detecting channels...');
            await this.sleep(100);
            this.detectChannels();
            
            this.updateProgress(20, 'Finding support/resistance...');
            await this.sleep(100);
            this.findSupportResistance();
            
            // PHASE 2: SMC ANALYSIS (for signal logic)
            this.updateProgress(30, 'Finding order blocks...');
            await this.sleep(100);
            this.findOrderBlocks();
            
            this.updateProgress(40, 'Detecting advanced OBs...');
            await this.sleep(100);
            this.findAdvancedOrderBlocks();
            
            this.updateProgress(50, 'Detecting fair value gaps...');
            await this.sleep(100);
            this.detectFairValueGaps();
            
            this.updateProgress(60, 'Finding liquidity zones...');
            await this.sleep(100);
            this.findLiquidityZones();
            
            this.updateProgress(70, 'Detecting breakouts & CHoCH...');
            await this.sleep(100);
            this.detectBreakouts();
            this.detectChoCHAndBOS();
            
            this.updateProgress(80, 'Finding retest zones...');
            await this.sleep(100);
            this.findRetestZones();
            
            this.updateProgress(85, 'Analyzing Wyckoff phase...');
            await this.sleep(100);
            this.analyzeWyckoff();
            
            this.updateProgress(90, 'Calculating premium/discount...');
            await this.sleep(100);
            this.calculatePremiumDiscount();
            
            // PHASE 3: NEWS SENTIMENT
            this.updateProgress(95, 'Fetching news sentiment...');
            const signal = await this.generateSignal(symbol, timeframe);
            
            this.updateProgress(100, 'Analysis complete!');
            await this.sleep(200);
            
            console.log('✅ Complete analysis finished');
            return signal;
            
        } catch (error) {
            console.error('❌ Analysis error:', error);
            throw error;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get drawables - ONLY trendlines and S/R
     */
    getDrawables() {
        return {
            trendlines: this.analysis.trendlines || [],
            channels: this.analysis.channels || [],
            supportResistance: this.analysis.supportResistance || [],
            premiumDiscount: this.analysis.premiumDiscount || null
        };
    }

    /**
     * MARKET STRUCTURE
     */
    identifyMarketStructure() {
        const swings = this.findSwingPoints();
        let higherHighs = 0;
        let lowerLows = 0;

        for (let i = 2; i < swings.length; i++) {
            const prev = swings[i-2];
            const curr = swings[i];
            
            if (curr.type === 'high' && curr.price > prev.price) higherHighs++;
            if (curr.type === 'low' && curr.price < prev.price) lowerLows++;
        }

        const trend = higherHighs > lowerLows ? 'bullish' : 
                     lowerLows > higherHighs ? 'bearish' : 'ranging';

        this.analysis.marketStructure = { trend, swings, higherHighs, lowerLows };
    }

    findSwingPoints() {
        const swings = [];
        const period = 7;

        for (let i = period; i < this.candles.length - period; i++) {
            const current = this.candles[i];
            let isHigh = true;
            let isLow = true;

            for (let j = 1; j <= period; j++) {
                if (this.candles[i-j].high >= current.high || 
                    this.candles[i+j].high >= current.high) isHigh = false;
                if (this.candles[i-j].low <= current.low || 
                    this.candles[i+j].low <= current.low) isLow = false;
            }

            if (isHigh) swings.push({ type: 'high', price: current.high, index: i });
            if (isLow) swings.push({ type: 'low', price: current.low, index: i });
        }

        return swings;
    }

    /**
     * TRENDLINES (for drawing)
     */
    drawTrendlines() {
        const trendlines = [];
        const swings = this.analysis.marketStructure?.swings || [];
        
        const lows = swings.filter(s => s.type === 'low').slice(-10);
        if (lows.length >= 3) {
            for (let i = 0; i < lows.length - 2; i++) {
                for (let j = i + 1; j < lows.length - 1; j++) {
                    const line = this.createTrendline(lows[i], lows[j], 'support');
                    if (line && line.touches >= 3) trendlines.push(line);
                }
            }
        }
        
        const highs = swings.filter(s => s.type === 'high').slice(-10);
        if (highs.length >= 3) {
            for (let i = 0; i < highs.length - 2; i++) {
                for (let j = i + 1; j < highs.length - 1; j++) {
                    const line = this.createTrendline(highs[i], highs[j], 'resistance');
                    if (line && line.touches >= 3) trendlines.push(line);
                }
            }
        }
        
        this.analysis.trendlines = trendlines
            .sort((a, b) => b.touches - a.touches)
            .slice(0, 4);
    }

    createTrendline(point1, point2, type) {
        const slope = (point2.price - point1.price) / (point2.index - point1.index);
        let touches = 2;
        const tolerance = 0.002;
        
        const swings = this.analysis.marketStructure.swings;
        const touchPoints = [point1, point2];
        
        for (const swing of swings) {
            if (swing.index <= point1.index || swing.index >= point2.index) continue;
            const expectedPrice = point1.price + slope * (swing.index - point1.index);
            const diff = Math.abs(swing.price - expectedPrice) / expectedPrice;
            
            if (diff < tolerance) {
                touches++;
                touchPoints.push(swing);
            }
        }
        
        if (touches < 3) return null;
        
        return {
            type,
            slope,
            startPoint: point1,
            endPoint: point2,
            touches,
            touchPoints,
            label: type === 'support' ? 'Support Trendline' : 'Resistance Trendline'
        };
    }

    /**
     * CHANNELS (for drawing)
     */
    detectChannels() {
        const channels = [];
        const trendlines = this.analysis.trendlines;
        
        if (trendlines.length < 2) {
            this.analysis.channels = [];
            return;
        }
        
        for (let i = 0; i < trendlines.length; i++) {
            for (let j = i + 1; j < trendlines.length; j++) {
                const line1 = trendlines[i];
                const line2 = trendlines[j];
                
                const slopeDiff = Math.abs(line1.slope - line2.slope);
                if (slopeDiff < 0.0001) {
                    const channelType = line1.slope > 0 ? 'upward' : 
                                       line1.slope < 0 ? 'downward' : 'sideways';
                    
                    channels.push({
                        type: channelType,
                        upperLine: line1.type === 'resistance' ? line1 : line2,
                        lowerLine: line1.type === 'support' ? line1 : line2,
                        medianPrice: (line1.startPoint.price + line2.startPoint.price) / 2,
                        label: `${channelType.charAt(0).toUpperCase() + channelType.slice(1)} Channel`
                    });
                }
            }
        }
        
        this.analysis.channels = channels.slice(0, 2);
    }

    /**
     * SUPPORT/RESISTANCE (for drawing)
     */
    findSupportResistance() {
        const levels = [];
        const tolerance = 0.002;
        
        this.candles.forEach((candle, i) => {
            [candle.high, candle.low, candle.close].forEach(price => {
                const existing = levels.find(l => 
                    Math.abs(l.price - price) / price < tolerance
                );
                
                if (existing) {
                    existing.touches++;
                    existing.lastTouch = i;
                } else {
                    levels.push({ price, touches: 1, lastTouch: i });
                }
            });
        });
        
        const current = this.candles[this.candles.length - 1].close;
        
        this.analysis.supportResistance = levels
            .filter(l => l.touches >= 4)
            .sort((a, b) => b.touches - a.touches)
            .slice(0, 8)
            .map(l => ({
                ...l,
                type: l.price > current ? 'resistance' : 'support',
                label: `${l.price > current ? 'Resistance' : 'Support'} (${l.touches}x)`
            }));
    }

    /**
     * ORDER BLOCKS (SMC - not drawn but used for signals)
     */
    findOrderBlocks() {
        const orderBlocks = [];
        
        for (let i = 10; i < this.candles.length - 3; i++) {
            const prev = this.candles[i];
            const next = this.candles[i + 1];
            
            if (prev.close < prev.open && next.close > next.open) {
                const move = (next.close - next.open) / next.open;
                if (move > 0.003) {
                    orderBlocks.push({
                        type: 'bullish',
                        top: prev.high,
                        bottom: prev.low,
                        index: i,
                        strength: move * 100
                    });
                }
            }
            
            if (prev.close > prev.open && next.close < next.open) {
                const move = (next.open - next.close) / next.open;
                if (move > 0.003) {
                    orderBlocks.push({
                        type: 'bearish',
                        top: prev.high,
                        bottom: prev.low,
                        index: i,
                        strength: move * 100
                    });
                }
            }
        }
        
        this.analysis.orderBlocks = orderBlocks
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 8);
    }

    /**
     * ADVANCED ORDER BLOCKS (SMC)
     */
    findAdvancedOrderBlocks() {
        const advancedOBs = [];
        
        for (let i = 20; i < this.candles.length - 5; i++) {
            const prev = this.candles[i];
            const next = this.candles[i + 1];
            
            const bullishMove = next.close > next.open ? (next.close - next.open) / next.open : 0;
            const bearishMove = next.close < next.open ? (next.open - next.close) / next.open : 0;
            
            if (prev.close < prev.open && bullishMove > 0.01) {
                advancedOBs.push({
                    type: 'bullish',
                    top: prev.high,
                    bottom: prev.low,
                    index: i,
                    strength: bullishMove * 100
                });
            }
            
            if (prev.close > prev.open && bearishMove > 0.01) {
                advancedOBs.push({
                    type: 'bearish',
                    top: prev.high,
                    bottom: prev.low,
                    index: i,
                    strength: bearishMove * 100
                });
            }
        }
        
        this.analysis.advancedOBs = advancedOBs
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 5);
    }

    /**
     * FAIR VALUE GAPS (SMC)
     */
    detectFairValueGaps() {
        const fvgs = [];
        
        for (let i = 1; i < this.candles.length - 1; i++) {
            const prev = this.candles[i - 1];
            const next = this.candles[i + 1];
            
            if (prev.high < next.low) {
                const gap = next.low - prev.high;
                const filled = this.checkFVGFilled(i, 'bullish', prev.high, next.low);
                
                fvgs.push({
                    type: 'bullish',
                    top: next.low,
                    bottom: prev.high,
                    index: i,
                    size: gap,
                    filled
                });
            }
            
            if (prev.low > next.high) {
                const gap = prev.low - next.high;
                const filled = this.checkFVGFilled(i, 'bearish', next.high, prev.low);
                
                fvgs.push({
                    type: 'bearish',
                    top: prev.low,
                    bottom: next.high,
                    index: i,
                    size: gap,
                    filled
                });
            }
        }
        
        this.analysis.fvgs = fvgs.slice(-15);
    }

    checkFVGFilled(fvgIndex, type, bottom, top) {
        for (let i = fvgIndex + 1; i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (type === 'bullish' && candle.low <= bottom + (top - bottom) * 0.5) return true;
            if (type === 'bearish' && candle.high >= bottom + (top - bottom) * 0.5) return true;
        }
        return false;
    }

    /**
     * LIQUIDITY ZONES (SMC)
     */
    findLiquidityZones() {
        const zones = [];
        const swings = this.analysis.marketStructure?.swings || [];
        
        swings.forEach((swing) => {
            const swept = this.checkLiquiditySwept(swing);
            
            zones.push({
                type: swing.type === 'high' ? 'buy-side' : 'sell-side',
                price: swing.price,
                index: swing.index,
                swept
            });
        });
        
        this.analysis.liquidityZones = zones.slice(-10);
    }

    checkLiquiditySwept(swing) {
        const tolerance = 0.001;
        for (let i = swing.index + 1; i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (swing.type === 'high' && candle.high > swing.price * (1 + tolerance)) return true;
            if (swing.type === 'low' && candle.low < swing.price * (1 - tolerance)) return true;
        }
        return false;
    }

    /**
     * BREAKOUTS (SMC)
     */
    detectBreakouts() {
        const breakouts = [];
        const recent = this.candles.slice(-30);
        const highs = recent.map(c => c.high);
        const lows = recent.map(c => c.low);
        const resistance = Math.max(...highs.slice(0, -5));
        const support = Math.min(...lows.slice(0, -5));
        
        const last5 = this.candles.slice(-5);
        
        if (last5.some(c => c.close > resistance * 1.002)) {
            breakouts.push({ type: 'bullish', price: resistance, index: this.candles.length - 5 });
        }
        
        if (last5.some(c => c.close < support * 0.998)) {
            breakouts.push({ type: 'bearish', price: support, index: this.candles.length - 5 });
        }
        
        this.analysis.breakouts = breakouts;
    }

    /**
     * RETESTS (SMC)
     */
    findRetestZones() {
        const retests = [];
        const breakouts = this.analysis.breakouts || [];
        
        breakouts.forEach(bo => {
            if (this.checkRetest(bo)) {
                retests.push({
                    type: 'retest',
                    price: bo.price,
                    direction: bo.type,
                    index: bo.index + 3
                });
            }
        });
        
        this.analysis.retests = retests;
    }

    checkRetest(breakout) {
        const tolerance = 0.003;
        for (let i = breakout.index + 1; i < Math.min(breakout.index + 10, this.candles.length); i++) {
            const candle = this.candles[i];
            if (Math.abs(candle.low - breakout.price) / breakout.price < tolerance ||
                Math.abs(candle.high - breakout.price) / breakout.price < tolerance) {
                return true;
            }
        }
        return false;
    }

    /**
     * CHoCH & BOS (SMC)
     */
    detectChoCHAndBOS() {
        const swings = this.analysis.marketStructure?.swings || [];
        const chochs = [];
        const bos = [];
        
        for (let i = 2; i < swings.length; i++) {
            const prevPrev = swings[i-2];
            const curr = swings[i];
            
            if (prevPrev.type === curr.type) {
                if (curr.type === 'high' && curr.price < prevPrev.price) {
                    chochs.push({ type: 'bearish', price: curr.price, index: curr.index });
                }
                if (curr.type === 'low' && curr.price > prevPrev.price) {
                    chochs.push({ type: 'bullish', price: curr.price, index: curr.index });
                }
                
                if (curr.type === 'high' && curr.price > prevPrev.price) {
                    bos.push({ type: 'bullish', price: curr.price, index: curr.index });
                }
                if (curr.type === 'low' && curr.price < prevPrev.price) {
                    bos.push({ type: 'bearish', price: curr.price, index: curr.index });
                }
            }
        }
        
        this.analysis.chochs = chochs.slice(-3);
        this.analysis.bos = bos.slice(-3);
    }

    /**
     * WYCKOFF (SMC)
     */
    analyzeWyckoff() {
        const recent = this.candles.slice(-30);
        const priceChange = (recent[recent.length-1].close - recent[0].close) / recent[0].close;
        const volatility = this.calculateVolatility(recent);
        
        let phase = 'neutral';
        let confidence = 50;
        
        if (Math.abs(priceChange) < 0.02 && volatility < 0.015) {
            phase = priceChange < 0 ? 'accumulation' : 'distribution';
            confidence = 75;
        } else if (priceChange > 0.05) {
            phase = 'markup';
            confidence = 80;
        } else if (priceChange < -0.05) {
            phase = 'markdown';
            confidence = 80;
        }
        
        this.analysis.wyckoff = { phase, confidence };
    }

    calculateVolatility(candles) {
        const returns = [];
        for (let i = 1; i < candles.length; i++) {
            returns.push((candles[i].close - candles[i-1].close) / candles[i-1].close);
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    /**
     * PREMIUM/DISCOUNT
     */
    calculatePremiumDiscount() {
        const recent = this.candles.slice(-100);
        const high = Math.max(...recent.map(c => c.high));
        const low = Math.min(...recent.map(c => c.low));
        const range = high - low;
        
        const levels = {
            high,
            fib786: high - (range * 0.214),
            fib618: high - (range * 0.382),
            equilibrium: high - (range * 0.5),
            fib382: high - (range * 0.618),
            fib236: high - (range * 0.764),
            low,
            ote_high: high - (range * 0.214),
            ote_low: high - (range * 0.382)
        };
        
        const current = this.candles[this.candles.length - 1].close;
        let zone = 'equilibrium';
        
        if (current >= levels.fib618) zone = 'premium';
        else if (current <= levels.fib382) zone = 'discount';
        
        this.analysis.premiumDiscount = { levels, currentZone: zone };
    }

    /**
     * SIGNAL GENERATION - Combines all 3 methods
     */
    async generateSignal(symbol, timeframe) {
        const current = this.candles[this.candles.length - 1];
        const structure = this.analysis.marketStructure;
        const pd = this.analysis.premiumDiscount;
        
        if (!structure || !pd) return null;
        
        // Get news sentiment
        let newsAnalysis = null;
        try {
            newsAnalysis = await newsAnalyzer.analyzeCurrency(symbol);
            console.log(`📰 News: ${newsAnalysis.direction} (${newsAnalysis.sentiment})`);
        } catch (error) {
            console.warn('⚠️ News unavailable');
        }
        
        let bias = structure.trend;
        let confidence = 0;
        let reasons = [];
        
        const analysisData = {
            trendlines: this.analysis.trendlines,
            channels: this.analysis.channels,
            supportResistance: this.analysis.supportResistance,
            orderBlocks: this.analysis.orderBlocks.slice(0, 5),
            advancedOBs: this.analysis.advancedOBs,
            fvgs: this.analysis.fvgs.filter(f => !f.filled).slice(0, 5),
            liquidityZones: this.analysis.liquidityZones,
            breakouts: this.analysis.breakouts,
            chochs: this.analysis.chochs,
            bos: this.analysis.bos,
            wyckoff: this.analysis.wyckoff,
            premiumDiscount: pd.currentZone
        };
        
        // BULLISH SIGNAL - Combine all methods
        if (bias === 'bullish') {
            // Premium/Discount
            if (pd.currentZone === 'discount') {
                confidence += 20;
                reasons.push('✅ Discount zone');
            }
            
            // Trendlines
            const supportLine = this.analysis.trendlines.find(t => t.type === 'support');
            if (supportLine) {
                confidence += 15;
                reasons.push(`✅ Support trendline (${supportLine.touches}x)`);
            }
            
            // Channels
            const upChannel = this.analysis.channels.find(c => c.type === 'upward');
            if (upChannel) {
                confidence += 10;
                reasons.push('✅ Upward channel');
            }
            
            // S/R
            const support = this.analysis.supportResistance.find(sr => sr.type === 'support');
            if (support) {
                confidence += 10;
                reasons.push(`✅ Support ${support.price.toFixed(2)} (${support.touches}x)`);
            }
            
            // SMC: Order Blocks
            const bullishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bullish' && 
                current.close >= ob.bottom && 
                current.close <= ob.top * 1.02
            );
            if (bullishOB) {
                confidence += 10;
                reasons.push('✅ Bullish order block');
            }
            
            // SMC: FVG
            const bullishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bullish' && !fvg.filled
            );
            if (bullishFVG) {
                confidence += 10;
                reasons.push('✅ Bullish FVG');
            }
            
            // SMC: Liquidity
            if (this.analysis.liquidityZones.some(lz => lz.type === 'sell-side' && lz.swept)) {
                confidence += 10;
                reasons.push('✅ Liquidity swept');
            }
            
            // SMC: CHoCH
            if (this.analysis.chochs.some(ch => ch.type === 'bullish')) {
                confidence += 5;
                reasons.push('✅ Bullish CHoCH');
            }
            
            // Wyckoff
            if (this.analysis.wyckoff?.phase === 'accumulation') {
                confidence += 10;
                reasons.push('✅ Wyckoff accumulation');
            }
            
            // NEWS SENTIMENT
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BULLISH') {
                    confidence += 15;
                    reasons.push(`📰 Bullish news: +${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.direction === 'BEARISH') {
                    confidence -= 15;
                    reasons.push(`⚠️ Bearish news: ${newsAnalysis.sentiment}/100`);
                }
            }
            
            if (confidence >= 65) {
                return this.createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData);
            }
        }
        
        // BEARISH SIGNAL - Combine all methods
        if (bias === 'bearish') {
            confidence = 0;
            reasons = [];
            
            if (pd.currentZone === 'premium') {
                confidence += 20;
                reasons.push('✅ Premium zone');
            }
            
            const resistanceLine = this.analysis.trendlines.find(t => t.type === 'resistance');
            if (resistanceLine) {
                confidence += 15;
                reasons.push(`✅ Resistance trendline (${resistanceLine.touches}x)`);
            }
            
            const downChannel = this.analysis.channels.find(c => c.type === 'downward');
            if (downChannel) {
                confidence += 10;
                reasons.push('✅ Downward channel');
            }
            
            const resistance = this.analysis.supportResistance.find(sr => sr.type === 'resistance');
            if (resistance) {
                confidence += 10;
                reasons.push(`✅ Resistance ${resistance.price.toFixed(2)} (${resistance.touches}x)`);
            }
            
            const bearishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bearish' && 
                current.close <= ob.top && 
                current.close >= ob.bottom * 0.98
            );
            if (bearishOB) {
                confidence += 10;
                reasons.push('✅ Bearish order block');
            }
            
            const bearishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bearish' && !fvg.filled
            );
            if (bearishFVG) {
                confidence += 10;
                reasons.push('✅ Bearish FVG');
            }
            
            if (this.analysis.liquidityZones.some(lz => lz.type === 'buy-side' && lz.swept)) {
                confidence += 10;
                reasons.push('✅ Liquidity swept');
            }
            
            if (this.analysis.chochs.some(ch => ch.type === 'bearish')) {
                confidence += 5;
                reasons.push('✅ Bearish CHoCH');
            }
            
            if (this.analysis.wyckoff?.phase === 'distribution') {
                confidence += 10;
                reasons.push('✅ Wyckoff distribution');
            }
            
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BEARISH') {
                    confidence += 15;
                    reasons.push(`📰 Bearish news: ${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.direction === 'BULLISH') {
                    confidence -= 15;
                    reasons.push(`⚠️ Bullish news: +${newsAnalysis.sentiment}/100`);
                }
            }
            
            if (confidence >= 65) {
                return this.createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData);
            }
        }
        
        return null;
    }

    createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'low');
        const recentLow = swings.length > 0 ? Math.min(...swings.slice(-3).map(s => s.price)) : entry * 0.98;
        
        let sl = recentLow * 0.995;
        const riskAmount = entry - sl;
        let tp1 = entry + (riskAmount * 1.5);
        let tp2 = entry + (riskAmount * 2.5);
        let tp3 = entry + (riskAmount * 4.0);
        
        return {
            symbol, timeframe,
            action: 'BUY',
            bias: 'bullish',
            entry: parseFloat(entry.toFixed(5)),
            optimalEntry: parseFloat(pd.levels.ote_low.toFixed(5)),
            sl: parseFloat(sl.toFixed(5)),
            tp1: parseFloat(tp1.toFixed(5)),
            tp2: parseFloat(tp2.toFixed(5)),
            tp3: parseFloat(tp3.toFixed(5)),
            confidence: Math.min(95, confidence),
            riskReward: 2.5,
            reasons,
            newsAnalysis,
            analysisData,
            timestamp: Date.now(),
            status: 'active',
            concepts: ['Trendlines', 'SMC/ICT', 'News Sentiment']
        };
    }

    createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'high');
        const recentHigh = swings.length > 0 ? Math.max(...swings.slice(-3).map(s => s.price)) : entry * 1.02;
        
        let sl = recentHigh * 1.005;
        const riskAmount = sl - entry;
        let tp1 = entry - (riskAmount * 1.5);
        let tp2 = entry - (riskAmount * 2.5);
        let tp3 = entry - (riskAmount * 4.0);
        
        return {
            symbol, timeframe,
            action: 'SELL',
            bias: 'bearish',
            entry: parseFloat(entry.toFixed(5)),
            optimalEntry: parseFloat(pd.levels.ote_high.toFixed(5)),
            sl: parseFloat(sl.toFixed(5)),
            tp1: parseFloat(tp1.toFixed(5)),
            tp2: parseFloat(tp2.toFixed(5)),
            tp3: parseFloat(tp3.toFixed(5)),
            confidence: Math.min(95, confidence),
            riskReward: 2.5,
            reasons,
            newsAnalysis,
            analysisData,
            timestamp: Date.now(),
            status: 'active',
            concepts: ['Trendlines', 'SMC/ICT', 'News Sentiment']
        };
    }
}

const smcAnalyzer = new SMCAnalyzer();

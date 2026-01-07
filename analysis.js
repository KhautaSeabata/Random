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
            // PHASE 1: MARKET STRUCTURE
            this.updateProgress(5, 'Identifying market structure...');
            await this.sleep(100);
            this.identifyMarketStructure();
            
            this.updateProgress(10, 'Analyzing structure...');
            await this.sleep(100);
            // Skip trendlines - not drawing them
            // this.drawTrendlines();
            
            this.updateProgress(15, 'Detecting patterns...');
            await this.sleep(100);
            // Skip channels
            // this.detectChannels();
            
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
            points: touchPoints, // For chart drawing
            label: type === 'support' ? 'Support' : 'Resistance'
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
     * SIGNAL GENERATION - ALWAYS generate signal
     */
    async generateSignal(symbol, timeframe) {
        const current = this.candles[this.candles.length - 1];
        const structure = this.analysis.marketStructure;
        const pd = this.analysis.premiumDiscount;
        
        if (!structure || !pd) return null;
        
        // Get news sentiment with timeout
        let newsAnalysis = null;
        let newsConfidence = 0;
        try {
            console.log('📰 Fetching news...');
            const newsPromise = newsAnalyzer.analyzeCurrency(symbol);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('News timeout')), 10000)
            );
            
            newsAnalysis = await Promise.race([newsPromise, timeoutPromise]);
            console.log(`📰 News: ${newsAnalysis.direction} (${newsAnalysis.sentiment})`);
            
            // Calculate news confidence
            if (newsAnalysis.direction === 'BULLISH') {
                newsConfidence = Math.min(100, Math.abs(newsAnalysis.sentiment));
            } else if (newsAnalysis.direction === 'BEARISH') {
                newsConfidence = Math.min(100, Math.abs(newsAnalysis.sentiment));
            } else {
                newsConfidence = 50;
            }
        } catch (error) {
            console.warn('⚠️ News unavailable:', error.message);
            newsConfidence = 0;
        }
        
        let bias = structure.trend;
        let technicalConfidence = 0;
        let smcConfidence = 0;
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
        
        // BULLISH SIGNAL - ALWAYS generate
        if (bias === 'bullish') {
            // TECHNICAL ANALYSIS (Trendlines + S/R)
            if (pd.currentZone === 'discount') {
                technicalConfidence += 30;
                reasons.push('✅ Discount zone');
            }
            
            // Trendlines disabled - using S/R instead
            // const supportLine = this.analysis.trendlines.find(t => t.type === 'support');
            // if (supportLine) {
            //     technicalConfidence += 35;
            //     reasons.push(`✅ Support trendline (${supportLine.touches}x)`);
            // }
            
            // const upChannel = this.analysis.channels.find(c => c.type === 'upward');
            // if (upChannel) {
            //     technicalConfidence += 20;
            //     reasons.push('✅ Upward channel');
            // }
            
            const support = this.analysis.supportResistance.find(sr => sr.type === 'support');
            if (support) {
                technicalConfidence += 50; // Increased weight since no trendlines
                reasons.push(`✅ Support ${support.price.toFixed(2)} (${support.touches}x)`);
            }
            
            // SMC ANALYSIS
            const bullishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bullish' && 
                current.close >= ob.bottom && 
                current.close <= ob.top * 1.02
            );
            if (bullishOB) {
                smcConfidence += 20;
                reasons.push('✅ Bullish order block');
            }
            
            const bullishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bullish' && !fvg.filled
            );
            if (bullishFVG) {
                smcConfidence += 20;
                reasons.push('✅ Bullish FVG');
            }
            
            if (this.analysis.liquidityZones.some(lz => lz.type === 'sell-side' && lz.swept)) {
                smcConfidence += 20;
                reasons.push('✅ Liquidity swept');
            }
            
            if (this.analysis.chochs.some(ch => ch.type === 'bullish')) {
                smcConfidence += 15;
                reasons.push('✅ Bullish CHoCH');
            }
            
            if (this.analysis.wyckoff?.phase === 'accumulation') {
                smcConfidence += 25;
                reasons.push('✅ Wyckoff accumulation');
            }
            
            // NEWS SENTIMENT
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BULLISH') {
                    reasons.push(`📰 Bullish news: +${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.direction === 'BEARISH') {
                    reasons.push(`⚠️ Bearish news: ${newsAnalysis.sentiment}/100`);
                } else {
                    reasons.push(`📰 Neutral news`);
                }
            }
            
            // Calculate overall confidence
            const overallConfidence = Math.round((technicalConfidence + smcConfidence + newsConfidence) / 3);
            
            // ALWAYS CREATE SIGNAL (no minimum requirement)
            return this.createBuySignal(symbol, timeframe, current, overallConfidence, 
                technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData);
        }
        
        // BEARISH SIGNAL - ALWAYS generate
        if (bias === 'bearish') {
            technicalConfidence = 0;
            smcConfidence = 0;
            reasons = [];
            
            // TECHNICAL ANALYSIS
            if (pd.currentZone === 'premium') {
                technicalConfidence += 30;
                reasons.push('✅ Premium zone');
            }
            
            // Trendlines disabled - using S/R instead
            // const resistanceLine = this.analysis.trendlines.find(t => t.type === 'resistance');
            // if (resistanceLine) {
            //     technicalConfidence += 35;
            //     reasons.push(`✅ Resistance trendline (${resistanceLine.touches}x)`);
            // }
            
            // const downChannel = this.analysis.channels.find(c => c.type === 'downward');
            // if (downChannel) {
            //     technicalConfidence += 20;
            //     reasons.push('✅ Downward channel');
            // }
            
            const resistance = this.analysis.supportResistance.find(sr => sr.type === 'resistance');
            if (resistance) {
                technicalConfidence += 50; // Increased weight since no trendlines
                reasons.push(`✅ Resistance ${resistance.price.toFixed(2)} (${resistance.touches}x)`);
            }
            
            // SMC ANALYSIS
            const bearishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bearish' && 
                current.close <= ob.top && 
                current.close >= ob.bottom * 0.98
            );
            if (bearishOB) {
                smcConfidence += 20;
                reasons.push('✅ Bearish order block');
            }
            
            const bearishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bearish' && !fvg.filled
            );
            if (bearishFVG) {
                smcConfidence += 20;
                reasons.push('✅ Bearish FVG');
            }
            
            if (this.analysis.liquidityZones.some(lz => lz.type === 'buy-side' && lz.swept)) {
                smcConfidence += 20;
                reasons.push('✅ Liquidity swept');
            }
            
            if (this.analysis.chochs.some(ch => ch.type === 'bearish')) {
                smcConfidence += 15;
                reasons.push('✅ Bearish CHoCH');
            }
            
            if (this.analysis.wyckoff?.phase === 'distribution') {
                smcConfidence += 25;
                reasons.push('✅ Wyckoff distribution');
            }
            
            // NEWS SENTIMENT
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BEARISH') {
                    reasons.push(`📰 Bearish news: ${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.direction === 'BULLISH') {
                    reasons.push(`⚠️ Bullish news: +${newsAnalysis.sentiment}/100`);
                } else {
                    reasons.push(`📰 Neutral news`);
                }
            }
            
            // Calculate overall confidence
            const overallConfidence = Math.round((technicalConfidence + smcConfidence + newsConfidence) / 3);
            
            // ALWAYS CREATE SIGNAL (no minimum requirement)
            return this.createSellSignal(symbol, timeframe, current, overallConfidence,
                technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData);
        }
        
        return null;
    }

    createBuySignal(symbol, timeframe, current, overallConfidence, technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const decimals = this.getDecimals(symbol);
        const pipValue = this.getPipValue(symbol);
        
        // Find key levels from market structure
        const swings = this.analysis.marketStructure.swings;
        const highs = swings.filter(s => s.type === 'high').slice(-5);
        const lows = swings.filter(s => s.type === 'low').slice(-5);
        const resistance = this.analysis.supportResistance.filter(sr => sr.type === 'resistance' && sr.price > entry);
        const support = this.analysis.supportResistance.filter(sr => sr.type === 'support' && sr.price < entry);
        
        // Calculate SL: Place below recent swing low or nearest support
        let sl;
        if (lows.length > 0) {
            const recentLow = Math.min(...lows.map(s => s.price));
            sl = recentLow - (pipValue * 5); // 5 pips buffer
        } else if (support.length > 0) {
            const nearestSupport = support.reduce((prev, curr) => 
                Math.abs(curr.price - entry) < Math.abs(prev.price - entry) ? curr : prev
            );
            sl = nearestSupport.price - (pipValue * 5);
        } else {
            // Fallback: Use percentage
            sl = entry * 0.995;
        }
        
        // Calculate TPs: Target key resistance levels or Fibonacci extensions
        const slDistance = Math.abs(entry - sl);
        
        let tp1, tp2, tp3;
        
        // TP1: First resistance or 1.5R
        if (resistance.length > 0 && resistance[0].price < entry + (slDistance * 3)) {
            tp1 = resistance[0].price;
        } else {
            tp1 = entry + (slDistance * 1.5);
        }
        
        // TP2: Second resistance or 2.5R
        if (resistance.length > 1 && resistance[1].price < entry + (slDistance * 4)) {
            tp2 = resistance[1].price;
        } else {
            tp2 = entry + (slDistance * 2.5);
        }
        
        // TP3: Third resistance or 4R
        if (resistance.length > 2 && resistance[2].price < entry + (slDistance * 6)) {
            tp3 = resistance[2].price;
        } else if (highs.length > 0) {
            const recentHigh = Math.max(...highs.map(s => s.price));
            if (recentHigh > entry) {
                tp3 = recentHigh + (pipValue * 5); // Beyond recent high
            } else {
                tp3 = entry + (slDistance * 4);
            }
        } else {
            tp3 = entry + (slDistance * 4);
        }
        
        // Calculate ZAR values
        const zarPerPip = this.getZARPerPip(symbol);
        const tp1Pips = Math.round(Math.abs(tp1 - entry) / pipValue);
        const tp2Pips = Math.round(Math.abs(tp2 - entry) / pipValue);
        const tp3Pips = Math.round(Math.abs(tp3 - entry) / pipValue);
        const slPips = Math.round(Math.abs(entry - sl) / pipValue);
        const tp1ZAR = Math.round(tp1Pips * zarPerPip);
        const tp2ZAR = Math.round(tp2Pips * zarPerPip);
        const tp3ZAR = Math.round(tp3Pips * zarPerPip);
        const slZAR = Math.round(slPips * zarPerPip);
        
        return {
            symbol,
            timeframe,
            timeframeName: this.getTimeframeName(timeframe),
            action: 'BUY',
            bias: 'bullish',
            entry: parseFloat(entry.toFixed(decimals)),
            entryTriggered: false, // Track if entry was hit
            optimalEntry: parseFloat(pd.levels.ote_low.toFixed(decimals)),
            sl: parseFloat(sl.toFixed(decimals)),
            tp1: parseFloat(tp1.toFixed(decimals)),
            tp2: parseFloat(tp2.toFixed(decimals)),
            tp3: parseFloat(tp3.toFixed(decimals)),
            tp1Pips: tp1Pips,
            tp2Pips: tp2Pips,
            tp3Pips: tp3Pips,
            slPips: slPips,
            tp1ZAR: tp1ZAR,
            tp2ZAR: tp2ZAR,
            tp3ZAR: tp3ZAR,
            slZAR: slZAR,
            decimals: decimals,
            confidence: overallConfidence,
            technicalConfidence: Math.min(100, technicalConfidence),
            smcConfidence: Math.min(100, smcConfidence),
            sentimentConfidence: Math.min(100, newsConfidence),
            riskReward: parseFloat((tp2Pips / slPips).toFixed(2)),
            reasons,
            newsAnalysis,
            analysisData,
            timestamp: Date.now(),
            status: 'active',
            concepts: ['Trendlines', 'SMC/ICT', 'News Sentiment']
        };
    }

    createSellSignal(symbol, timeframe, current, overallConfidence, technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const decimals = this.getDecimals(symbol);
        const pipValue = this.getPipValue(symbol);
        
        // Find key levels from market structure
        const swings = this.analysis.marketStructure.swings;
        const highs = swings.filter(s => s.type === 'high').slice(-5);
        const lows = swings.filter(s => s.type === 'low').slice(-5);
        const resistance = this.analysis.supportResistance.filter(sr => sr.type === 'resistance' && sr.price > entry);
        const support = this.analysis.supportResistance.filter(sr => sr.type === 'support' && sr.price < entry);
        
        // Calculate SL: Place above recent swing high or nearest resistance
        let sl;
        if (highs.length > 0) {
            const recentHigh = Math.max(...highs.map(s => s.price));
            sl = recentHigh + (pipValue * 5); // 5 pips buffer
        } else if (resistance.length > 0) {
            const nearestResistance = resistance.reduce((prev, curr) => 
                Math.abs(curr.price - entry) < Math.abs(prev.price - entry) ? curr : prev
            );
            sl = nearestResistance.price + (pipValue * 5);
        } else {
            // Fallback: Use percentage
            sl = entry * 1.005;
        }
        
        // Calculate TPs: Target key support levels or Fibonacci extensions
        const slDistance = Math.abs(sl - entry);
        
        let tp1, tp2, tp3;
        
        // TP1: First support or 1.5R
        if (support.length > 0 && support[support.length - 1].price > entry - (slDistance * 3)) {
            tp1 = support[support.length - 1].price;
        } else {
            tp1 = entry - (slDistance * 1.5);
        }
        
        // TP2: Second support or 2.5R
        if (support.length > 1 && support[support.length - 2].price > entry - (slDistance * 4)) {
            tp2 = support[support.length - 2].price;
        } else {
            tp2 = entry - (slDistance * 2.5);
        }
        
        // TP3: Third support or 4R
        if (support.length > 2 && support[support.length - 3].price > entry - (slDistance * 6)) {
            tp3 = support[support.length - 3].price;
        } else if (lows.length > 0) {
            const recentLow = Math.min(...lows.map(s => s.price));
            if (recentLow < entry) {
                tp3 = recentLow - (pipValue * 5); // Beyond recent low
            } else {
                tp3 = entry - (slDistance * 4);
            }
        } else {
            tp3 = entry - (slDistance * 4);
        }
        
        // Calculate ZAR values
        const zarPerPip = this.getZARPerPip(symbol);
        const tp1Pips = Math.round(Math.abs(entry - tp1) / pipValue);
        const tp2Pips = Math.round(Math.abs(entry - tp2) / pipValue);
        const tp3Pips = Math.round(Math.abs(entry - tp3) / pipValue);
        const slPips = Math.round(Math.abs(sl - entry) / pipValue);
        const tp1ZAR = Math.round(tp1Pips * zarPerPip);
        const tp2ZAR = Math.round(tp2Pips * zarPerPip);
        const tp3ZAR = Math.round(tp3Pips * zarPerPip);
        const slZAR = Math.round(slPips * zarPerPip);
        
        return {
            symbol,
            timeframe,
            timeframeName: this.getTimeframeName(timeframe),
            action: 'SELL',
            bias: 'bearish',
            entry: parseFloat(entry.toFixed(decimals)),
            entryTriggered: false, // Track if entry was hit
            optimalEntry: parseFloat(pd.levels.ote_high.toFixed(decimals)),
            sl: parseFloat(sl.toFixed(decimals)),
            tp1: parseFloat(tp1.toFixed(decimals)),
            tp2: parseFloat(tp2.toFixed(decimals)),
        const slZAR = Math.round(Math.abs((sl - entry) / pipValue) * zarPerPip);
        
        return {
            symbol,
            timeframe,
            timeframeName: this.getTimeframeName(timeframe),
            action: 'SELL',
            bias: 'bearish',
            entry: parseFloat(entry.toFixed(decimals)),
            optimalEntry: parseFloat(pd.levels.ote_high.toFixed(decimals)),
            sl: parseFloat(sl.toFixed(decimals)),
            tp1: parseFloat(tp1.toFixed(decimals)),
            tp2: parseFloat(tp2.toFixed(decimals)),
            tp3: parseFloat(tp3.toFixed(decimals)),
            tp1Pips: tp1Pips,
            tp2Pips: tp2Pips,
            tp3Pips: tp3Pips,
            slPips: slPips,
            tp1ZAR: tp1ZAR,
            tp2ZAR: tp2ZAR,
            tp3ZAR: tp3ZAR,
            slZAR: slZAR,
            decimals: decimals,
            confidence: overallConfidence,
            technicalConfidence: Math.min(100, technicalConfidence),
            smcConfidence: Math.min(100, smcConfidence),
            sentimentConfidence: Math.min(100, newsConfidence),
            riskReward: parseFloat((tp2Pips / slPips).toFixed(2)),
            reasons,
            newsAnalysis,
            analysisData,
            timestamp: Date.now(),
            status: 'active',
            concepts: ['Trendlines', 'SMC/ICT', 'News Sentiment']
        };
    }

    getDecimals(symbol) {
        // Decimal places for different instruments
        const decimalPlaces = {
            'XAUUSD': 2,    // Gold: 2 decimals (2650.00)
            'BTCUSD': 2,    // Bitcoin: 2 decimals (45000.00)
            'USDJPY': 2,    // USD/JPY: 2 decimals (150.00)
            'EURUSD': 4,    // EUR/USD: 4 decimals (1.0500)
            'GBPUSD': 4,    // GBP/USD: 4 decimals (1.2500)
            'USDCAD': 4,    // USD/CAD: 4 decimals (1.3500)
            'AUDUSD': 4,    // AUD/USD: 4 decimals (0.6500)
            'AUDCAD': 4     // AUD/CAD: 4 decimals (0.9000)
        };
        
        return decimalPlaces[symbol] || 4; // Default to 4 decimals
    }

    getPipValue(symbol) {
        // Pip values for different instruments
        const pipValues = {
            'XAUUSD': 0.01,    // Gold: 1 pip = 0.01
            'BTCUSD': 1.0,     // Bitcoin: 1 pip = 1.0
            'EURUSD': 0.0001,  // EUR/USD: 1 pip = 0.0001
            'GBPUSD': 0.0001,  // GBP/USD: 1 pip = 0.0001
            'USDCAD': 0.0001,  // USD/CAD: 1 pip = 0.0001
            'AUDUSD': 0.0001,  // AUD/USD: 1 pip = 0.0001
            'AUDCAD': 0.0001,  // AUD/CAD: 1 pip = 0.0001
            'USDJPY': 0.01     // USD/JPY: 1 pip = 0.01
        };
        
        return pipValues[symbol] || 0.0001;
    }

    getZARPerPip(symbol) {
        // ZAR profit per pip at 0.01 lot size (standard account)
        // Based on: (Contract size × Lot size × Pip value) × USD/ZAR rate
        // Assuming USD/ZAR ≈ 18.50
        
        const zarRate = 18.50; // USD to ZAR exchange rate
        
        const pipProfits = {
            // Major Forex Pairs (100,000 units per lot)
            'EURUSD': 0.0001 * 1000 * zarRate,    // ~1.85 ZAR/pip
            'GBPUSD': 0.0001 * 1000 * zarRate,    // ~1.85 ZAR/pip
            'USDCAD': 0.0001 * 1000 * zarRate,    // ~1.85 ZAR/pip
            'AUDUSD': 0.0001 * 1000 * zarRate,    // ~1.85 ZAR/pip
            'AUDCAD': 0.0001 * 1000 * zarRate,    // ~1.85 ZAR/pip
            'USDJPY': 0.01 * 1000 * zarRate,      // ~185 ZAR/pip
            
            // Gold (100 oz per lot)
            'XAUUSD': 0.01 * 100 * zarRate,       // ~18.50 ZAR/pip
            
            // Bitcoin (1 BTC per lot at 0.01 = 0.01 BTC)
            'BTCUSD': 1.0 * 0.01 * zarRate        // ~0.185 ZAR/pip
        };
        
        return pipProfits[symbol] || 1.85; // Default to forex pair
    }

    getTimeframeName(timeframe) {
        const names = {
            60: '1 Minute',
            300: '5 Minutes',
            900: '15 Minutes',
            1800: '30 Minutes',
            3600: '1 Hour',
            14400: '4 Hours',
            86400: '1 Day'
        };
        return names[timeframe] || `${timeframe}s`;
    }
}

const smcAnalyzer = new SMCAnalyzer();

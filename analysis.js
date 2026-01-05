/**
 * PROFESSIONAL SMC/ICT ANALYSIS ENGINE
 * Advanced pattern detection like zoom_trader style
 */

class SMCAnalyzer {
    constructor() {
        this.candles = [];
        this.analysis = {
            marketStructure: null,
            orderBlocks: [],
            fvgs: [],
            liquidityZones: [],
            trendlines: [],
            supportResistance: [],
            premiumDiscount: null,
            wyckoff: null,
            patterns: [],
            channels: [],
            breakouts: []
        };
    }

    /**
     * Enhanced analysis with pattern detection
     */
    async analyze(candles, symbol, timeframe) {
        if (!candles || candles.length < 100) {
            console.warn('⚠️ Not enough candles for SMC analysis');
            return null;
        }

        this.candles = candles;
        console.log('🔍 Starting professional SMC analysis...');
        
        try {
            // Core SMC analysis
            this.identifyMarketStructure();
            this.findOrderBlocks();
            this.detectFairValueGaps();
            this.findLiquidityZones();
            this.drawTrendlines();
            this.findSupportResistance();
            this.calculatePremiumDiscount();
            this.analyzeWyckoff();
            
            // Advanced pattern detection
            this.detectChannels();
            this.detectBreakouts();
            this.findRetestZones();
            this.detectChoCH();
            
            // Generate signal with news
            const signal = await this.generateSignal(symbol, timeframe);
            
            console.log('✅ Professional SMC analysis complete');
            return signal;
        } catch (error) {
            console.error('❌ SMC analysis error:', error);
            throw error;
        }
    }

    /**
     * Get drawable elements for chart
     */
    getDrawables() {
        return {
            orderBlocks: this.analysis.orderBlocks || [],
            fvgs: this.analysis.fvgs || [],
            liquidityZones: this.analysis.liquidityZones || [],
            trendlines: this.analysis.trendlines || [],
            supportResistance: this.analysis.supportResistance || [],
            premiumDiscount: this.analysis.premiumDiscount || null,
            channels: this.analysis.channels || [],
            breakouts: this.analysis.breakouts || [],
            patterns: this.analysis.patterns || []
        };
    }

    /**
     * 1. MARKET STRUCTURE with BOS/CHoCH detection
     */
    identifyMarketStructure() {
        const swings = this.findSwingPoints();
        let higherHighs = 0;
        let lowerLows = 0;
        let bos = [];
        let choch = [];

        for (let i = 2; i < swings.length; i++) {
            const prev = swings[i-2];
            const curr = swings[i];
            
            if (curr.type === 'high') {
                if (curr.price > prev.price) {
                    higherHighs++;
                    bos.push({ index: curr.index, type: 'bullish', price: curr.price });
                } else if (curr.price < prev.price) {
                    choch.push({ index: curr.index, type: 'bearish', price: curr.price });
                }
            }
            
            if (curr.type === 'low') {
                if (curr.price < prev.price) {
                    lowerLows++;
                    bos.push({ index: curr.index, type: 'bearish', price: curr.price });
                } else if (curr.price > prev.price) {
                    choch.push({ index: curr.index, type: 'bullish', price: curr.price });
                }
            }
        }

        const trend = higherHighs > lowerLows ? 'bullish' : 
                     lowerLows > higherHighs ? 'bearish' : 'ranging';

        this.analysis.marketStructure = {
            trend,
            swings,
            bos: bos.slice(-5),
            choch: choch.slice(-3),
            hasChoch: choch.length > 0
        };
    }

    findSwingPoints() {
        const swings = [];
        const period = 5;

        for (let i = period; i < this.candles.length - period; i++) {
            const current = this.candles[i];
            let isHigh = true;
            let isLow = true;

            for (let j = 1; j <= period; j++) {
                if (this.candles[i-j].high >= current.high || 
                    this.candles[i+j].high >= current.high) {
                    isHigh = false;
                }
                if (this.candles[i-j].low <= current.low || 
                    this.candles[i+j].low <= current.low) {
                    isLow = false;
                }
            }

            if (isHigh) {
                swings.push({ type: 'high', price: current.high, index: i });
            }
            if (isLow) {
                swings.push({ type: 'low', price: current.low, index: i });
            }
        }

        return swings;
    }

    /**
     * 2. ENHANCED ORDER BLOCKS (Like zoom_trader style)
     */
    findOrderBlocks() {
        const orderBlocks = [];
        
        for (let i = 10; i < this.candles.length - 3; i++) {
            const prev = this.candles[i];
            const next = this.candles[i + 1];
            const next2 = this.candles[i + 2];
            
            // Bullish OB with confirmation
            if (prev.close < prev.open && next.close > next.open) {
                const move = (next.close - next.open) / next.open;
                if (move > 0.002) {
                    const strength = this.calculateOBStrength(i, 'bullish');
                    orderBlocks.push({
                        type: 'bullish',
                        top: prev.high,
                        bottom: prev.low,
                        index: i,
                        strength: strength,
                        tested: false,
                        label: strength > 75 ? 'Strong OB' : 'Order Block'
                    });
                }
            }
            
            // Bearish OB with confirmation
            if (prev.close > prev.open && next.close < next.open) {
                const move = (next.open - next.close) / next.open;
                if (move > 0.002) {
                    const strength = this.calculateOBStrength(i, 'bearish');
                    orderBlocks.push({
                        type: 'bearish',
                        top: prev.high,
                        bottom: prev.low,
                        index: i,
                        strength: strength,
                        tested: false,
                        label: strength > 75 ? 'Strong OB' : 'Order Block'
                    });
                }
            }
        }
        
        this.analysis.orderBlocks = orderBlocks
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 15);
    }

    calculateOBStrength(index, type) {
        let strength = 50;
        const ob = this.candles[index];
        const nextCandles = this.candles.slice(index + 1, index + 6);
        
        // Volume strength (if available)
        if (ob.volume) {
            const avgVolume = this.candles.slice(index - 10, index).reduce((sum, c) => sum + (c.volume || 0), 0) / 10;
            if (ob.volume > avgVolume * 1.5) strength += 20;
        }
        
        // Follow-through strength
        const followThrough = nextCandles.filter(c => 
            type === 'bullish' ? c.close > c.open : c.close < c.open
        ).length;
        strength += followThrough * 5;
        
        return Math.min(100, strength);
    }

    /**
     * 3. FAIR VALUE GAPS with tracking
     */
    detectFairValueGaps() {
        const fvgs = [];
        
        for (let i = 1; i < this.candles.length - 1; i++) {
            const prev = this.candles[i - 1];
            const current = this.candles[i];
            const next = this.candles[i + 1];
            
            // Bullish FVG
            if (prev.high < next.low) {
                const gap = next.low - prev.high;
                const filled = this.checkFVGFilled(i, 'bullish', prev.high, next.low);
                
                fvgs.push({
                    type: 'bullish',
                    top: next.low,
                    bottom: prev.high,
                    index: i,
                    size: gap,
                    filled: filled,
                    label: 'FVG'
                });
            }
            
            // Bearish FVG
            if (prev.low > next.high) {
                const gap = prev.low - next.high;
                const filled = this.checkFVGFilled(i, 'bearish', next.high, prev.low);
                
                fvgs.push({
                    type: 'bearish',
                    top: prev.low,
                    bottom: next.high,
                    index: i,
                    size: gap,
                    filled: filled,
                    label: 'FVG'
                });
            }
        }
        
        this.analysis.fvgs = fvgs.slice(-20);
    }

    checkFVGFilled(fvgIndex, type, bottom, top) {
        for (let i = fvgIndex + 1; i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (type === 'bullish' && candle.low <= bottom) return true;
            if (type === 'bearish' && candle.high >= top) return true;
        }
        return false;
    }

    /**
     * 4. LIQUIDITY ZONES with sweep detection
     */
    findLiquidityZones() {
        const zones = [];
        const swings = this.analysis.marketStructure?.swings || [];
        
        swings.forEach((swing, idx) => {
            const swept = this.checkLiquiditySwept(swing);
            
            zones.push({
                type: swing.type === 'high' ? 'buy-side' : 'sell-side',
                price: swing.price,
                index: swing.index,
                swept: swept,
                label: swept ? 'Liquidity Swept' : 'Liquidity'
            });
        });
        
        this.analysis.liquidityZones = zones.slice(-12);
    }

    checkLiquiditySwept(swing) {
        const tolerance = 0.001;
        for (let i = swing.index + 1; i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (swing.type === 'high' && candle.high > swing.price * (1 + tolerance)) {
                return true;
            }
            if (swing.type === 'low' && candle.low < swing.price * (1 - tolerance)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 5. TREND CHANNELS (Like zoom_trader)
     */
    detectChannels() {
        const channels = [];
        const swings = this.analysis.marketStructure?.swings || [];
        
        // Bullish channel
        const lows = swings.filter(s => s.type === 'low').slice(-4);
        if (lows.length >= 2) {
            channels.push({
                type: 'bullish',
                points: lows,
                label: 'Bullish Channel'
            });
        }
        
        // Bearish channel
        const highs = swings.filter(s => s.type === 'high').slice(-4);
        if (highs.length >= 2) {
            channels.push({
                type: 'bearish',
                points: highs,
                label: 'Bearish Channel'
            });
        }
        
        this.analysis.channels = channels;
    }

    /**
     * 6. TRENDLINES with extensions
     */
    drawTrendlines() {
        const trendlines = [];
        const swings = this.analysis.marketStructure?.swings || [];
        
        // Support trendline
        const lows = swings.filter(s => s.type === 'low').slice(-6);
        if (lows.length >= 2) {
            trendlines.push({
                type: 'support',
                points: lows,
                label: 'Trend Support'
            });
        }
        
        // Resistance trendline
        const highs = swings.filter(s => s.type === 'high').slice(-6);
        if (highs.length >= 2) {
            trendlines.push({
                type: 'resistance',
                points: highs,
                label: 'Trend Resistance'
            });
        }
        
        this.analysis.trendlines = trendlines;
    }

    /**
     * 7. BREAKOUT DETECTION
     */
    detectBreakouts() {
        const breakouts = [];
        const recent = this.candles.slice(-50);
        const highs = recent.map(c => c.high);
        const lows = recent.map(c => c.low);
        const resistance = Math.max(...highs.slice(0, -10));
        const support = Math.min(...lows.slice(0, -10));
        
        const current = this.candles[this.candles.length - 1];
        
        if (current.close > resistance * 1.002) {
            breakouts.push({
                type: 'bullish',
                price: resistance,
                index: this.candles.length - 1,
                label: 'Breakout'
            });
        }
        
        if (current.close < support * 0.998) {
            breakouts.push({
                type: 'bearish',
                price: support,
                index: this.candles.length - 1,
                label: 'Breakout'
            });
        }
        
        this.analysis.breakouts = breakouts;
    }

    /**
     * 8. RETEST ZONES
     */
    findRetestZones() {
        const patterns = [];
        const breakouts = this.analysis.breakouts || [];
        
        breakouts.forEach(bo => {
            const retested = this.checkRetest(bo);
            if (retested) {
                patterns.push({
                    type: 'retest',
                    price: bo.price,
                    direction: bo.type,
                    label: 'Retest & Go'
                });
            }
        });
        
        this.analysis.patterns = patterns;
    }

    checkRetest(breakout) {
        const tolerance = 0.005;
        for (let i = breakout.index + 1; i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (Math.abs(candle.close - breakout.price) / breakout.price < tolerance) {
                return true;
            }
        }
        return false;
    }

    /**
     * 9. CHoCH DETECTION
     */
    detectChoCH() {
        // Already done in market structure
        const structure = this.analysis.marketStructure;
        if (structure && structure.choch.length > 0) {
            structure.choch.forEach(ch => {
                this.analysis.patterns.push({
                    type: 'choch',
                    price: ch.price,
                    index: ch.index,
                    direction: ch.type,
                    label: 'CHoCH'
                });
            });
        }
    }

    /**
     * 10. SUPPORT/RESISTANCE with strength
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
                    levels.push({ 
                        price, 
                        touches: 1, 
                        type: 'resistance',
                        lastTouch: i
                    });
                }
            });
        });
        
        // Classify as support or resistance
        const current = this.candles[this.candles.length - 1].close;
        levels.forEach(level => {
            level.type = level.price > current ? 'resistance' : 'support';
        });
        
        this.analysis.supportResistance = levels
            .filter(l => l.touches >= 3)
            .sort((a, b) => b.touches - a.touches)
            .slice(0, 8)
            .map(l => ({
                ...l,
                label: `${l.type.toUpperCase()} (${l.touches}x)`
            }));
    }

    /**
     * 11. PREMIUM/DISCOUNT with Fibonacci
     */
    calculatePremiumDiscount() {
        const recent = this.candles.slice(-100);
        const high = Math.max(...recent.map(c => c.high));
        const low = Math.min(...recent.map(c => c.low));
        const range = high - low;
        
        const levels = {
            high: high,
            fib786: high - (range * 0.214),   // 78.6%
            fib618: high - (range * 0.382),   // 61.8%
            equilibrium: high - (range * 0.5), // 50%
            fib382: high - (range * 0.618),   // 38.2%
            fib236: high - (range * 0.764),   // 23.6%
            low: low,
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
     * 12. WYCKOFF PHASE
     */
    analyzeWyckoff() {
        const recent = this.candles.slice(-30);
        const volume = recent.map(c => c.volume || 0);
        const avgVolume = volume.reduce((a, b) => a + b, 0) / volume.length;
        
        const priceChange = (recent[recent.length-1].close - recent[0].close) / recent[0].close;
        const volumeChange = (recent[recent.length-1].volume || 1) / (avgVolume || 1);
        
        let phase = 'neutral';
        let confidence = 50;
        
        // Accumulation: Price sideways/down with low volume
        if (Math.abs(priceChange) < 0.03 && volumeChange < 0.8) {
            phase = 'accumulation';
            confidence = 75;
        }
        // Distribution: Price sideways/up with low volume
        else if (priceChange > 0 && volumeChange < 0.8) {
            phase = 'distribution';
            confidence = 75;
        }
        // Markup: Price up with high volume
        else if (priceChange > 0.05 && volumeChange > 1.2) {
            phase = 'markup';
            confidence = 80;
        }
        // Markdown: Price down with high volume
        else if (priceChange < -0.05 && volumeChange > 1.2) {
            phase = 'markdown';
            confidence = 80;
        }
        
        this.analysis.wyckoff = { phase, confidence };
    }

    /**
     * SIGNAL GENERATION with comprehensive analysis
     */
    async generateSignal(symbol, timeframe) {
        const current = this.candles[this.candles.length - 1];
        const structure = this.analysis.marketStructure;
        const pd = this.analysis.premiumDiscount;
        
        if (!structure || !pd) {
            console.warn('⚠️ Incomplete analysis');
            return null;
        }
        
        // Get news analysis
        let newsAnalysis = null;
        try {
            console.log('📰 Fetching news...');
            newsAnalysis = await newsAnalyzer.analyzeCurrency(symbol);
            console.log(`📊 News: ${newsAnalysis.direction} (${newsAnalysis.sentiment})`);
        } catch (error) {
            console.warn('⚠️ News failed:', error.message);
        }
        
        let bias = structure.trend;
        let confidence = 0;
        let reasons = [];
        let analysisData = {
            orderBlocks: this.analysis.orderBlocks.slice(0, 5),
            fvgs: this.analysis.fvgs.filter(f => !f.filled).slice(0, 5),
            liquidityZones: this.analysis.liquidityZones.slice(0, 5),
            supportResistance: this.analysis.supportResistance.slice(0, 5),
            patterns: this.analysis.patterns,
            wyckoff: this.analysis.wyckoff
        };
        
        // BULLISH SIGNAL
        if (bias === 'bullish' || structure.hasChoch) {
            if (pd.currentZone === 'discount') {
                confidence += 25;
                reasons.push('✅ Price in discount zone (61.8-38.2%)');
            }
            
            const bullishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bullish' && !ob.tested &&
                current.close >= ob.bottom && current.close <= ob.top * 1.02
            );
            if (bullishOB) {
                confidence += 20;
                reasons.push(`✅ Bullish order block at ${bullishOB.bottom.toFixed(2)}`);
            }
            
            const bullishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bullish' && !fvg.filled
            );
            if (bullishFVG) {
                confidence += 15;
                reasons.push('✅ Unfilled bullish FVG support');
            }
            
            const liquiditySwept = this.analysis.liquidityZones.find(lz => 
                lz.type === 'sell-side' && lz.swept
            );
            if (liquiditySwept) {
                confidence += 15;
                reasons.push('✅ Sell-side liquidity swept');
            }
            
            const support = this.analysis.supportResistance.find(sr => 
                sr.type === 'support'
            );
            if (support) {
                confidence += 10;
                reasons.push(`✅ Support at ${support.price.toFixed(2)} (${support.touches}x)`);
            }
            
            if (this.analysis.wyckoff?.phase === 'accumulation') {
                confidence += 15;
                reasons.push('✅ Wyckoff accumulation phase');
            }
            
            // NEWS
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BULLISH') {
                    confidence += 15;
                    reasons.push(`📰 Bullish news: +${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.direction === 'BEARISH') {
                    confidence -= 20;
                    reasons.push(`⚠️ News contradicts: ${newsAnalysis.sentiment}/100`);
                }
                
                if (newsAnalysis.volatility > 60) {
                    reasons.push(`⚡ HIGH VOLATILITY: ${newsAnalysis.volatility}/100`);
                }
            }
            
            if (confidence >= 65) {
                return this.createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData);
            }
        }
        
        // BEARISH SIGNAL
        if (bias === 'bearish' || structure.hasChoch) {
            confidence = 0;
            reasons = [];
            
            if (pd.currentZone === 'premium') {
                confidence += 25;
                reasons.push('✅ Price in premium zone (61.8-100%)');
            }
            
            const bearishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bearish' && !ob.tested &&
                current.close <= ob.top && current.close >= ob.bottom * 0.98
            );
            if (bearishOB) {
                confidence += 20;
                reasons.push(`✅ Bearish order block at ${bearishOB.top.toFixed(2)}`);
            }
            
            const bearishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bearish' && !fvg.filled
            );
            if (bearishFVG) {
                confidence += 15;
                reasons.push('✅ Unfilled bearish FVG resistance');
            }
            
            const liquiditySwept = this.analysis.liquidityZones.find(lz => 
                lz.type === 'buy-side' && lz.swept
            );
            if (liquiditySwept) {
                confidence += 15;
                reasons.push('✅ Buy-side liquidity swept');
            }
            
            const resistance = this.analysis.supportResistance.find(sr => 
                sr.type === 'resistance'
            );
            if (resistance) {
                confidence += 10;
                reasons.push(`✅ Resistance at ${resistance.price.toFixed(2)} (${resistance.touches}x)`);
            }
            
            if (this.analysis.wyckoff?.phase === 'distribution') {
                confidence += 15;
                reasons.push('✅ Wyckoff distribution phase');
            }
            
            // NEWS
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BEARISH') {
                    confidence += 15;
                    reasons.push(`📰 Bearish news: ${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.direction === 'BULLISH') {
                    confidence -= 20;
                    reasons.push(`⚠️ News contradicts: +${newsAnalysis.sentiment}/100`);
                }
                
                if (newsAnalysis.volatility > 60) {
                    reasons.push(`⚡ HIGH VOLATILITY: ${newsAnalysis.volatility}/100`);
                }
            }
            
            if (confidence >= 65) {
                return this.createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData);
            }
        }
        
        console.log(`⚠️ No valid signal (confidence: ${confidence}/100)`);
        return null;
    }

    createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const optimalEntry = pd.levels.ote_low;
        
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'low');
        const recentLow = swings.length > 0 ? Math.min(...swings.slice(-3).map(s => s.price)) : entry * 0.98;
        let sl = recentLow * 0.995;
        
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            sl = sl * 0.98;
        }
        
        const riskAmount = entry - sl;
        let tp1 = entry + (riskAmount * 1.5);
        let tp2 = entry + (riskAmount * 2.5);
        let tp3 = entry + (riskAmount * 4.0);
        
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            tp1 = entry + (riskAmount * 2.0);
            tp2 = entry + (riskAmount * 3.0);
            tp3 = entry + (riskAmount * 5.0);
        }
        
        return {
            symbol,
            timeframe,
            action: 'BUY',
            bias: 'bullish',
            entry: parseFloat(entry.toFixed(5)),
            optimalEntry: parseFloat(optimalEntry.toFixed(5)),
            sl: parseFloat(sl.toFixed(5)),
            tp1: parseFloat(tp1.toFixed(5)),
            tp2: parseFloat(tp2.toFixed(5)),
            tp3: parseFloat(tp3.toFixed(5)),
            confidence: Math.min(95, confidence),
            riskReward: 2.5,
            reasons: reasons,
            newsAnalysis: newsAnalysis || null,
            analysisData: analysisData,
            timestamp: Date.now(),
            status: 'active',
            concepts: ['SMC', 'ICT', 'CTR', 'Wyckoff', 'News']
        };
    }

    createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const optimalEntry = pd.levels.ote_high;
        
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'high');
        const recentHigh = swings.length > 0 ? Math.max(...swings.slice(-3).map(s => s.price)) : entry * 1.02;
        let sl = recentHigh * 1.005;
        
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            sl = sl * 1.02;
        }
        
        const riskAmount = sl - entry;
        let tp1 = entry - (riskAmount * 1.5);
        let tp2 = entry - (riskAmount * 2.5);
        let tp3 = entry - (riskAmount * 4.0);
        
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            tp1 = entry - (riskAmount * 2.0);
            tp2 = entry - (riskAmount * 3.0);
            tp3 = entry - (riskAmount * 5.0);
        }
        
        return {
            symbol,
            timeframe,
            action: 'SELL',
            bias: 'bearish',
            entry: parseFloat(entry.toFixed(5)),
            optimalEntry: parseFloat(optimalEntry.toFixed(5)),
            sl: parseFloat(sl.toFixed(5)),
            tp1: parseFloat(tp1.toFixed(5)),
            tp2: parseFloat(tp2.toFixed(5)),
            tp3: parseFloat(tp3.toFixed(5)),
            confidence: Math.min(95, confidence),
            riskReward: 2.5,
            reasons: reasons,
            newsAnalysis: newsAnalysis || null,
            analysisData: analysisData,
            timestamp: Date.now(),
            status: 'active',
            concepts: ['SMC', 'ICT', 'CTR', 'Wyckoff', 'News']
        };
    }
}

const smcAnalyzer = new SMCAnalyzer();

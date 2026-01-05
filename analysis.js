/**
 * SMART MONEY CONCEPTS (SMC) ANALYSIS
 * Based on ICT (Inner Circle Trader) and CTR (Concept Trading Refined)
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
            wyckoff: null
        };
    }

    /**
     * Main analysis function (async for news)
     */
    async analyze(candles, symbol, timeframe) {
        if (!candles || candles.length < 100) {
            console.warn('⚠️ Not enough candles for SMC analysis');
            return null;
        }

        this.candles = candles;
        console.log('🔍 Starting SMC analysis...');
        
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
            
            // Generate signal (now async for news)
            const signal = await this.generateSignal(symbol, timeframe);
            
            console.log('✅ SMC analysis complete');
            return signal;
        } catch (error) {
            console.error('❌ SMC analysis error:', error);
            throw error; // Re-throw to handle in caller
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
            premiumDiscount: this.analysis.premiumDiscount || null
        };
    }

    /**
     * 1. MARKET STRUCTURE
     */
    identifyMarketStructure() {
        const swings = this.findSwingPoints();
        let higherHighs = 0;
        let lowerLows = 0;

        for (let i = 1; i < swings.length; i++) {
            if (swings[i].type === 'high' && swings[i].price > swings[i-1].price) {
                higherHighs++;
            }
            if (swings[i].type === 'low' && swings[i].price < swings[i-1].price) {
                lowerLows++;
            }
        }

        const trend = higherHighs > lowerLows ? 'bullish' : 
                     lowerLows > higherHighs ? 'bearish' : 'ranging';

        this.analysis.marketStructure = {
            trend,
            swings,
            bos: false,
            choch: trend !== 'ranging'
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
     * 2. ORDER BLOCKS
     */
    findOrderBlocks() {
        const orderBlocks = [];
        
        for (let i = 10; i < this.candles.length - 1; i++) {
            const prev = this.candles[i];
            const next = this.candles[i + 1];
            
            // Bullish OB: Last bearish candle before strong bullish move
            if (prev.close < prev.open && next.close > next.open) {
                const move = (next.close - next.open) / next.open;
                if (move > 0.003) { // 0.3% move
                    orderBlocks.push({
                        type: 'bullish',
                        top: prev.high,
                        bottom: prev.low,
                        index: i,
                        strength: move * 100
                    });
                }
            }
            
            // Bearish OB: Last bullish candle before strong bearish move
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
        
        // Keep last 10 strongest
        this.analysis.orderBlocks = orderBlocks
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 10);
    }

    /**
     * 3. FAIR VALUE GAPS
     */
    detectFairValueGaps() {
        const fvgs = [];
        
        for (let i = 1; i < this.candles.length - 1; i++) {
            const prev = this.candles[i - 1];
            const current = this.candles[i];
            const next = this.candles[i + 1];
            
            // Bullish FVG: Gap between prev high and next low
            if (prev.high < next.low) {
                fvgs.push({
                    type: 'bullish',
                    top: next.low,
                    bottom: prev.high,
                    index: i,
                    filled: false
                });
            }
            
            // Bearish FVG: Gap between prev low and next high
            if (prev.low > next.high) {
                fvgs.push({
                    type: 'bearish',
                    top: prev.low,
                    bottom: next.high,
                    index: i,
                    filled: false
                });
            }
        }
        
        this.analysis.fvgs = fvgs.slice(-15);
    }

    /**
     * 4. LIQUIDITY ZONES
     */
    findLiquidityZones() {
        const zones = [];
        const swings = this.analysis.marketStructure?.swings || [];
        
        swings.forEach((swing, idx) => {
            if (swing.type === 'high') {
                zones.push({
                    type: 'buy-side',
                    price: swing.price,
                    index: swing.index,
                    swept: false
                });
            } else {
                zones.push({
                    type: 'sell-side',
                    price: swing.price,
                    index: swing.index,
                    swept: false
                });
            }
        });
        
        this.analysis.liquidityZones = zones.slice(-10);
    }

    /**
     * 5. TRENDLINES
     */
    drawTrendlines() {
        const swings = this.analysis.marketStructure?.swings || [];
        const trendlines = [];
        
        // Support trendline (connect lows)
        const lows = swings.filter(s => s.type === 'low').slice(-5);
        if (lows.length >= 2) {
            trendlines.push({
                type: 'support',
                points: lows
            });
        }
        
        // Resistance trendline (connect highs)
        const highs = swings.filter(s => s.type === 'high').slice(-5);
        if (highs.length >= 2) {
            trendlines.push({
                type: 'resistance',
                points: highs
            });
        }
        
        this.analysis.trendlines = trendlines;
    }

    /**
     * 6. SUPPORT/RESISTANCE
     */
    findSupportResistance() {
        const levels = [];
        const tolerance = 0.002; // 0.2%
        
        this.candles.forEach((candle, i) => {
            const price = candle.close;
            const existing = levels.find(l => 
                Math.abs(l.price - price) / price < tolerance
            );
            
            if (existing) {
                existing.touches++;
            } else {
                levels.push({ price, touches: 1, type: 'support' });
            }
        });
        
        this.analysis.supportResistance = levels
            .filter(l => l.touches >= 3)
            .sort((a, b) => b.touches - a.touches)
            .slice(0, 5);
    }

    /**
     * 7. PREMIUM/DISCOUNT
     */
    calculatePremiumDiscount() {
        const recent = this.candles.slice(-50);
        const high = Math.max(...recent.map(c => c.high));
        const low = Math.min(...recent.map(c => c.low));
        const range = high - low;
        
        const levels = {
            high: high,
            premium: high - (range * 0.382),     // 61.8%
            equilibrium: high - (range * 0.5),   // 50%
            discount: high - (range * 0.618),    // 38.2%
            low: low,
            ote_high: high - (range * 0.214),    // 78.6%
            ote_low: high - (range * 0.382)      // 61.8%
        };
        
        const current = this.candles[this.candles.length - 1].close;
        let zone = 'equilibrium';
        
        if (current >= levels.premium) zone = 'premium';
        else if (current <= levels.discount) zone = 'discount';
        
        this.analysis.premiumDiscount = { levels, currentZone: zone };
    }

    /**
     * 8. WYCKOFF
     */
    analyzeWyckoff() {
        const recent = this.candles.slice(-20);
        const avgVolume = recent.reduce((sum, c) => sum + (c.volume || 0), 0) / recent.length;
        
        let phase = 'neutral';
        let confidence = 50;
        
        // Simple Wyckoff detection
        const priceChange = (recent[recent.length-1].close - recent[0].close) / recent[0].close;
        const volumeRatio = (recent[recent.length-1].volume || 1) / (avgVolume || 1);
        
        if (priceChange < -0.02 && volumeRatio < 0.8) {
            phase = 'accumulation';
            confidence = 70;
        } else if (priceChange > 0.02 && volumeRatio < 0.8) {
            phase = 'distribution';
            confidence = 70;
        }
        
        this.analysis.wyckoff = { phase, confidence };
    }

    /**
     * SIGNAL GENERATION - Combine all concepts + NEWS
     */
    async generateSignal(symbol, timeframe) {
        const current = this.candles[this.candles.length - 1];
        const structure = this.analysis.marketStructure;
        const pd = this.analysis.premiumDiscount;
        
        if (!structure || !pd) {
            console.warn('⚠️ Incomplete analysis data');
            return null;
        }
        
        // Get news analysis (with error handling)
        let newsAnalysis = null;
        try {
            console.log('📰 Fetching news analysis...');
            newsAnalysis = await newsAnalyzer.analyzeCurrency(symbol);
            console.log(`📊 News: ${newsAnalysis.direction} (${newsAnalysis.sentiment})`);
        } catch (error) {
            console.warn('⚠️ News analysis failed, continuing without:', error.message);
            // Continue without news
        }
        
        // Determine bias
        let bias = structure.trend;
        let confidence = 0;
        let reasons = [];
        
        // BULLISH SIGNAL CONDITIONS
        if (bias === 'bullish' || structure.choch) {
            if (pd.currentZone === 'discount') {
                confidence += 25;
                reasons.push('Price in discount zone (optimal buy area)');
            }
            
            const bullishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bullish' && 
                current.close >= ob.bottom && 
                current.close <= ob.top * 1.02
            );
            if (bullishOB) {
                confidence += 20;
                reasons.push(`Strong bullish order block at ${bullishOB.bottom.toFixed(2)}`);
            }
            
            const bullishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bullish' && 
                fvg.bottom < current.close && 
                !fvg.filled
            );
            if (bullishFVG) {
                confidence += 15;
                reasons.push('Unfilled bullish FVG providing support');
            }
            
            const support = this.analysis.supportResistance.find(sr => 
                sr.type === 'support' && 
                Math.abs(current.close - sr.price) / current.close < 0.01
            );
            if (support) {
                confidence += 10;
                reasons.push(`Strong support at ${support.price.toFixed(2)}`);
            }
            
            if (this.analysis.wyckoff?.phase === 'accumulation') {
                confidence += 15;
                reasons.push('Wyckoff accumulation phase detected');
            }
            
            // NEWS ANALYSIS
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BULLISH') {
                    confidence += 15;
                    reasons.push(`📰 Bullish news: ${newsAnalysis.sentiment}/100 (${newsAnalysis.articles} articles)`);
                } else if (newsAnalysis.direction === 'BEARISH') {
                    confidence -= 20;
                    reasons.push(`⚠️ News contradicts: Bearish ${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.articles > 0) {
                    reasons.push(`📰 Neutral news: ${newsAnalysis.articles} articles`);
                }
                
                if (newsAnalysis.volatility > 60) {
                    reasons.push(`⚡ HIGH VOLATILITY: ${newsAnalysis.volatility}/100`);
                }
            }
            
            if (confidence >= 65) {
                return this.createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis);
            }
        }
        
        // BEARISH SIGNAL CONDITIONS
        if (bias === 'bearish' || structure.choch) {
            confidence = 0;
            reasons = [];
            
            if (pd.currentZone === 'premium') {
                confidence += 25;
                reasons.push('Price in premium zone (optimal sell area)');
            }
            
            const bearishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bearish' && 
                current.close <= ob.top && 
                current.close >= ob.bottom * 0.98
            );
            if (bearishOB) {
                confidence += 20;
                reasons.push(`Strong bearish order block at ${bearishOB.top.toFixed(2)}`);
            }
            
            const bearishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bearish' && 
                fvg.top > current.close && 
                !fvg.filled
            );
            if (bearishFVG) {
                confidence += 15;
                reasons.push('Unfilled bearish FVG providing resistance');
            }
            
            const resistance = this.analysis.supportResistance.find(sr => 
                sr.type === 'resistance' && 
                Math.abs(current.close - sr.price) / current.close < 0.01
            );
            if (resistance) {
                confidence += 10;
                reasons.push(`Strong resistance at ${resistance.price.toFixed(2)}`);
            }
            
            if (this.analysis.wyckoff?.phase === 'distribution') {
                confidence += 15;
                reasons.push('Wyckoff distribution phase detected');
            }
            
            // NEWS ANALYSIS
            if (newsAnalysis) {
                if (newsAnalysis.direction === 'BEARISH') {
                    confidence += 15;
                    reasons.push(`📰 Bearish news: ${newsAnalysis.sentiment}/100 (${newsAnalysis.articles} articles)`);
                } else if (newsAnalysis.direction === 'BULLISH') {
                    confidence -= 20;
                    reasons.push(`⚠️ News contradicts: Bullish ${newsAnalysis.sentiment}/100`);
                } else if (newsAnalysis.articles > 0) {
                    reasons.push(`📰 Neutral news: ${newsAnalysis.articles} articles`);
                }
                
                if (newsAnalysis.volatility > 60) {
                    reasons.push(`⚡ HIGH VOLATILITY: ${newsAnalysis.volatility}/100`);
                }
            }
            
            if (confidence >= 65) {
                return this.createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis);
            }
        }
        
        console.log(`⚠️ No valid signal (confidence: ${confidence}/100)`);
        return null;
    }

    createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const optimalEntry = pd.levels.ote_low;
        
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'low');
        const recentLow = swings.length > 0 ? Math.min(...swings.slice(-3).map(s => s.price)) : entry * 0.98;
        let sl = recentLow * 0.998;
        
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
            timestamp: Date.now(),
            status: 'active',
            concepts: ['SMC', 'ICT', 'CTR', 'Wyckoff', 'News Sentiment']
        };
    }

    createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        const optimalEntry = pd.levels.ote_high;
        
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'high');
        const recentHigh = swings.length > 0 ? Math.max(...swings.slice(-3).map(s => s.price)) : entry * 1.02;
        let sl = recentHigh * 1.002;
        
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
            timestamp: Date.now(),
            status: 'active',
            concepts: ['SMC', 'ICT', 'CTR', 'Wyckoff', 'News Sentiment']
        };
    }
}

// Create global instance
const smcAnalyzer = new SMCAnalyzer();

/**
 * SMART MONEY CONCEPTS (SMC) ANALYSIS
 * Based on ICT (Inner Circle Trader) and CTR (Concept Trading Refined)
 * 
 * Core Concepts:
 * 1. Market Structure (BOS, CHoCH)
 * 2. Order Blocks (OB)
 * 3. Fair Value Gaps (FVG/Imbalance)
 * 4. Liquidity Zones (Sweeps)
 * 5. Premium/Discount Zones (Fibonacci)
 * 6. Optimal Trade Entry (OTE 61.8-78.6%)
 * 7. Supply/Demand Zones
 * 8. Wyckoff Accumulation/Distribution
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
     * 1. MARKET STRUCTURE - Identify trend and structure breaks
     */
    identifyMarketStructure() {
        const swings = this.findSwingPoints();
        let higherHighs = 0;
        let lowerLows = 0;
        let bos = false;
        let choch = false;

        for (let i = 1; i < swings.length; i++) {
            if (swings[i].type === 'high' && swings[i].price > swings[i-1].price) {
                higherHighs++;
            }
            if (swings[i].type === 'low' && swings[i].price < swings[i-1].price) {
                lowerLows++;
            }
        }

        // Determine trend
        const trend = higherHighs > lowerLows ? 'bullish' : 
                     lowerLows > higherHighs ? 'bearish' : 'ranging';

        // Check for break of structure
        const lastSwing = swings[swings.length - 1];
        const prevSwing = swings[swings.length - 2];
        
        if (trend === 'bullish' && lastSwing.price < prevSwing.price) {
            choch = true;
        } else if (trend === 'bearish' && lastSwing.price > prevSwing.price) {
            choch = true;
        }

        this.analysis.marketStructure = {
            trend,
            swings,
            bos,
            choch,
            strength: Math.abs(higherHighs - lowerLows)
        };
    }

    /**
     * 2. ORDER BLOCKS - Find institutional buying/selling zones
     */
    findOrderBlocks() {
        const orderBlocks = [];
        
        for (let i = 20; i < this.candles.length - 5; i++) {
            const current = this.candles[i];
            const next = this.candles[i + 1];
            
            // Bullish Order Block: Strong move up after accumulation
            if (this.isBullishOB(i)) {
                orderBlocks.push({
                    type: 'bullish',
                    index: i,
                    top: current.high,
                    bottom: current.low,
                    strength: this.calculateOBStrength(i, 'bullish')
                });
            }
            
            // Bearish Order Block: Strong move down after distribution
            if (this.isBearishOB(i)) {
                orderBlocks.push({
                    type: 'bearish',
                    index: i,
                    top: current.high,
                    bottom: current.low,
                    strength: this.calculateOBStrength(i, 'bearish')
                });
            }
        }
        
        this.analysis.orderBlocks = orderBlocks.slice(-10); // Keep last 10
    }

    isBullishOB(index) {
        const current = this.candles[index];
        const prev = this.candles[index - 1];
        const next = this.candles[index + 1];
        
        // Last bearish candle before strong bullish move
        return current.close < current.open && 
               next.close > next.open && 
               next.close > current.high &&
               (next.close - next.open) > (current.open - current.close) * 2;
    }

    isBearishOB(index) {
        const current = this.candles[index];
        const next = this.candles[index + 1];
        
        // Last bullish candle before strong bearish move
        return current.close > current.open && 
               next.close < next.open && 
               next.close < current.low &&
               (next.open - next.close) > (current.close - current.open) * 2;
    }

    calculateOBStrength(index, type) {
        const current = this.candles[index];
        const next = this.candles[index + 1];
        const moveSize = type === 'bullish' ? 
            (next.close - current.low) : (current.high - next.close);
        const bodySize = Math.abs(current.close - current.open);
        return Math.min(100, (moveSize / bodySize) * 10);
    }

    /**
     * 3. FAIR VALUE GAPS (FVG) - Imbalances in price
     */
    detectFairValueGaps() {
        const fvgs = [];
        
        for (let i = 1; i < this.candles.length - 1; i++) {
            const prev = this.candles[i - 1];
            const current = this.candles[i];
            const next = this.candles[i + 1];
            
            // Bullish FVG: Gap between prev high and next low
            const bullishGap = next.low - prev.high;
            if (bullishGap > 0 && current.close > current.open) {
                fvgs.push({
                    type: 'bullish',
                    index: i,
                    top: next.low,
                    bottom: prev.high,
                    size: bullishGap,
                    filled: false
                });
            }
            
            // Bearish FVG: Gap between prev low and next high
            const bearishGap = prev.low - next.high;
            if (bearishGap > 0 && current.close < current.open) {
                fvgs.push({
                    type: 'bearish',
                    index: i,
                    top: prev.low,
                    bottom: next.high,
                    size: bearishGap,
                    filled: false
                });
            }
        }
        
        this.analysis.fvgs = fvgs.slice(-15); // Keep last 15
    }

    /**
     * 4. LIQUIDITY ZONES - Areas where stops are swept
     */
    findLiquidityZones() {
        const liquidity = [];
        const lookback = 20;
        
        for (let i = lookback; i < this.candles.length; i++) {
            const highs = this.candles.slice(i - lookback, i).map(c => c.high);
            const lows = this.candles.slice(i - lookback, i).map(c => c.low);
            
            const localHigh = Math.max(...highs);
            const localLow = Math.min(...lows);
            
            // Buy-side liquidity (highs)
            if (this.candles[i].high > localHigh) {
                liquidity.push({
                    type: 'buy-side',
                    price: localHigh,
                    index: i,
                    swept: true
                });
            }
            
            // Sell-side liquidity (lows)
            if (this.candles[i].low < localLow) {
                liquidity.push({
                    type: 'sell-side',
                    price: localLow,
                    index: i,
                    swept: true
                });
            }
        }
        
        this.analysis.liquidityZones = liquidity.slice(-10);
    }

    /**
     * 5. TRENDLINES - Dynamic support/resistance
     */
    drawTrendlines() {
        const swings = this.analysis.marketStructure?.swings || [];
        const trendlines = [];
        
        if (swings.length < 3) return;
        
        // Uptrend line (connect lows)
        const lows = swings.filter(s => s.type === 'low').slice(-5);
        if (lows.length >= 2) {
            const slope = (lows[lows.length - 1].price - lows[0].price) / 
                         (lows[lows.length - 1].index - lows[0].index);
            trendlines.push({
                type: 'support',
                points: lows,
                slope,
                valid: slope > 0
            });
        }
        
        // Downtrend line (connect highs)
        const highs = swings.filter(s => s.type === 'high').slice(-5);
        if (highs.length >= 2) {
            const slope = (highs[highs.length - 1].price - highs[0].price) / 
                         (highs[highs.length - 1].index - highs[0].index);
            trendlines.push({
                type: 'resistance',
                points: highs,
                slope,
                valid: slope < 0
            });
        }
        
        this.analysis.trendlines = trendlines;
    }

    /**
     * 6. SUPPORT & RESISTANCE - Key horizontal levels
     */
    findSupportResistance() {
        const levels = [];
        const tolerance = 0.001; // 0.1% tolerance
        
        // Find recurring price levels
        const priceMap = new Map();
        
        for (let i = 0; i < this.candles.length; i++) {
            const prices = [this.candles[i].high, this.candles[i].low];
            
            prices.forEach(price => {
                let found = false;
                for (let [key, value] of priceMap) {
                    if (Math.abs(price - key) / key < tolerance) {
                        value.count++;
                        value.indices.push(i);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    priceMap.set(price, { count: 1, indices: [i] });
                }
            });
        }
        
        // Filter significant levels (touched 3+ times)
        for (let [price, data] of priceMap) {
            if (data.count >= 3) {
                const currentPrice = this.candles[this.candles.length - 1].close;
                levels.push({
                    price,
                    touches: data.count,
                    type: price > currentPrice ? 'resistance' : 'support',
                    strength: Math.min(100, data.count * 20)
                });
            }
        }
        
        this.analysis.supportResistance = levels.sort((a, b) => b.touches - a.touches).slice(0, 5);
    }

    /**
     * 7. PREMIUM/DISCOUNT ZONES - Fibonacci-based
     */
    calculatePremiumDiscount() {
        if (!this.analysis.marketStructure) return;
        
        const swings = this.analysis.marketStructure.swings;
        if (swings.length < 2) return;
        
        const lastHigh = Math.max(...swings.filter(s => s.type === 'high').map(s => s.price));
        const lastLow = Math.min(...swings.filter(s => s.type === 'low').map(s => s.price));
        const range = lastHigh - lastLow;
        const currentPrice = this.candles[this.candles.length - 1].close;
        
        // Fibonacci levels
        const levels = {
            high: lastHigh,
            low: lastLow,
            equilibrium: lastLow + (range * 0.5),      // 50%
            premium: lastLow + (range * 0.618),         // 61.8% (OTE)
            discount: lastLow + (range * 0.382),        // 38.2%
            ote_high: lastLow + (range * 0.786),        // 78.6%
            ote_low: lastLow + (range * 0.618)          // 61.8%
        };
        
        // Determine current zone
        let zone = 'equilibrium';
        if (currentPrice > levels.premium) zone = 'premium';
        else if (currentPrice < levels.discount) zone = 'discount';
        
        this.analysis.premiumDiscount = {
            levels,
            currentZone: zone,
            range
        };
    }

    /**
     * 8. WYCKOFF ANALYSIS - Accumulation/Distribution
     */
    analyzeWyckoff() {
        const recent = this.candles.slice(-50);
        let phase = 'unknown';
        let confidence = 0;
        
        // Calculate volume trend and price range
        const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
        const priceRange = Math.max(...recent.map(c => c.high)) - Math.min(...recent.map(c => c.low));
        const currentPrice = recent[recent.length - 1].close;
        
        // Accumulation signs
        const lowVolatility = priceRange < (currentPrice * 0.05); // < 5% range
        const increasing = recent[recent.length - 1].close > recent[0].close;
        
        if (lowVolatility && increasing) {
            phase = 'accumulation';
            confidence = 70;
        } else if (lowVolatility && !increasing) {
            phase = 'distribution';
            confidence = 70;
        } else if (increasing) {
            phase = 'markup';
            confidence = 60;
        } else {
            phase = 'markdown';
            confidence = 60;
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
            return null;
        }
        
        // Get news analysis
        console.log('📰 Fetching news analysis...');
        const newsAnalysis = await newsAnalyzer.analyzeCurrency(symbol);
        console.log(`📊 News: ${newsAnalysis.direction} (${newsAnalysis.sentiment})`);
        
        // Determine bias
        let bias = structure.trend;
        let confidence = 0;
        let reasons = [];
        
        // BULLISH SIGNAL CONDITIONS
        if (bias === 'bullish' || structure.choch) {
            // 1. Price in discount zone (38.2% or below)
            if (pd.currentZone === 'discount') {
                confidence += 25;
                reasons.push('Price in discount zone (optimal buy area)');
            }
            
            // 2. Bullish order block nearby
            const bullishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bullish' && 
                current.close >= ob.bottom && 
                current.close <= ob.top * 1.02
            );
            if (bullishOB) {
                confidence += 20;
                reasons.push(`Strong bullish order block at ${bullishOB.bottom.toFixed(2)}`);
            }
            
            // 3. Fair value gap below (support)
            const bullishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bullish' && 
                fvg.bottom < current.close && 
                !fvg.filled
            );
            if (bullishFVG) {
                confidence += 15;
                reasons.push('Unfilled bullish FVG providing support');
            }
            
            // 4. Liquidity swept below
            const liquiditySwept = this.analysis.liquidityZones.some(lz => 
                lz.type === 'sell-side' && 
                lz.swept && 
                lz.index > this.candles.length - 10
            );
            if (liquiditySwept) {
                confidence += 15;
                reasons.push('Sell-side liquidity recently swept');
            }
            
            // 5. Support level nearby
            const support = this.analysis.supportResistance.find(sr => 
                sr.type === 'support' && 
                Math.abs(current.close - sr.price) / current.close < 0.01
            );
            if (support) {
                confidence += 10;
                reasons.push(`Strong support at ${support.price.toFixed(2)} (${support.touches} touches)`);
            }
            
            // 6. Wyckoff accumulation
            if (this.analysis.wyckoff?.phase === 'accumulation') {
                confidence += 15;
                reasons.push('Wyckoff accumulation phase detected');
            }
            
            // 7. NEWS ANALYSIS - BULLISH
            if (newsAnalysis.direction === 'BULLISH') {
                confidence += 15;
                reasons.push(`📰 Bullish news sentiment: ${newsAnalysis.sentiment}/100 (${newsAnalysis.articles} articles)`);
            } else if (newsAnalysis.direction === 'BEARISH') {
                confidence -= 20;
                reasons.push(`⚠️ News contradicts: Bearish sentiment ${newsAnalysis.sentiment}/100`);
            } else if (newsAnalysis.articles > 0) {
                reasons.push(`📰 Neutral news: ${newsAnalysis.articles} articles analyzed`);
            }
            
            // 8. HIGH VOLATILITY WARNING
            if (newsAnalysis.volatility > 60) {
                reasons.push(`⚡ HIGH VOLATILITY expected: ${newsAnalysis.volatility}/100 - Wider stops recommended`);
            }
            
            if (confidence >= 65) {
                return this.createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis);
            }
        }
        
        // BEARISH SIGNAL CONDITIONS
        if (bias === 'bearish' || structure.choch) {
            confidence = 0;
            reasons = [];
            
            // 1. Price in premium zone (61.8% or above)
            if (pd.currentZone === 'premium') {
                confidence += 25;
                reasons.push('Price in premium zone (optimal sell area)');
            }
            
            // 2. Bearish order block nearby
            const bearishOB = this.analysis.orderBlocks.find(ob => 
                ob.type === 'bearish' && 
                current.close <= ob.top && 
                current.close >= ob.bottom * 0.98
            );
            if (bearishOB) {
                confidence += 20;
                reasons.push(`Strong bearish order block at ${bearishOB.top.toFixed(2)}`);
            }
            
            // 3. Fair value gap above (resistance)
            const bearishFVG = this.analysis.fvgs.find(fvg => 
                fvg.type === 'bearish' && 
                fvg.top > current.close && 
                !fvg.filled
            );
            if (bearishFVG) {
                confidence += 15;
                reasons.push('Unfilled bearish FVG providing resistance');
            }
            
            // 4. Liquidity swept above
            const liquiditySwept = this.analysis.liquidityZones.some(lz => 
                lz.type === 'buy-side' && 
                lz.swept && 
                lz.index > this.candles.length - 10
            );
            if (liquiditySwept) {
                confidence += 15;
                reasons.push('Buy-side liquidity recently swept');
            }
            
            // 5. Resistance level nearby
            const resistance = this.analysis.supportResistance.find(sr => 
                sr.type === 'resistance' && 
                Math.abs(current.close - sr.price) / current.close < 0.01
            );
            if (resistance) {
                confidence += 10;
                reasons.push(`Strong resistance at ${resistance.price.toFixed(2)} (${resistance.touches} touches)`);
            }
            
            // 6. Wyckoff distribution
            if (this.analysis.wyckoff?.phase === 'distribution') {
                confidence += 15;
                reasons.push('Wyckoff distribution phase detected');
            }
            
            // 7. NEWS ANALYSIS - BEARISH
            if (newsAnalysis.direction === 'BEARISH') {
                confidence += 15;
                reasons.push(`📰 Bearish news sentiment: ${newsAnalysis.sentiment}/100 (${newsAnalysis.articles} articles)`);
            } else if (newsAnalysis.direction === 'BULLISH') {
                confidence -= 20;
                reasons.push(`⚠️ News contradicts: Bullish sentiment ${newsAnalysis.sentiment}/100`);
            } else if (newsAnalysis.articles > 0) {
                reasons.push(`📰 Neutral news: ${newsAnalysis.articles} articles analyzed`);
            }
            
            // 8. HIGH VOLATILITY WARNING
            if (newsAnalysis.volatility > 60) {
                reasons.push(`⚡ HIGH VOLATILITY expected: ${newsAnalysis.volatility}/100 - Wider stops recommended`);
            }
            
            if (confidence >= 65) {
                return this.createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis);
            }
        }
        
        return null; // No valid signal
    }

    /**
     * Create BUY signal with proper risk management + NEWS
     */
    createBuySignal(symbol, timeframe, current, confidence, reasons, newsAnalysis) {
        const entry = current.close;
        
        // Find optimal entry using OTE (61.8-78.6% retracement)
        const pd = this.analysis.premiumDiscount;
        const optimalEntry = pd.levels.ote_low;
        
        // Stop Loss: Below recent swing low or order block
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'low');
        const recentLow = swings.length > 0 ? Math.min(...swings.slice(-3).map(s => s.price)) : entry * 0.98;
        let sl = recentLow * 0.998; // 0.2% below swing low
        
        // Adjust for volatility
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            sl = sl * 0.98; // Wider SL for high volatility
        }
        
        // Take Profits: Based on risk-reward and resistance levels
        const riskAmount = entry - sl;
        let tp1 = entry + (riskAmount * 1.5);  // 1.5R
        let tp2 = entry + (riskAmount * 2.5);  // 2.5R
        let tp3 = entry + (riskAmount * 4.0);  // 4R
        
        // Adjust targets for high volatility
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            tp1 = entry + (riskAmount * 2.0);  // 2R
            tp2 = entry + (riskAmount * 3.0);  // 3R
            tp3 = entry + (riskAmount * 5.0);  // 5R
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

    /**
     * Create SELL signal with proper risk management + NEWS
     */
    createSellSignal(symbol, timeframe, current, confidence, reasons, newsAnalysis) {
        const entry = current.close;
        
        // Find optimal entry using OTE
        const pd = this.analysis.premiumDiscount;
        const optimalEntry = pd.levels.ote_high;
        
        // Stop Loss: Above recent swing high or order block
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'high');
        const recentHigh = swings.length > 0 ? Math.max(...swings.slice(-3).map(s => s.price)) : entry * 1.02;
        let sl = recentHigh * 1.002; // 0.2% above swing high
        
        // Adjust for volatility
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            sl = sl * 1.02; // Wider SL for high volatility
        }
        
        // Take Profits: Based on risk-reward and support levels
        const riskAmount = sl - entry;
        let tp1 = entry - (riskAmount * 1.5);  // 1.5R
        let tp2 = entry - (riskAmount * 2.5);  // 2.5R
        let tp3 = entry - (riskAmount * 4.0);  // 4R
        
        // Adjust targets for high volatility
        if (newsAnalysis && newsAnalysis.volatility > 60) {
            tp1 = entry - (riskAmount * 2.0);  // 2R
            tp2 = entry - (riskAmount * 3.0);  // 3R
            tp3 = entry - (riskAmount * 5.0);  // 5R
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

    /**
     * Helper: Find swing points
     */
    findSwingPoints() {
        const swings = [];
        const lookback = 5;
        
        for (let i = lookback; i < this.candles.length - lookback; i++) {
            const highs = this.candles.slice(i - lookback, i + lookback).map(c => c.high);
            const lows = this.candles.slice(i - lookback, i + lookback).map(c => c.low);
            
            // Swing high
            if (this.candles[i].high === Math.max(...highs)) {
                swings.push({
                    type: 'high',
                    price: this.candles[i].high,
                    index: i
                });
            }
            
            // Swing low
            if (this.candles[i].low === Math.min(...lows)) {
                swings.push({
                    type: 'low',
                    price: this.candles[i].low,
                    index: i
                });
            }
        }
        
        return swings;
    }

    /**
     * Get drawable elements for chart overlay
     */
    getDrawables() {
        return {
            orderBlocks: this.analysis.orderBlocks,
            fvgs: this.analysis.fvgs,
            liquidityZones: this.analysis.liquidityZones,
            trendlines: this.analysis.trendlines,
            supportResistance: this.analysis.supportResistance,
            premiumDiscount: this.analysis.premiumDiscount
        };
    }
}

// Create global instance
const smcAnalyzer = new SMCAnalyzer();

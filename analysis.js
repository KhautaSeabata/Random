/**
 * COMPLETE TRADING ANALYSIS - VERSION 5.15
 * Fixed ZAR-based TP/SL (R20/R45/R80/R25)
 */

class SMCAnalyzer {
    constructor() {
        this.candles = [];
        this.analysisProgress = 0;
        this.progressCallback = null;
        this.analysis = {
            // Chart drawing (visible)
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
            this.updateProgress(5, 'Identifying market structure...');
            await this.sleep(100);
            this.identifyMarketStructure();
            
            this.updateProgress(20, 'Finding support/resistance...');
            await this.sleep(100);
            this.findSupportResistance();
            
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

    getDrawables() {
        return {
            supportResistance: this.analysis.supportResistance || [],
            premiumDiscount: this.analysis.premiumDiscount || null
        };
    }

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

        let trend = 'ranging';
        if (higherHighs > lowerLows * 1.5) trend = 'bullish';
        if (lowerLows > higherHighs * 1.5) trend = 'bearish';

        this.analysis.marketStructure = {
            swings,
            trend,
            higherHighs,
            lowerLows
        };
    }

    findSwingPoints() {
        const swings = [];
        const lookback = 5;

        for (let i = lookback; i < this.candles.length - lookback; i++) {
            const candle = this.candles[i];
            let isHigh = true;
            let isLow = true;

            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j === i) continue;
                if (this.candles[j].high >= candle.high) isHigh = false;
                if (this.candles[j].low <= candle.low) isLow = false;
            }

            if (isHigh) swings.push({ type: 'high', price: candle.high, index: i });
            if (isLow) swings.push({ type: 'low', price: candle.low, index: i });
        }

        return swings;
    }

    findSupportResistance() {
        const levels = [];
        const swings = this.analysis.marketStructure.swings;
        const tolerance = 0.002;

        for (const swing of swings) {
            let found = false;
            for (const level of levels) {
                if (Math.abs(swing.price - level.price) / level.price < tolerance) {
                    level.touches++;
                    found = true;
                    break;
                }
            }
            if (!found) {
                levels.push({
                    price: swing.price,
                    type: swing.type === 'high' ? 'resistance' : 'support',
                    touches: 1
                });
            }
        }

        this.analysis.supportResistance = levels
            .filter(l => l.touches >= 2)
            .sort((a, b) => b.touches - a.touches)
            .slice(0, 5);
    }

    findOrderBlocks() {
        const obs = [];
        for (let i = 2; i < this.candles.length - 1; i++) {
            const prev = this.candles[i - 1];
            const curr = this.candles[i];
            const next = this.candles[i + 1];

            if (curr.close > curr.open && next.close > next.open && next.close > curr.high) {
                obs.push({
                    type: 'bullish',
                    high: curr.high,
                    low: curr.low,
                    index: i,
                    strength: (curr.close - curr.open) / curr.open
                });
            }

            if (curr.close < curr.open && next.close < next.open && next.close < curr.low) {
                obs.push({
                    type: 'bearish',
                    high: curr.high,
                    low: curr.low,
                    index: i,
                    strength: (curr.open - curr.close) / curr.open
                });
            }
        }

        this.analysis.orderBlocks = obs.slice(-10);
    }

    findAdvancedOrderBlocks() {
        this.analysis.advancedOBs = this.analysis.orderBlocks.filter(ob => ob.strength > 0.02);
    }

    detectFairValueGaps() {
        const fvgs = [];
        for (let i = 1; i < this.candles.length - 1; i++) {
            const prev = this.candles[i - 1];
            const curr = this.candles[i];
            const next = this.candles[i + 1];

            if (prev.high < next.low) {
                fvgs.push({
                    type: 'bullish',
                    top: next.low,
                    bottom: prev.high,
                    index: i,
                    filled: false
                });
            }

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

    findLiquidityZones() {
        const zones = [];
        const swings = this.analysis.marketStructure.swings;

        for (let i = 0; i < swings.length - 1; i++) {
            const swing = swings[i];
            let liquidityCount = 0;

            for (let j = Math.max(0, swing.index - 10); j < Math.min(this.candles.length, swing.index + 10); j++) {
                const candle = this.candles[j];
                if (swing.type === 'high' && candle.high >= swing.price * 0.998) liquidityCount++;
                if (swing.type === 'low' && candle.low <= swing.price * 1.002) liquidityCount++;
            }

            if (liquidityCount >= 3) {
                zones.push({
                    price: swing.price,
                    type: swing.type,
                    liquidity: liquidityCount,
                    index: swing.index
                });
            }
        }

        this.analysis.liquidityZones = zones.slice(-5);
    }

    detectBreakouts() {
        const breakouts = [];
        const sr = this.analysis.supportResistance;

        for (let i = 50; i < this.candles.length; i++) {
            const candle = this.candles[i];
            for (const level of sr) {
                if (level.type === 'resistance' && candle.close > level.price && this.candles[i-1].close <= level.price) {
                    breakouts.push({ type: 'bullish', price: level.price, index: i });
                }
                if (level.type === 'support' && candle.close < level.price && this.candles[i-1].close >= level.price) {
                    breakouts.push({ type: 'bearish', price: level.price, index: i });
                }
            }
        }

        this.analysis.breakouts = breakouts.slice(-10);
    }

    detectChoCHAndBOS() {
        const chochs = [];
        const bos = [];
        const swings = this.analysis.marketStructure.swings;

        for (let i = 2; i < swings.length; i++) {
            const prev = swings[i - 2];
            const curr = swings[i];

            if (prev.type === 'low' && curr.type === 'low' && curr.price < prev.price) {
                chochs.push({ type: 'bearish', from: prev.price, to: curr.price, index: curr.index });
            }
            if (prev.type === 'high' && curr.type === 'high' && curr.price > prev.price) {
                chochs.push({ type: 'bullish', from: prev.price, to: curr.price, index: curr.index });
            }
        }

        this.analysis.chochs = chochs.slice(-5);
        this.analysis.bos = bos;
    }

    findRetestZones() {
        const retests = [];
        const breakouts = this.analysis.breakouts;

        for (const breakout of breakouts) {
            for (let i = breakout.index + 1; i < Math.min(breakout.index + 20, this.candles.length); i++) {
                const candle = this.candles[i];
                if (Math.abs(candle.close - breakout.price) / breakout.price < 0.005) {
                    retests.push({ price: breakout.price, type: breakout.type, index: i });
                    break;
                }
            }
        }

        this.analysis.retests = retests.slice(-5);
    }

    analyzeWyckoff() {
        const recentCandles = this.candles.slice(-50);
        const volumes = recentCandles.map(c => c.volume || 1);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        
        const priceAction = recentCandles.slice(-10);
        const isAccumulating = priceAction.every((c, i) => i === 0 || Math.abs(c.close - priceAction[i-1].close) / priceAction[i-1].close < 0.01);
        const isMarkup = priceAction.every((c, i) => i === 0 || c.close > priceAction[i-1].close);
        const isDistribution = priceAction.every((c, i) => i === 0 || Math.abs(c.close - priceAction[i-1].close) / priceAction[i-1].close < 0.01);
        const isMarkdown = priceAction.every((c, i) => i === 0 || c.close < priceAction[i-1].close);

        let phase = 'ranging';
        if (isAccumulating) phase = 'accumulation';
        if (isMarkup) phase = 'markup';
        if (isDistribution) phase = 'distribution';
        if (isMarkdown) phase = 'markdown';

        this.analysis.wyckoff = { phase, avgVolume };
    }

    calculatePremiumDiscount() {
        const recent = this.candles.slice(-50);
        const high = Math.max(...recent.map(c => c.high));
        const low = Math.min(...recent.map(c => c.low));
        const range = high - low;
        const current = this.candles[this.candles.length - 1].close;

        const eq = low + (range * 0.5);
        const premium_low = low + (range * 0.618);
        const discount_high = low + (range * 0.382);
        const ote_high = low + (range * 0.705);
        const ote_low = low + (range * 0.295);

        let currentZone = 'equilibrium';
        if (current >= premium_low) currentZone = 'premium';
        if (current <= discount_high) currentZone = 'discount';

        this.analysis.premiumDiscount = {
            high,
            low,
            range,
            currentPrice: current,
            currentZone,
            levels: {
                premium_low,
                eq,
                discount_high,
                ote_high,
                ote_low
            }
        };
    }

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
        
        // BULLISH SIGNAL
        if (bias === 'bullish') {
            if (pd.currentZone === 'discount') {
                technicalConfidence += 30;
                reasons.push('✅ Discount zone');
            }
            
            const support = this.analysis.supportResistance.find(sr => sr.type === 'support');
            if (support) {
                technicalConfidence += 50;
                reasons.push(`✅ Support ${support.price.toFixed(2)} (${support.touches}x)`);
            }
            
            // SMC ANALYSIS
            const bullishOB = this.analysis.orderBlocks.find(ob => ob.type === 'bullish' && ob.index > this.candles.length - 20);
            if (bullishOB) {
                smcConfidence += 20;
                reasons.push('✅ Bullish order block');
            }
            
            const bullishFVG = this.analysis.fvgs.find(fvg => fvg.type === 'bullish' && !fvg.filled && fvg.index > this.candles.length - 15);
            if (bullishFVG) {
                smcConfidence += 20;
                reasons.push('✅ Bullish FVG');
            }
            
            const liquiditySwept = this.analysis.liquidityZones.find(lz => lz.type === 'low');
            if (liquiditySwept) {
                smcConfidence += 20;
                reasons.push('✅ Liquidity swept');
            }
            
            const bullishChoCH = this.analysis.chochs.find(ch => ch.type === 'bullish' && ch.index > this.candles.length - 10);
            if (bullishChoCH) {
                smcConfidence += 15;
                reasons.push('✅ Bullish CHoCH');
            }
            
            if (this.analysis.wyckoff?.phase === 'accumulation' || this.analysis.wyckoff?.phase === 'markup') {
                smcConfidence += 25;
                reasons.push(`✅ Wyckoff ${this.analysis.wyckoff.phase}`);
            }
            
            const overallConfidence = Math.round((technicalConfidence + smcConfidence + newsConfidence) / 3);
            
            return this.createBuySignal(symbol, timeframe, current, overallConfidence, technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData);
        }
        
        // BEARISH SIGNAL
        else if (bias === 'bearish') {
            if (pd.currentZone === 'premium') {
                technicalConfidence += 30;
                reasons.push('✅ Premium zone');
            }
            
            const resistance = this.analysis.supportResistance.find(sr => sr.type === 'resistance');
            if (resistance) {
                technicalConfidence += 50;
                reasons.push(`✅ Resistance ${resistance.price.toFixed(2)} (${resistance.touches}x)`);
            }
            
            // SMC ANALYSIS
            const bearishOB = this.analysis.orderBlocks.find(ob => ob.type === 'bearish' && ob.index > this.candles.length - 20);
            if (bearishOB) {
                smcConfidence += 20;
                reasons.push('✅ Bearish order block');
            }
            
            const bearishFVG = this.analysis.fvgs.find(fvg => fvg.type === 'bearish' && !fvg.filled && fvg.index > this.candles.length - 15);
            if (bearishFVG) {
                smcConfidence += 20;
                reasons.push('✅ Bearish FVG');
            }
            
            const liquiditySwept = this.analysis.liquidityZones.find(lz => lz.type === 'high');
            if (liquiditySwept) {
                smcConfidence += 20;
                reasons.push('✅ Liquidity swept');
            }
            
            const bearishChoCH = this.analysis.chochs.find(ch => ch.type === 'bearish' && ch.index > this.candles.length - 10);
            if (bearishChoCH) {
                smcConfidence += 15;
                reasons.push('✅ Bearish CHoCH');
            }
            
            if (this.analysis.wyckoff?.phase === 'distribution' || this.analysis.wyckoff?.phase === 'markdown') {
                smcConfidence += 25;
                reasons.push(`✅ Wyckoff ${this.analysis.wyckoff.phase}`);
            }
            
            const overallConfidence = Math.round((technicalConfidence + smcConfidence + newsConfidence) / 3);
            
            return this.createSellSignal(symbol, timeframe, current, overallConfidence, technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData);
        }
        
        return null;
    }

    createBuySignal(symbol, timeframe, current, overallConfidence, technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        
        const pipValue = this.getPipValue(symbol);
        const zarPerPip = this.getZARPerPip(symbol);
        const decimals = this.getDecimals(symbol);
        
        // Fixed ZAR targets
        const tp1Pips = Math.ceil(20 / zarPerPip);
        const tp2Pips = Math.ceil(45 / zarPerPip);
        const tp3Pips = Math.ceil(80 / zarPerPip);
        const slPips = Math.ceil(25 / zarPerPip);
        
        const tp1 = entry + (tp1Pips * pipValue);
        const tp2 = entry + (tp2Pips * pipValue);
        const tp3 = entry + (tp3Pips * pipValue);
        
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'low');
        const recentLow = swings.length > 0 ? Math.min(...swings.slice(-3).map(s => s.price)) : entry * 0.98;
        const calculatedSL = entry - (slPips * pipValue);
        let sl = Math.max(calculatedSL, recentLow * 0.995);
        
        const tp1ZAR = Math.round(tp1Pips * zarPerPip);
        const tp2ZAR = Math.round(tp2Pips * zarPerPip);
        const tp3ZAR = Math.round(tp3Pips * zarPerPip);
        const slZAR = Math.round(Math.abs((sl - entry) / pipValue) * zarPerPip);
        
        return {
            symbol,
            timeframe,
            timeframeName: this.getTimeframeName(timeframe),
            action: 'BUY',
            bias: 'bullish',
            entry: parseFloat(entry.toFixed(decimals)),
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
            concepts: ['SMC/ICT', 'News Sentiment']
        };
    }

    createSellSignal(symbol, timeframe, current, overallConfidence, technicalConfidence, smcConfidence, newsConfidence, reasons, newsAnalysis, analysisData) {
        const entry = current.close;
        const pd = this.analysis.premiumDiscount;
        
        const pipValue = this.getPipValue(symbol);
        const zarPerPip = this.getZARPerPip(symbol);
        const decimals = this.getDecimals(symbol);
        
        // Fixed ZAR targets
        const tp1Pips = Math.ceil(20 / zarPerPip);
        const tp2Pips = Math.ceil(45 / zarPerPip);
        const tp3Pips = Math.ceil(80 / zarPerPip);
        const slPips = Math.ceil(25 / zarPerPip);
        
        const tp1 = entry - (tp1Pips * pipValue);
        const tp2 = entry - (tp2Pips * pipValue);
        const tp3 = entry - (tp3Pips * pipValue);
        
        const swings = this.analysis.marketStructure.swings.filter(s => s.type === 'high');
        const recentHigh = swings.length > 0 ? Math.max(...swings.slice(-3).map(s => s.price)) : entry * 1.02;
        const calculatedSL = entry + (slPips * pipValue);
        let sl = Math.min(calculatedSL, recentHigh * 1.005);
        
        const tp1ZAR = Math.round(tp1Pips * zarPerPip);
        const tp2ZAR = Math.round(tp2Pips * zarPerPip);
        const tp3ZAR = Math.round(tp3Pips * zarPerPip);
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
            concepts: ['SMC/ICT', 'News Sentiment']
        };
    }

    getDecimals(symbol) {
        const decimalPlaces = {
            'XAUUSD': 2,
            'BTCUSD': 2,
            'USDJPY': 2,
            'EURUSD': 4,
            'GBPUSD': 4,
            'USDCAD': 4,
            'AUDUSD': 4,
            'AUDCAD': 4
        };
        return decimalPlaces[symbol] || 4;
    }

    getPipValue(symbol) {
        const pipValues = {
            'XAUUSD': 0.01,
            'BTCUSD': 1.0,
            'EURUSD': 0.0001,
            'GBPUSD': 0.0001,
            'USDCAD': 0.0001,
            'AUDUSD': 0.0001,
            'AUDCAD': 0.0001,
            'USDJPY': 0.01
        };
        return pipValues[symbol] || 0.0001;
    }

    getZARPerPip(symbol) {
        const zarRate = 18.50;
        const pipProfits = {
            'EURUSD': 0.0001 * 1000 * zarRate,
            'GBPUSD': 0.0001 * 1000 * zarRate,
            'USDCAD': 0.0001 * 1000 * zarRate,
            'AUDUSD': 0.0001 * 1000 * zarRate,
            'AUDCAD': 0.0001 * 1000 * zarRate,
            'USDJPY': 0.01 * 1000 * zarRate,
            'XAUUSD': 0.01 * 100 * zarRate,
            'BTCUSD': 1.0 * 0.01 * zarRate
        };
        return pipProfits[symbol] || 1.85;
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

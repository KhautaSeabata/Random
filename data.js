/**
 * DATA MANAGER - MT5 STYLE
 * Fetches and manages candlestick data from Deriv API
 * Updates current candle until timeframe ends, then creates new candle
 */

class DataManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.currentSymbol = 'XAUUSD';
        this.currentTimeframe = 300; // seconds
        this.chartData = [];
        this.subscribers = [];
        this.reconnectAttempts = 0;
        this.maxReconnects = 5;
        
        this.symbolMap = {
            'XAUUSD': 'frxXAUUSD',
            'BTCUSD': 'cryBTCUSD',
            'EURUSD': 'frxEURUSD',
            'GBPUSD': 'frxGBPUSD',
            'USDCAD': 'frxUSDCAD',
            'AUDUSD': 'frxAUDUSD',
            'AUDCAD': 'frxAUDCAD',
            'USDJPY': 'frxUSDJPY'
        };
        
        this.priceDecimals = {
            'XAUUSD': 2,
            'BTCUSD': 2,
            'EURUSD': 5,
            'GBPUSD': 5,
            'USDCAD': 5,
            'AUDUSD': 5,
            'AUDCAD': 5,
            'USDJPY': 3
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
                
                this.ws.onopen = () => {
                    console.log('✅ Connected to Deriv WebSocket');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('🔌 Disconnected from Deriv');
                    this.connected = false;
                    this.attemptReconnect();
                };
            } catch (error) {
                console.error('❌ Connection error:', error);
                reject(error);
            }
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnects) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnects})`);
            setTimeout(() => this.connect(), 3000);
        }
    }

    loadData(symbol, timeframe, callback) {
        this.currentSymbol = symbol;
        this.currentTimeframe = timeframe;
        
        if (callback) {
            this.subscribers.push(callback);
        }

        if (!this.connected) {
            console.error('❌ Not connected to Deriv WebSocket');
            return;
        }

        const derivSymbol = this.symbolMap[symbol];
        if (!derivSymbol) {
            console.error('❌ Unknown symbol:', symbol);
            return;
        }

        // Request historical candles with live subscription
        const request = {
            ticks_history: derivSymbol,
            adjust_start_time: 1,
            count: 500,
            end: 'latest',
            start: 1,
            style: 'candles',
            granularity: timeframe,
            subscribe: 1
        };

        console.log('📊 Loading live data from Deriv:', symbol, this.getTimeframeName(timeframe));
        this.ws.send(JSON.stringify(request));
    }

    handleMessage(data) {
        if (data.error) {
            console.error('❌ API Error:', data.error.message);
            return;
        }

        if (data.msg_type === 'candles') {
            this.handleCandles(data);
        } else if (data.msg_type === 'ohlc') {
            this.handleOHLC(data);
        }
    }

    handleCandles(data) {
        const candles = data.candles.map(c => ({
            time: c.epoch * 1000,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume || 0)
        }));

        this.chartData = candles;
        console.log(`✅ Loaded ${candles.length} historical candles`);
        this.notifySubscribers(candles, false);
    }

    /**
     * Handle live OHLC ticks - MT5 STYLE
     * Updates current candle until timeframe ends, then creates new candle
     */
    handleOHLC(data) {
        const ohlc = data.ohlc;
        
        // Get the tick's actual timestamp
        const tickTime = ohlc.epoch * 1000;
        
        // Calculate which candle period this tick belongs to
        // This aligns ticks to the correct candle boundary
        const candlePeriodStart = Math.floor(ohlc.epoch / this.currentTimeframe) * this.currentTimeframe * 1000;
        
        console.log('🔴 LIVE TICK:', this.currentSymbol, parseFloat(ohlc.close).toFixed(this.getDecimals(this.currentSymbol)));

        if (this.chartData.length === 0) {
            // First tick - create first candle
            this.chartData.push({
                time: candlePeriodStart,
                open: parseFloat(ohlc.open),
                high: parseFloat(ohlc.high),
                low: parseFloat(ohlc.low),
                close: parseFloat(ohlc.close),
                volume: 0
            });
            console.log('✅ First candle created at', new Date(candlePeriodStart).toLocaleTimeString());
            this.notifySubscribers([this.chartData[this.chartData.length - 1]], true);
            return;
        }

        const lastCandle = this.chartData[this.chartData.length - 1];
        
        // Check if this tick belongs to the same candle period
        if (candlePeriodStart === lastCandle.time) {
            // SAME CANDLE PERIOD - UPDATE CURRENT CANDLE (MT5 BEHAVIOR)
            lastCandle.high = Math.max(lastCandle.high, parseFloat(ohlc.high));
            lastCandle.low = Math.min(lastCandle.low, parseFloat(ohlc.low));
            lastCandle.close = parseFloat(ohlc.close);
            // Keep original open and time
            
            console.log('📊 Updating candle | O:', lastCandle.open.toFixed(2), 'H:', lastCandle.high.toFixed(2), 'L:', lastCandle.low.toFixed(2), 'C:', lastCandle.close.toFixed(2));
        } else {
            // NEW CANDLE PERIOD - CREATE NEW CANDLE
            const newCandle = {
                time: candlePeriodStart,
                open: parseFloat(ohlc.open),
                high: parseFloat(ohlc.high),
                low: parseFloat(ohlc.low),
                close: parseFloat(ohlc.close),
                volume: 0
            };
            
            this.chartData.push(newCandle);
            console.log('✅ NEW CANDLE at', new Date(candlePeriodStart).toLocaleTimeString());
        }

        this.notifySubscribers([this.chartData[this.chartData.length - 1]], true);
    }

    notifySubscribers(data, isLiveUpdate) {
        this.subscribers.forEach(callback => callback(data, isLiveUpdate));
    }

    getCurrentPrice() {
        if (this.chartData.length === 0) return null;
        return this.chartData[this.chartData.length - 1].close;
    }

    getPriceChange() {
        if (this.chartData.length < 2) return { change: 0, percent: 0 };
        
        const current = this.chartData[this.chartData.length - 1].close;
        const previous = this.chartData[this.chartData.length - 2].close;
        const change = current - previous;
        const percent = (change / previous) * 100;
        
        return { change, percent };
    }

    getChartData() {
        return this.chartData;
    }

    getDecimals(symbol) {
        return this.priceDecimals[symbol] || 5;
    }

    getTimeframeName(seconds) {
        const map = {
            60: 'M1', 120: 'M2', 300: 'M5', 900: 'M15',
            1800: 'M30', 3600: 'H1', 14400: 'H4', 86400: 'D1'
        };
        return map[seconds] || `${seconds}s`;
    }

    unsubscribe() {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ forget_all: 'candles' }));
        }
        this.subscribers = [];
    }

    disconnect() {
        if (this.ws) {
            this.unsubscribe();
            this.ws.close();
            this.ws = null;
            this.connected = false;
        }
    }

    isConnected() {
        return this.connected;
    }
}

const dataManager = new DataManager();

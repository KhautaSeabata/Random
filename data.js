/**
 * DATA MANAGER
 * Fetches and manages candlestick data from Deriv API
 */

class DataManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.currentSymbol = 'XAUUSD';
        this.currentTimeframe = 300;
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
                // Connect to Deriv WebSocket with proper app_id
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
            subscribe: 1  // Enable live updates
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
        console.log(`✅ Loaded ${candles.length} candles`);
        this.notifySubscribers(candles, false);
    }

    handleOHLC(data) {
        const ohlc = data.ohlc;
        const candle = {
            time: ohlc.epoch * 1000,
            open: parseFloat(ohlc.open),
            high: parseFloat(ohlc.high),
            low: parseFloat(ohlc.low),
            close: parseFloat(ohlc.close),
            volume: 0
        };

        console.log('🔴 LIVE UPDATE:', this.currentSymbol, candle.close);

        if (this.chartData.length > 0) {
            const lastCandle = this.chartData[this.chartData.length - 1];
            if (lastCandle.time === candle.time) {
                // Update existing candle
                this.chartData[this.chartData.length - 1] = candle;
            } else {
                // New candle
                this.chartData.push(candle);
                console.log('✅ New candle added');
            }
        } else {
            this.chartData.push(candle);
        }

        this.notifySubscribers([candle], true);
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

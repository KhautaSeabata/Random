/**
 * DATA MANAGER
 * Fetches and manages candlestick data for all symbols
 */

class DataManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.currentSymbol = 'XAUUSD';
        this.currentTimeframe = 300; // M5
        this.chartData = [];
        this.subscribers = [];
        this.reconnectAttempts = 0;
        this.maxReconnects = 5;
        
        // Deriv symbol mapping
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

    /**
     * Connect to Deriv WebSocket
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
                
                this.ws.onopen = () => {
                    console.log('✅ Connected to Deriv');
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
                    console.log('🔌 Disconnected');
                    this.connected = false;
                    this.attemptReconnect();
                };
            } catch (error) {
                console.error('❌ Connection error:', error);
                reject(error);
            }
        });
    }

    /**
     * Attempt reconnection
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnects) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnects})`);
            setTimeout(() => this.connect(), 3000);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }

    /**
     * Load chart data for symbol and timeframe
     */
    loadData(symbol, timeframe, callback) {
        this.currentSymbol = symbol;
        this.currentTimeframe = timeframe;
        
        if (callback) {
            this.subscribers.push(callback);
        }

        if (!this.connected) {
            console.error('❌ Not connected to WebSocket');
            return;
        }

        const derivSymbol = this.symbolMap[symbol];
        if (!derivSymbol) {
            console.error('❌ Unknown symbol:', symbol);
            return;
        }

        // Request historical candles
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

        console.log('📊 Requesting data:', symbol, this.getTimeframeName(timeframe));
        this.ws.send(JSON.stringify(request));
    }

    /**
     * Handle incoming WebSocket messages
     */
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

    /**
     * Handle historical candles response
     */
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

        // Notify all subscribers
        this.notifySubscribers(candles, false);
    }

    /**
     * Handle live OHLC updates
     */
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

        // Update last candle or add new one
        if (this.chartData.length > 0) {
            const lastCandle = this.chartData[this.chartData.length - 1];
            if (lastCandle.time === candle.time) {
                this.chartData[this.chartData.length - 1] = candle;
            } else {
                this.chartData.push(candle);
            }
        } else {
            this.chartData.push(candle);
        }

        // Notify subscribers of live update
        this.notifySubscribers([candle], true);
    }

    /**
     * Notify all subscribers of data updates
     */
    notifySubscribers(data, isLiveUpdate) {
        this.subscribers.forEach(callback => {
            callback(data, isLiveUpdate);
        });
    }

    /**
     * Get current price
     */
    getCurrentPrice() {
        if (this.chartData.length === 0) return null;
        return this.chartData[this.chartData.length - 1].close;
    }

    /**
     * Get price change
     */
    getPriceChange() {
        if (this.chartData.length < 2) return { change: 0, percent: 0 };
        
        const current = this.chartData[this.chartData.length - 1].close;
        const previous = this.chartData[this.chartData.length - 2].close;
        const change = current - previous;
        const percent = (change / previous) * 100;
        
        return { change, percent };
    }

    /**
     * Get all chart data
     */
    getChartData() {
        return this.chartData;
    }

    /**
     * Get price decimal places for symbol
     */
    getDecimals(symbol) {
        return this.priceDecimals[symbol] || 5;
    }

    /**
     * Get timeframe name
     */
    getTimeframeName(seconds) {
        const map = {
            60: 'M1',
            120: 'M2',
            300: 'M5',
            900: 'M15',
            1800: 'M30',
            3600: 'H1',
            14400: 'H4',
            86400: 'D1'
        };
        return map[seconds] || `${seconds}s`;
    }

    /**
     * Unsubscribe from current data
     */
    unsubscribe() {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ forget_all: 'candles' }));
        }
        this.subscribers = [];
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.unsubscribe();
            this.ws.close();
            this.ws = null;
            this.connected = false;
        }
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
}

// Create global instance
const dataManager = new DataManager();

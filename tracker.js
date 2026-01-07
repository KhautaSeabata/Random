/**
 * SIGNAL TRACKER
 * Tracks signal performance, updates status, and manages Firebase storage
 */

class SignalTracker {
    constructor() {
        this.firebaseUrl = 'https://mzanzifx-default-rtdb.firebaseio.com';
        this.signals = [];
        this.tracking = false;
        this.trackingInterval = null;
    }

    /**
     * Start tracking all active signals
     */
    async startTracking() {
        if (this.tracking) return;
        
        console.log('📊 Starting signal tracker...');
        this.tracking = true;
        
        // Check if there's a manually tracked signal
        const trackingSignal = localStorage.getItem('trackingSignal');
        if (trackingSignal) {
            try {
                const signal = JSON.parse(trackingSignal);
                console.log('📍 Found manually tracked signal:', signal.symbol);
                // Signal already in Firebase, will be tracked automatically
            } catch (error) {
                console.error('Error parsing tracking signal:', error);
            }
        }
        
        // Load existing signals
        await this.loadSignals();
        
        // Check every 5 seconds
        this.trackingInterval = setInterval(() => {
            this.checkSignals();
        }, 5000);
    }

    /**
     * Stop tracking
     */
    stopTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        this.tracking = false;
        console.log('⏹️ Signal tracker stopped');
    }

    /**
     * Save signal to Firebase
     */
    async saveSignal(signal) {
        try {
            const response = await fetch(`${this.firebaseUrl}/signals.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signal)
            });
            
            const data = await response.json();
            signal.id = data.name;
            
            console.log('✅ Signal saved:', signal.id);
            return signal;
        } catch (error) {
            console.error('❌ Error saving signal:', error);
            return null;
        }
    }

    /**
     * Load all signals from Firebase
     */
    async loadSignals() {
        try {
            const response = await fetch(`${this.firebaseUrl}/signals.json`);
            const data = await response.json();
            
            if (!data) {
                this.signals = [];
                return [];
            }
            
            this.signals = Object.keys(data).map(id => ({
                id,
                ...data[id]
            }));
            
            console.log(`✅ Loaded ${this.signals.length} signals`);
            return this.signals;
        } catch (error) {
            console.error('❌ Error loading signals:', error);
            return [];
        }
    }

    /**
     * Check all active signals against current price
     */
    async checkSignals() {
        if (!dataManager.isConnected()) return;
        
        const currentPrice = dataManager.getCurrentPrice();
        if (!currentPrice) return;
        
        const activeSignals = this.signals.filter(s => s.status === 'active');
        
        for (const signal of activeSignals) {
            if (signal.symbol !== dataManager.currentSymbol) continue;
            
            const newStatus = this.determineStatus(signal, currentPrice);
            
            if (newStatus !== signal.status) {
                await this.updateSignalStatus(signal, newStatus, currentPrice);
            }
        }
    }

    /**
     * Determine signal status based on current price
     */
    determineStatus(signal, currentPrice) {
        if (signal.action === 'BUY') {
            // Check stop loss
            if (currentPrice <= signal.sl) {
                return 'hit_sl';
            }
            
            // Check take profits
            if (currentPrice >= signal.tp3) {
                return 'hit_tp3';
            }
            if (currentPrice >= signal.tp2) {
                return 'hit_tp2';
            }
            if (currentPrice >= signal.tp1) {
                return 'hit_tp1';
            }
            
            // Check breakeven (price near entry)
            if (Math.abs(currentPrice - signal.entry) / signal.entry < 0.001) {
                return 'breakeven';
            }
        } else {
            // SELL signal
            // Check stop loss
            if (currentPrice >= signal.sl) {
                return 'hit_sl';
            }
            
            // Check take profits
            if (currentPrice <= signal.tp3) {
                return 'hit_tp3';
            }
            if (currentPrice <= signal.tp2) {
                return 'hit_tp2';
            }
            if (currentPrice <= signal.tp1) {
                return 'hit_tp1';
            }
            
            // Check breakeven
            if (Math.abs(currentPrice - signal.entry) / signal.entry < 0.001) {
                return 'breakeven';
            }
        }
        
        return 'active';
    }

    /**
     * Update signal status in Firebase
     */
    async updateSignalStatus(signal, newStatus, currentPrice) {
        const updates = {
            status: newStatus,
            exitPrice: currentPrice,
            exitTime: Date.now()
        };
        
        // Calculate profit/loss in pips
        if (newStatus.startsWith('hit_')) {
            const pips = this.calculatePips(signal, currentPrice);
            updates.pips = pips;
            updates.profit = pips > 0;
        }
        
        try {
            await fetch(`${this.firebaseUrl}/signals/${signal.id}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            // Update local copy
            Object.assign(signal, updates);
            
            console.log(`✅ Signal ${signal.id} → ${newStatus}`);
            
            // Show notification
            if (typeof showNotification === 'function') {
                const emoji = newStatus === 'hit_sl' ? '❌' : 
                             newStatus === 'hit_tp3' ? '🎯' : '✅';
                showNotification(`${emoji} Signal ${newStatus.replace('hit_', '').toUpperCase()}`);
            }
            
        } catch (error) {
            console.error('❌ Error updating signal:', error);
        }
    }

    /**
     * Calculate profit/loss in pips
     */
    calculatePips(signal, exitPrice) {
        const entry = signal.entry;
        const decimals = this.getDecimalPlaces(signal.symbol);
        const pipMultiplier = decimals === 3 ? 0.01 : decimals === 5 ? 0.0001 : 0.01;
        
        if (signal.action === 'BUY') {
            return Math.round((exitPrice - entry) / pipMultiplier);
        } else {
            return Math.round((entry - exitPrice) / pipMultiplier);
        }
    }

    /**
     * Get decimal places for symbol
     */
    getDecimalPlaces(symbol) {
        const map = {
            'XAUUSD': 2,
            'BTCUSD': 2,
            'USDJPY': 3,
            'EURUSD': 5,
            'GBPUSD': 5,
            'USDCAD': 5,
            'AUDUSD': 5,
            'AUDCAD': 5
        };
        return map[symbol] || 5;
    }

    /**
     * Delete signal from Firebase
     */
    async deleteSignal(signalId) {
        try {
            await fetch(`${this.firebaseUrl}/signals/${signalId}.json`, {
                method: 'DELETE'
            });
            
            this.signals = this.signals.filter(s => s.id !== signalId);
            console.log('✅ Signal deleted:', signalId);
            return true;
        } catch (error) {
            console.error('❌ Error deleting signal:', error);
            return false;
        }
    }

    /**
     * Delete multiple signals
     */
    async deleteMultipleSignals(signalIds) {
        const promises = signalIds.map(id => this.deleteSignal(id));
        await Promise.all(promises);
        console.log(`✅ Deleted ${signalIds.length} signals`);
    }

    /**
     * Get signals sorted by status
     */
    getSignalsByStatus(status) {
        return this.signals.filter(s => s.status === status)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get all signals sorted by timestamp
     */
    getAllSignals() {
        return this.signals.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const total = this.signals.length;
        const active = this.signals.filter(s => s.status === 'active').length;
        const tp1 = this.signals.filter(s => s.status === 'hit_tp1').length;
        const tp2 = this.signals.filter(s => s.status === 'hit_tp2').length;
        const tp3 = this.signals.filter(s => s.status === 'hit_tp3').length;
        const sl = this.signals.filter(s => s.status === 'hit_sl').length;
        const breakeven = this.signals.filter(s => s.status === 'breakeven').length;
        
        const winners = tp1 + tp2 + tp3;
        const winRate = total > 0 ? (winners / total) * 100 : 0;
        
        return {
            total,
            active,
            tp1,
            tp2,
            tp3,
            sl,
            breakeven,
            winners,
            winRate: winRate.toFixed(1)
        };
    }
}

// Create global instance
const signalTracker = new SignalTracker();

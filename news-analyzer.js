/**
 * ADVANCED NEWS SENTIMENT ANALYZER
 * Multi-layer analysis: Currency → Assets → Companies
 * Provides deep fundamental analysis for trading decisions
 */

class NewsAnalyzer {
  constructor() {
    this.finnhubKey = 'd5cmp01r01qvl80l6k0gd5cmp01r01qvl80l6k10'; // Finnhub API Key
    this.alphaVantageKey = 'demo'; // Get free key at alphavantage.co
    this.cache = new Map();
    this.cacheTime = 5 * 60 * 1000; // 5 minutes
    
    // Currency → Top 8 Assets mapping
    this.currencyAssets = {
      'XAUUSD': {
        name: 'Gold / US Dollar',
        assets: [
          { symbol: 'GLD', name: 'Gold ETF', weight: 0.20 },
          { symbol: 'NEM', name: 'Newmont Mining', weight: 0.15 },
          { symbol: 'GOLD', name: 'Barrick Gold', weight: 0.15 },
          { symbol: 'DXY', name: 'US Dollar Index', weight: 0.15 },
          { symbol: 'UUP', name: 'Dollar ETF', weight: 0.10 },
          { symbol: 'TLT', name: 'Treasury Bonds', weight: 0.10 },
          { symbol: 'VIX', name: 'Volatility Index', weight: 0.10 },
          { symbol: 'USO', name: 'Oil ETF', weight: 0.05 }
        ]
      },
      'BTCUSD': {
        name: 'Bitcoin / US Dollar',
        assets: [
          { symbol: 'BTC-USD', name: 'Bitcoin', weight: 0.30 },
          { symbol: 'COIN', name: 'Coinbase', weight: 0.15 },
          { symbol: 'MSTR', name: 'MicroStrategy', weight: 0.12 },
          { symbol: 'RIOT', name: 'Riot Platforms', weight: 0.10 },
          { symbol: 'MARA', name: 'Marathon Digital', weight: 0.10 },
          { symbol: 'SQ', name: 'Block (Square)', weight: 0.08 },
          { symbol: 'PYPL', name: 'PayPal', weight: 0.08 },
          { symbol: 'DXY', name: 'US Dollar Index', weight: 0.07 }
        ]
      },
      'EURUSD': {
        name: 'Euro / US Dollar',
        assets: [
          { symbol: 'FXE', name: 'Euro ETF', weight: 0.20 },
          { symbol: 'DXY', name: 'US Dollar Index', weight: 0.18 },
          { symbol: 'EZU', name: 'Eurozone ETF', weight: 0.15 },
          { symbol: 'DBK', name: 'Deutsche Bank', weight: 0.12 },
          { symbol: 'UUP', name: 'Dollar ETF', weight: 0.10 },
          { symbol: 'BNP.PA', name: 'BNP Paribas', weight: 0.10 },
          { symbol: 'IEV', name: 'Europe ETF', weight: 0.08 },
          { symbol: 'TLT', name: 'Treasury Bonds', weight: 0.07 }
        ]
      },
      'GBPUSD': {
        name: 'British Pound / US Dollar',
        assets: [
          { symbol: 'FXB', name: 'Pound ETF', weight: 0.20 },
          { symbol: 'DXY', name: 'US Dollar Index', weight: 0.18 },
          { symbol: 'HSBC', name: 'HSBC Holdings', weight: 0.15 },
          { symbol: 'BP', name: 'BP plc', weight: 0.12 },
          { symbol: 'EWU', name: 'UK ETF', weight: 0.10 },
          { symbol: 'BARC.L', name: 'Barclays', weight: 0.10 },
          { symbol: 'RIO', name: 'Rio Tinto', weight: 0.08 },
          { symbol: 'UUP', name: 'Dollar ETF', weight: 0.07 }
        ]
      },
      'USDCAD': {
        name: 'US Dollar / Canadian Dollar',
        assets: [
          { symbol: 'FXC', name: 'Canadian Dollar ETF', weight: 0.20 },
          { symbol: 'DXY', name: 'US Dollar Index', weight: 0.18 },
          { symbol: 'EWC', name: 'Canada ETF', weight: 0.15 },
          { symbol: 'USO', name: 'Oil ETF', weight: 0.15 },
          { symbol: 'RY', name: 'Royal Bank Canada', weight: 0.10 },
          { symbol: 'TD', name: 'TD Bank', weight: 0.10 },
          { symbol: 'ENB', name: 'Enbridge', weight: 0.07 },
          { symbol: 'CNQ', name: 'Canadian Natural', weight: 0.05 }
        ]
      },
      'AUDUSD': {
        name: 'Australian Dollar / US Dollar',
        assets: [
          { symbol: 'FXA', name: 'Aussie Dollar ETF', weight: 0.20 },
          { symbol: 'DXY', name: 'US Dollar Index', weight: 0.18 },
          { symbol: 'EWA', name: 'Australia ETF', weight: 0.15 },
          { symbol: 'BHP', name: 'BHP Group', weight: 0.15 },
          { symbol: 'RIO', name: 'Rio Tinto', weight: 0.12 },
          { symbol: 'CBA.AX', name: 'CommBank Australia', weight: 0.08 },
          { symbol: 'GLD', name: 'Gold ETF', weight: 0.07 },
          { symbol: 'FMG', name: 'Fortescue Metals', weight: 0.05 }
        ]
      },
      'AUDCAD': {
        name: 'Australian Dollar / Canadian Dollar',
        assets: [
          { symbol: 'FXA', name: 'Aussie Dollar ETF', weight: 0.18 },
          { symbol: 'FXC', name: 'Canadian Dollar ETF', weight: 0.18 },
          { symbol: 'BHP', name: 'BHP Group', weight: 0.15 },
          { symbol: 'RIO', name: 'Rio Tinto', weight: 0.12 },
          { symbol: 'USO', name: 'Oil ETF', weight: 0.12 },
          { symbol: 'GLD', name: 'Gold ETF', weight: 0.10 },
          { symbol: 'EWA', name: 'Australia ETF', weight: 0.08 },
          { symbol: 'EWC', name: 'Canada ETF', weight: 0.07 }
        ]
      },
      'USDJPY': {
        name: 'US Dollar / Japanese Yen',
        assets: [
          { symbol: 'FXY', name: 'Yen ETF', weight: 0.20 },
          { symbol: 'DXY', name: 'US Dollar Index', weight: 0.18 },
          { symbol: 'EWJ', name: 'Japan ETF', weight: 0.15 },
          { symbol: 'TM', name: 'Toyota Motor', weight: 0.12 },
          { symbol: 'SONY', name: 'Sony Corp', weight: 0.10 },
          { symbol: 'MUFG', name: 'Mitsubishi UFJ', weight: 0.10 },
          { symbol: 'HMC', name: 'Honda Motor', weight: 0.08 },
          { symbol: 'TLT', name: 'Treasury Bonds', weight: 0.07 }
        ]
      }
    };
    
    // Asset → Top 10 Companies mapping
    this.assetCompanies = {
      'GLD': ['NEM', 'GOLD', 'AEM', 'FNV', 'WPM', 'KGC', 'AUY', 'AG', 'HL', 'PAAS'],
      'DXY': ['JPM', 'BAC', 'GS', 'MS', 'C', 'WFC', 'USB', 'PNC', 'BK', 'STT'],
      'USO': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'HAL'],
      'TLT': ['JPM', 'BAC', 'GS', 'BLK', 'SCHW', 'MS', 'USB', 'PNC', 'TFC', 'STT'],
      'VIX': ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'AGG', 'BND'],
      'BTC-USD': ['COIN', 'MSTR', 'RIOT', 'MARA', 'SQ', 'PYPL', 'HOOD', 'SI', 'CLSK', 'HUT'],
      'FXE': ['DBK', 'BNP.PA', 'SAN', 'BBVA', 'ING', 'CS', 'UBS', 'CRDI.MI', 'ISP.MI', 'GLE.PA']
    };
    
    // Sentiment keywords
    this.sentimentKeywords = {
      bullish: [
        'surge', 'jump', 'soar', 'rally', 'gain', 'rise', 'boost', 'growth',
        'profit', 'beat', 'exceed', 'strong', 'record', 'upgrade', 'outperform',
        'buy', 'positive', 'bullish', 'breakthrough', 'success', 'optimistic'
      ],
      bearish: [
        'fall', 'drop', 'decline', 'plunge', 'crash', 'loss', 'miss', 'weak',
        'concern', 'fear', 'risk', 'warning', 'downgrade', 'underperform', 'sell',
        'negative', 'bearish', 'slump', 'failure', 'pessimistic', 'crisis'
      ],
      volatile: [
        'volatile', 'volatility', 'shock', 'surprise', 'unexpected', 'break',
        'record', 'historic', 'crisis', 'emergency', 'dramatic', 'massive',
        'unprecedented', 'extreme', 'wild', 'turbulent'
      ]
    };
  }

  /**
   * MAIN ANALYSIS FUNCTION
   * Performs multi-layer analysis: Currency → Assets → Companies
   */
  async analyzeCurrency(symbol) {
    console.log(`🔍 Starting deep analysis for ${symbol}...`);
    
    const currencyInfo = this.currencyAssets[symbol];
    if (!currencyInfo) {
      console.warn(`⚠️ No asset mapping for ${symbol}`);
      return this.getEmptyAnalysis();
    }
    
    const startTime = Date.now();
    
    // Layer 1: Analyze all 8 assets
    const assetAnalyses = [];
    for (const asset of currencyInfo.assets) {
      console.log(`📊 Analyzing ${asset.name}...`);
      const analysis = await this.analyzeAsset(asset);
      assetAnalyses.push({
        ...analysis,
        weight: asset.weight,
        assetName: asset.name
      });
    }
    
    // Layer 2: Aggregate weighted sentiment
    let totalSentiment = 0;
    let totalVolatility = 0;
    let totalConfidence = 0;
    let totalArticles = 0;
    let allReasons = [];
    
    assetAnalyses.forEach(analysis => {
      totalSentiment += analysis.sentiment * analysis.weight;
      totalVolatility += analysis.volatility * analysis.weight;
      totalConfidence += analysis.confidence * analysis.weight;
      totalArticles += analysis.articles;
      
      if (analysis.sentiment !== 0) {
        allReasons.push(`${analysis.assetName}: ${analysis.sentiment > 0 ? '+' : ''}${analysis.sentiment}`);
      }
    });
    
    const direction = totalSentiment > 20 ? 'BULLISH' : 
                     totalSentiment < -20 ? 'BEARISH' : 'NEUTRAL';
    
    const impact = totalVolatility > 60 ? 'HIGH' : 
                   totalVolatility > 30 ? 'MEDIUM' : 'LOW';
    
    const elapsedTime = Date.now() - startTime;
    
    console.log(`✅ Analysis complete in ${elapsedTime}ms`);
    console.log(`📊 Sentiment: ${totalSentiment.toFixed(0)} | Volatility: ${totalVolatility.toFixed(0)}`);
    
    return {
      symbol,
      currencyName: currencyInfo.name,
      sentiment: Math.round(totalSentiment),
      volatility: Math.round(totalVolatility),
      direction,
      confidence: Math.round(totalConfidence),
      impact,
      articles: totalArticles,
      assets: assetAnalyses.length,
      reasons: allReasons.slice(0, 5),
      assetBreakdown: assetAnalyses.map(a => ({
        name: a.assetName,
        sentiment: a.sentiment,
        volatility: a.volatility,
        articles: a.articles
      })),
      timestamp: Date.now(),
      analysisTime: elapsedTime
    };
  }

  /**
   * LAYER 1: Analyze single asset
   * Gets news from asset + its top 10 companies
   */
  async analyzeAsset(asset) {
    // Get companies for this asset
    const companies = this.assetCompanies[asset.symbol] || [asset.symbol];
    
    // Fetch news for asset + all companies
    const allNews = [];
    
    // Asset news
    const assetNews = await this.getNews(asset.symbol);
    allNews.push(...assetNews);
    
    // Company news (top 3 companies for speed)
    for (const company of companies.slice(0, 3)) {
      const companyNews = await this.getNews(company);
      allNews.push(...companyNews);
      
      // Small delay to avoid rate limiting
      await this.delay(100);
    }
    
    // Analyze all news
    if (allNews.length === 0) {
      return {
        sentiment: 0,
        volatility: 0,
        confidence: 0,
        articles: 0
      };
    }
    
    let totalSentiment = 0;
    let totalVolatility = 0;
    let weights = 0;
    
    allNews.forEach((article, index) => {
      const text = `${article.headline} ${article.summary || ''}`;
      const analysis = this.analyzeSentiment(text);
      
      // Recent articles weighted more
      const hoursOld = (Date.now() - article.datetime * 1000) / (1000 * 60 * 60);
      const recencyWeight = Math.exp(-hoursOld * 0.3);
      
      totalSentiment += analysis.sentiment * recencyWeight;
      totalVolatility += analysis.volatility * recencyWeight;
      weights += recencyWeight;
    });
    
    const avgSentiment = weights > 0 ? totalSentiment / weights : 0;
    const avgVolatility = weights > 0 ? totalVolatility / weights : 0;
    
    return {
      sentiment: Math.round(avgSentiment),
      volatility: Math.round(avgVolatility),
      confidence: Math.min(100, allNews.length * 8),
      articles: allNews.length
    };
  }

  /**
   * Get news from Finnhub API (last 6 hours)
   */
  async getNews(symbol) {
    const cacheKey = `news_${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.time < this.cacheTime) {
      return cached.data;
    }
    
    try {
      // Use 7 days of news (Finnhub free tier limitation)
      const today = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const from = sevenDaysAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${this.finnhubKey}`;
      
      console.log(`📡 Fetching news for ${symbol}...`);
      const res = await fetch(url);
      
      if (!res.ok) {
        console.warn(`⚠️ News fetch failed for ${symbol}: ${res.status}`);
        return [];
      }
      
      const news = await res.json();
      console.log(`📰 Got ${(news || []).length} articles for ${symbol}`);
      
      // Filter to last 7 days (but analyze all)
      const sevenDaysAgoTimestamp = Date.now() / 1000 - 7 * 24 * 60 * 60;
      const filtered = (news || []).filter(n => n.datetime && n.datetime > sevenDaysAgoTimestamp);
      
      console.log(`📊 Filtered to ${filtered.length} recent articles`);
      
      this.cache.set(cacheKey, { data: filtered, time: Date.now() });
      
      return filtered;
    } catch (error) {
      console.error(`❌ News error for ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text) {
    if (!text) return { sentiment: 0, volatility: 0 };
    
    text = text.toLowerCase();
    
    let bullishScore = 0;
    let bearishScore = 0;
    let volatilityScore = 0;
    
    // Count keyword matches
    this.sentimentKeywords.bullish.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) bullishScore += matches.length;
    });
    
    this.sentimentKeywords.bearish.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) bearishScore += matches.length;
    });
    
    this.sentimentKeywords.volatile.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) volatilityScore += matches.length;
    });
    
    // Calculate scores
    const total = bullishScore + bearishScore;
    const sentiment = total === 0 ? 0 : ((bullishScore - bearishScore) / total) * 100;
    const volatility = Math.min(100, volatilityScore * 20);
    
    return {
      sentiment: Math.round(sentiment),
      volatility: Math.round(volatility)
    };
  }

  /**
   * Get empty analysis result
   */
  getEmptyAnalysis() {
    return {
      sentiment: 0,
      volatility: 0,
      direction: 'NEUTRAL',
      confidence: 0,
      impact: 'NONE',
      articles: 0,
      assets: 0,
      reasons: [],
      assetBreakdown: [],
      timestamp: Date.now()
    };
  }

  /**
   * Simple delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ News cache cleared');
  }
}

// Create global instance
const newsAnalyzer = new NewsAnalyzer();

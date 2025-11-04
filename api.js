/**
 * API Integration Module for CarbonChain
 * Handles all external API calls and data management
 */

const API_CONFIG = {
  carbonMKTS: {
    key: 'cm_api_sandbox_a29790b0-6d20-4e17-b4c4-b8da324c57ed',
    baseUrl: 'https://api.carbonmkts.com'
  },
  gemini: {
    key: 'AIzaSyBpkpnJrUeyj4iccfQmSAQoLTHd2twHisI',
    model: 'gemini-1.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
  },
  infura: {
    key: '544361233803415e9364b32e0ce44e24',
    rpcUrl: 'https://polygon-mumbai.infura.io/v3/544361233803415e9364b32e0ce44e24'
  }
};

// In-memory state management (replaces localStorage due to sandbox restrictions)
const AppState = {
  wallet: {
    address: null,
    balance: 0,
    tCO2Balance: 0,
    stakedBalance: 0,
    rewards: 0
  },
  market: {
    currentPrice: 15.50,
    volume24h: 125000,
    priceHistory: []
  },
  stats: {
    totalMinted: 0,
    totalRetired: 0,
    totalStaked: 0
  },
  transactions: [],
  retirements: [],
  projects: [],
  chatHistory: []
};

/**
 * Carbon Markets API Integration
 */
class CarbonMKTSAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = API_CONFIG.carbonMKTS.baseUrl;
  }

  /**
   * Fetch carbon projects from CarbonMKTS
   */
  async getProjects(limit = 50) {
    try {
      // CarbonMKTS API endpoint for projects
      const response = await fetch(`${this.baseUrl}/projects?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('CarbonMKTS API call failed, using mock data');
        return this.getMockProjects();
      }

      const data = await response.json();
      return this.formatProjects(data);
    } catch (error) {
      console.warn('CarbonMKTS API error:', error.message);
      return this.getMockProjects();
    }
  }

  /**
   * Search projects by query
   */
  async searchProjects(query) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const allProjects = await this.getProjects();
        return allProjects.filter(p => 
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.country.toLowerCase().includes(query.toLowerCase()) ||
          p.type.toLowerCase().includes(query.toLowerCase())
        );
      }

      const data = await response.json();
      return this.formatProjects(data);
    } catch (error) {
      console.warn('Search error:', error.message);
      const allProjects = await this.getProjects();
      return allProjects.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  /**
   * Get project details by ID
   */
  async getProjectById(id) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const projects = await this.getProjects();
        return projects.find(p => p.id === id);
      }

      const data = await response.json();
      return this.formatProject(data);
    } catch (error) {
      console.warn('Get project error:', error.message);
      const projects = await this.getProjects();
      return projects.find(p => p.id === id);
    }
  }

  /**
   * Format project data from API response
   */
  formatProjects(data) {
    if (!data || !Array.isArray(data.projects)) {
      return this.getMockProjects();
    }

    return data.projects.map((project, index) => ({
      id: project.id || `project-${index}`,
      name: project.name || 'Unknown Project',
      registry: project.registry || 'N/A',
      country: project.country || 'Unknown',
      type: project.type || project.methodology || 'Carbon Offset',
      totalIssuance: project.totalIssuance || Math.floor(Math.random() * 500000),
      totalRetirement: project.totalRetirement || Math.floor(Math.random() * 200000),
      price: project.price || (15 + Math.random() * 5).toFixed(2),
      vintage: project.vintage || '2024',
      description: project.description || 'Verified carbon offset project'
    }));
  }

  formatProject(data) {
    return {
      id: data.id,
      name: data.name || 'Unknown Project',
      registry: data.registry || 'N/A',
      country: data.country || 'Unknown',
      type: data.type || 'Carbon Offset',
      totalIssuance: data.totalIssuance || 0,
      totalRetirement: data.totalRetirement || 0,
      price: data.price || 15.50,
      vintage: data.vintage || '2024',
      description: data.description || ''
    };
  }

  /**
   * Mock data for development/fallback
   */
  getMockProjects() {
    return [
      {
        id: 'acr-1',
        name: 'Zefiro Methane OOG A - Drake',
        registry: 'ACR',
        country: 'United States',
        type: 'Plugging Oil & Gas Wells',
        totalIssuance: 47396,
        totalRetirement: 33386,
        price: 15.50,
        vintage: '2024',
        description: 'Methane abatement through oil and gas well plugging'
      },
      {
        id: 'acr-2',
        name: 'Heartland Methane Abatement Project',
        registry: 'ACR',
        country: 'United States',
        type: 'Methane Reduction',
        totalIssuance: 150000,
        totalRetirement: 50000,
        price: 16.25,
        vintage: '2023',
        description: 'Agricultural methane capture and destruction'
      },
      {
        id: 'verra-1',
        name: 'Renewable Energy Generation Project',
        registry: 'Verra',
        country: 'India',
        type: 'Wind Energy',
        totalIssuance: 250000,
        totalRetirement: 120000,
        price: 17.00,
        vintage: '2024',
        description: 'Large-scale wind energy generation'
      },
      {
        id: 'gs-1',
        name: 'Amazon Rainforest Conservation',
        registry: 'Gold Standard',
        country: 'Brazil',
        type: 'REDD+',
        totalIssuance: 500000,
        totalRetirement: 200000,
        price: 18.50,
        vintage: '2024',
        description: 'Reducing emissions from deforestation and forest degradation'
      },
      {
        id: 'verra-2',
        name: 'Solar Power Project - Tamil Nadu',
        registry: 'Verra',
        country: 'India',
        type: 'Solar Energy',
        totalIssuance: 180000,
        totalRetirement: 75000,
        price: 16.75,
        vintage: '2023',
        description: 'Grid-connected solar photovoltaic power generation'
      },
      {
        id: 'acr-3',
        name: 'Improved Cookstoves Distribution',
        registry: 'ACR',
        country: 'Kenya',
        type: 'Energy Efficiency',
        totalIssuance: 95000,
        totalRetirement: 45000,
        price: 14.50,
        vintage: '2024',
        description: 'Distribution of fuel-efficient cookstoves to rural households'
      },
      {
        id: 'gs-2',
        name: 'Biogas from Agricultural Waste',
        registry: 'Gold Standard',
        country: 'Thailand',
        type: 'Biogas',
        totalIssuance: 120000,
        totalRetirement: 60000,
        price: 15.75,
        vintage: '2023',
        description: 'Biogas generation from agricultural residues'
      },
      {
        id: 'verra-3',
        name: 'Mangrove Restoration Project',
        registry: 'Verra',
        country: 'Indonesia',
        type: 'Afforestation',
        totalIssuance: 300000,
        totalRetirement: 150000,
        price: 19.00,
        vintage: '2024',
        description: 'Coastal mangrove ecosystem restoration and conservation'
      }
    ];
  }
}

/**
 * Gemini AI Chatbot Integration
 */
class GeminiChatbot {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = API_CONFIG.gemini.endpoint;
    this.systemContext = `You are a helpful assistant for CarbonChain, a Web3 DeFi platform for tokenized carbon credits. 
    You help users understand:
    - How carbon credits work and their environmental impact
    - The tokenization process (minting tCO2 tokens backed by verified carbon credits)
    - Trading carbon credits on the decentralized marketplace
    - Staking tCO2 tokens for rewards (12% APY)
    - Retiring/burning tokens to offset carbon footprint
    - DAO governance and voting on proposals
    - Proof of Retirement (PoR) certificates stored on IPFS
    
    Keep responses concise, helpful, and focused on carbon credits and blockchain technology.`;
  }

  /**
   * Send message to Gemini AI
   */
  async sendMessage(message) {
    try {
      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${this.systemContext}\n\nUser: ${message}\n\nAssistant:`
            }]
          }]
        })
      });

      if (!response.ok) {
        console.warn('Gemini API call failed');
        return this.getFallbackResponse(message);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }

      return this.getFallbackResponse(message);
    } catch (error) {
      console.warn('Gemini API error:', error.message);
      return this.getFallbackResponse(message);
    }
  }

  /**
   * Fallback responses when API is unavailable
   */
  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('carbon credit') || lowerMessage.includes('what is')) {
      return 'Carbon credits are tradable certificates representing the reduction of one metric ton of CO2 emissions. On CarbonChain, we tokenize these verified credits into tCO2 tokens on the blockchain, making them easily tradable and transparent.';
    }
    
    if (lowerMessage.includes('tokeniz') || lowerMessage.includes('mint')) {
      return 'To tokenize carbon credits: 1) Browse verified projects from registries like Verra or Gold Standard, 2) Select a project and amount, 3) Mint tCO2 tokens backed by those credits. Each token represents 1 metric ton of CO2 offset.';
    }
    
    if (lowerMessage.includes('trade') || lowerMessage.includes('marketplace')) {
      return 'Our marketplace uses an Automated Market Maker (AMM) for instant liquidity. You can buy or sell tCO2 tokens against USDT with low slippage. Trading fees are 0.3%, with a portion going to the DAO treasury.';
    }
    
    if (lowerMessage.includes('stake') || lowerMessage.includes('staking')) {
      return 'Staking allows you to lock your tCO2 tokens and earn 12% APY rewards. Simply go to the Staking page, choose an amount, and stake. You can unstake anytime and claim your rewards.';
    }
    
    if (lowerMessage.includes('retire') || lowerMessage.includes('burn') || lowerMessage.includes('offset')) {
      return 'Retiring tokens permanently removes them from circulation, offsetting your carbon footprint. When you retire tCO2, you receive a Proof of Retirement (PoR) certificate stored on IPFS that verifies your climate action on-chain.';
    }
    
    if (lowerMessage.includes('dao') || lowerMessage.includes('governance') || lowerMessage.includes('vote')) {
      return 'CarbonChain is governed by a DAO. Token holders can vote on proposals like treasury allocations, APY changes, and project funding. Your voting power is proportional to your tCO2 holdings.';
    }

    if (lowerMessage.includes('wallet') || lowerMessage.includes('connect')) {
      return 'To get started, click "Connect Wallet" in the top right. We support MetaMask and WalletConnect. Make sure you\'re connected to Polygon Mumbai testnet.';
    }

    return 'I\'m here to help you with CarbonChain! You can ask me about carbon credits, tokenization, trading, staking, retirement certificates, or DAO governance. What would you like to know?';
  }
}

/**
 * Market Data Service
 */
class MarketDataService {
  constructor() {
    this.currentPrice = 15.50;
    this.priceHistory = this.generatePriceHistory();
  }

  /**
   * Get current tCO2 price
   */
  getCurrentPrice() {
    return this.currentPrice;
  }

  /**
   * Get price change percentage
   */
  getPriceChange() {
    if (this.priceHistory.length < 2) return 0;
    const yesterday = this.priceHistory[this.priceHistory.length - 2].price;
    const today = this.currentPrice;
    return (((today - yesterday) / yesterday) * 100).toFixed(2);
  }

  /**
   * Get 24h trading volume
   */
  get24hVolume() {
    return 125000 + Math.floor(Math.random() * 50000);
  }

  /**
   * Get price history for charts
   */
  getPriceHistory(days = 7) {
    return this.priceHistory.slice(-days);
  }

  /**
   * Generate mock price history
   */
  generatePriceHistory() {
    const history = [];
    let price = 15.00;
    const today = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Random price fluctuation
      price = price + (Math.random() - 0.5) * 0.5;
      price = Math.max(14, Math.min(18, price)); // Keep between $14-$18

      history.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(price.toFixed(2)),
        volume: Math.floor(100000 + Math.random() * 100000)
      });
    }

    this.currentPrice = history[history.length - 1].price;
    return history;
  }

  /**
   * Calculate token output for AMM swap
   */
  calculateSwapOutput(inputAmount, inputReserve, outputReserve, fee = 0.003) {
    const inputAmountWithFee = inputAmount * (1 - fee);
    const numerator = inputAmountWithFee * outputReserve;
    const denominator = inputReserve + inputAmountWithFee;
    return numerator / denominator;
  }

  /**
   * Get mock liquidity pool reserves
   */
  getPoolReserves() {
    return {
      tCO2: 1000000,
      USDT: 15500000
    };
  }
}

/**
 * Transaction Manager
 */
class TransactionManager {
  constructor() {
    this.transactions = [];
  }

  /**
   * Add transaction to history
   */
  addTransaction(tx) {
    const transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...tx
    };
    this.transactions.unshift(transaction);
    AppState.transactions = this.transactions;
    return transaction;
  }

  /**
   * Get transaction history
   */
  getTransactions(filter = 'all') {
    if (filter === 'all') {
      return this.transactions;
    }
    return this.transactions.filter(tx => tx.type === filter);
  }

  /**
   * Get recent transactions
   */
  getRecentTransactions(limit = 10) {
    return this.transactions.slice(0, limit);
  }
}

/**
 * IPFS Storage Service (Mock)
 */
class IPFSService {
  /**
   * Upload data to IPFS (simulated)
   */
  async upload(data) {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock CID
    const mockCID = 'Qm' + Math.random().toString(36).substr(2, 44);
    
    return {
      cid: mockCID,
      url: `https://ipfs.io/ipfs/${mockCID}`,
      data: data
    };
  }

  /**
   * Retrieve data from IPFS (simulated)
   */
  async retrieve(cid) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      cid: cid,
      data: 'Mock IPFS data'
    };
  }
}

// Initialize services
const carbonAPI = new CarbonMKTSAPI(API_CONFIG.carbonMKTS.key);
const geminiBot = new GeminiChatbot(API_CONFIG.gemini.key);
const marketData = new MarketDataService();
const txManager = new TransactionManager();
const ipfsService = new IPFSService();

// Export services and state
window.CarbonChainAPI = {
  carbonAPI,
  geminiBot,
  marketData,
  txManager,
  ipfsService,
  AppState,
  API_CONFIG
};

/**
 * CarbonChain Main Application
 * Handles UI interactions, routing, and application logic
 */

// Application state
let currentPage = 'dashboard';
let priceChart = null;
let selectedSlippage = 0.1;

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌱 CarbonChain DApp Initializing...');
  
  // Initialize theme
  initializeTheme();
  
  // Setup navigation
  setupNavigation();
  
  // Setup wallet connection
  setupWalletConnection();
  
  // Setup chatbot
  setupChatbot();
  
  // Load initial data
  await loadDashboardData();
  
  // Setup page-specific interactions
  setupTokenizePage();
  setupMarketplacePage();
  setupStakingPage();
  setupRetirementPage();
  setupGovernancePage();
  setupPortfolioPage();
  
  console.log('✅ CarbonChain DApp Ready!');
});

/**
 * Theme Management
 */
function initializeTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  
  updateThemeIcon(currentTheme);
  
  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('.theme-icon');
  icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/**
 * Navigation Setup
 */
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      navigateToPage(page);
    });
  });
}

function navigateToPage(page) {
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === page) {
      link.classList.add('active');
    }
  });
  
  // Hide all page views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Show selected page
  const pageView = document.getElementById(`${page}-view`);
  if (pageView) {
    pageView.classList.add('active');
    currentPage = page;
    
    // Load page-specific data
    loadPageData(page);
  }
}

function loadPageData(page) {
  switch(page) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'tokenize':
      loadProjects();
      break;
    case 'marketplace':
      loadMarketData();
      break;
    case 'governance':
      loadProposals();
      break;
    case 'portfolio':
      loadPortfolioData();
      break;
  }
}

/**
 * Wallet Connection
 */
function setupWalletConnection() {
  const connectBtn = document.getElementById('connectWallet');
  const btnText = document.getElementById('walletBtnText');
  
  connectBtn.addEventListener('click', async () => {
    const { wallet } = window.CarbonChainContracts;
    
    if (wallet.connected) {
      // Show wallet info
      showToast('Wallet Connected', `Address: ${wallet.getShortAddress()}`, 'success');
      return;
    }
    
    try {
      showLoadingOverlay('Connecting wallet...');
      const result = await wallet.connect();
      
      btnText.textContent = wallet.getShortAddress();
      connectBtn.classList.add('connected');
      
      hideLoadingOverlay();
      showToast('Success', 'Wallet connected successfully!', 'success');
      
      // Refresh data
      updateWalletBalances();
      if (currentPage === 'dashboard') {
        loadDashboardData();
      }
    } catch (error) {
      hideLoadingOverlay();
      showToast('Connection Failed', error.message, 'error');
    }
  });
}

function updateWalletBalances() {
  const { AppState } = window.CarbonChainAPI;
  const wallet = AppState.wallet;
  
  // Update all balance displays
  const balanceElements = {
    'stakingBalance': wallet.tCO2Balance,
    'retirementBalance': wallet.tCO2Balance,
    'portfolioBalance': wallet.tCO2Balance,
    'portfolioStaked': wallet.stakedBalance,
    'portfolioRetired': 0,
    'portfolioValue': (wallet.tCO2Balance * window.CarbonChainAPI.marketData.getCurrentPrice()).toFixed(2),
    'userStaked': wallet.stakedBalance,
    'earnedRewards': wallet.rewards
  };
  
  Object.entries(balanceElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

/**
 * Dashboard Data Loading
 */
async function loadDashboardData() {
  const { marketData, AppState } = window.CarbonChainAPI;
  
  // Update stats
  document.getElementById('totalMinted').textContent = formatNumber(AppState.stats.totalMinted || 125000);
  document.getElementById('marketVolume').textContent = '$' + formatNumber(marketData.get24hVolume());
  document.getElementById('totalRetired').textContent = formatNumber(AppState.stats.totalRetired || 33000);
  document.getElementById('stakedValue').textContent = '$' + formatNumber((AppState.stats.totalStaked || 50000) * marketData.getCurrentPrice());
  
  // Update price
  const currentPrice = marketData.getCurrentPrice();
  const priceChange = marketData.getPriceChange();
  
  document.getElementById('currentPrice').textContent = '$' + currentPrice.toFixed(2);
  
  const priceChangeElement = document.getElementById('priceChange');
  priceChangeElement.textContent = (priceChange >= 0 ? '+' : '') + priceChange + '%';
  priceChangeElement.className = 'price-change ' + (priceChange >= 0 ? 'positive' : 'negative');
  
  // Load price chart
  loadPriceChart();
  
  // Load recent activity
  loadRecentActivity();
}

function loadPriceChart() {
  const ctx = document.getElementById('priceChart');
  if (!ctx) return;
  
  const { marketData } = window.CarbonChainAPI;
  const priceHistory = marketData.getPriceHistory(7);
  
  if (priceChart) {
    priceChart.destroy();
  }
  
  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: priceHistory.map(h => {
        const date = new Date(h.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'tCO2 Price',
        data: priceHistory.map(h => h.price),
        borderColor: '#21808D',
        backgroundColor: 'rgba(33, 128, 141, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => '$' + context.parsed.y.toFixed(2)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value) => '$' + value.toFixed(2)
          }
        }
      }
    }
  });
}

function loadRecentActivity() {
  const container = document.getElementById('recentActivity');
  const { txManager } = window.CarbonChainAPI;
  const recent = txManager.getRecentTransactions(5);
  
  if (recent.length === 0) {
    container.innerHTML = '<div class="activity-item"><span class="activity-icon">📭</span><span>No recent activity</span></div>';
    return;
  }
  
  container.innerHTML = recent.map(tx => `
    <div class="activity-item">
      <span class="activity-icon">${getActivityIcon(tx.type)}</span>
      <div style="flex: 1;">
        <div style="font-weight: 500;">${formatActivityType(tx.type)}</div>
        <div style="font-size: 12px; color: var(--color-text-secondary);">${formatTimestamp(tx.timestamp)}</div>
      </div>
      <div style="font-weight: 600;">${tx.amount} tCO2</div>
    </div>
  `).join('');
}

/**
 * Tokenization Page
 */
function setupTokenizePage() {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('projectSearch');
  
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      searchProjects(query);
    } else {
      loadProjects();
    }
  });
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
}

async function loadProjects() {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '<div class="loading-spinner">Loading projects from CarbonMKTS...</div>';
  
  try {
    const { carbonAPI } = window.CarbonChainAPI;
    const projects = await carbonAPI.getProjects(20);
    
    if (projects.length === 0) {
      grid.innerHTML = '<p class="empty-state">No projects found</p>';
      return;
    }
    
    grid.innerHTML = projects.map(project => createProjectCard(project)).join('');
    
    // Add mint button listeners
    document.querySelectorAll('.mint-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const projectId = btn.getAttribute('data-project-id');
        showMintDialog(projectId);
      });
    });
  } catch (error) {
    grid.innerHTML = '<p class="empty-state">Failed to load projects. Please try again.</p>';
    showToast('Error', error.message, 'error');
  }
}

async function searchProjects(query) {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '<div class="loading-spinner">Searching projects...</div>';
  
  try {
    const { carbonAPI } = window.CarbonChainAPI;
    const projects = await carbonAPI.searchProjects(query);
    
    if (projects.length === 0) {
      grid.innerHTML = `<p class="empty-state">No projects found for "${query}"</p>`;
      return;
    }
    
    grid.innerHTML = projects.map(project => createProjectCard(project)).join('');
    
    document.querySelectorAll('.mint-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const projectId = btn.getAttribute('data-project-id');
        showMintDialog(projectId);
      });
    });
  } catch (error) {
    grid.innerHTML = '<p class="empty-state">Search failed. Please try again.</p>';
    showToast('Error', error.message, 'error');
  }
}

function createProjectCard(project) {
  return `
    <div class="project-card">
      <div class="project-header">
        <div class="project-name">${project.name}</div>
        <span class="project-registry">${project.registry}</span>
      </div>
      <div class="project-details">
        <div class="project-detail">
          <span class="project-detail-label">Country:</span>
          <span class="project-detail-value">${project.country}</span>
        </div>
        <div class="project-detail">
          <span class="project-detail-label">Type:</span>
          <span class="project-detail-value">${project.type}</span>
        </div>
        <div class="project-detail">
          <span class="project-detail-label">Total Issuance:</span>
          <span class="project-detail-value">${formatNumber(project.totalIssuance)}</span>
        </div>
        <div class="project-detail">
          <span class="project-detail-label">Total Retired:</span>
          <span class="project-detail-value">${formatNumber(project.totalRetirement)}</span>
        </div>
      </div>
      <div class="project-price">$${project.price} per tCO2</div>
      <button class="btn btn--primary btn--full-width mint-btn" data-project-id="${project.id}">
        Mint tCO2 Tokens
      </button>
    </div>
  `;
}

function showMintDialog(projectId) {
  const { wallet } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  const amount = prompt('Enter amount of tCO2 tokens to mint:');
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    return;
  }
  
  mintTokens(projectId, parseFloat(amount));
}

async function mintTokens(projectId, amount) {
  const { tCO2Token } = window.CarbonChainContracts;
  
  try {
    showLoadingOverlay('Minting tCO2 tokens...');
    const tx = await tCO2Token.mint(projectId, amount);
    hideLoadingOverlay();
    
    showToast('Success', `Minted ${amount} tCO2 tokens!`, 'success');
    updateWalletBalances();
    loadDashboardData();
  } catch (error) {
    hideLoadingOverlay();
    showToast('Mint Failed', error.message, 'error');
  }
}

/**
 * Marketplace Page
 */
function setupMarketplacePage() {
  // Trade tabs
  const tradeTabs = document.querySelectorAll('.trade-tab');
  tradeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabType = tab.getAttribute('data-tab');
      switchTradeTab(tabType);
    });
  });
  
  // Slippage buttons
  document.querySelectorAll('.slippage-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSlippage = parseFloat(btn.getAttribute('data-slippage'));
    });
  });
  
  // Buy form
  const buyAmount = document.getElementById('buyAmount');
  const buyReceive = document.getElementById('buyReceive');
  const executeBuy = document.getElementById('executeBuy');
  
  buyAmount.addEventListener('input', () => {
    if (buyAmount.value) {
      const amount = parseFloat(buyAmount.value);
      const price = window.CarbonChainAPI.marketData.getCurrentPrice();
      const receive = (amount / price).toFixed(2);
      buyReceive.value = receive;
    } else {
      buyReceive.value = '';
    }
  });
  
  executeBuy.addEventListener('click', () => executeBuyTrade());
  
  // Sell form
  const sellAmount = document.getElementById('sellAmount');
  const sellReceive = document.getElementById('sellReceive');
  const executeSell = document.getElementById('executeSell');
  
  sellAmount.addEventListener('input', () => {
    if (sellAmount.value) {
      const amount = parseFloat(sellAmount.value);
      const price = window.CarbonChainAPI.marketData.getCurrentPrice();
      const receive = (amount * price).toFixed(2);
      sellReceive.value = receive;
    } else {
      sellReceive.value = '';
    }
  });
  
  executeSell.addEventListener('click', () => executeSellTrade());
}

function switchTradeTab(tabType) {
  document.querySelectorAll('.trade-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');
  
  document.getElementById('buyForm').classList.toggle('hidden', tabType !== 'buy');
  document.getElementById('sellForm').classList.toggle('hidden', tabType !== 'sell');
}

async function executeBuyTrade() {
  const { wallet } = window.CarbonChainContracts;
  const { marketplace } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  const amount = parseFloat(document.getElementById('buyAmount').value);
  if (!amount || amount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount', 'error');
    return;
  }
  
  try {
    showLoadingOverlay('Executing trade...');
    const result = await marketplace.swapUSDTForTCO2(amount, selectedSlippage);
    hideLoadingOverlay();
    
    showToast('Trade Successful', `Bought ${result.output.toFixed(2)} tCO2`, 'success');
    updateWalletBalances();
    loadMarketData();
    document.getElementById('buyAmount').value = '';
    document.getElementById('buyReceive').value = '';
  } catch (error) {
    hideLoadingOverlay();
    showToast('Trade Failed', error.message, 'error');
  }
}

async function executeSellTrade() {
  const { wallet } = window.CarbonChainContracts;
  const { marketplace } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  const amount = parseFloat(document.getElementById('sellAmount').value);
  if (!amount || amount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount', 'error');
    return;
  }
  
  try {
    showLoadingOverlay('Executing trade...');
    const result = await marketplace.swapTCO2ForUSDT(amount, selectedSlippage);
    hideLoadingOverlay();
    
    showToast('Trade Successful', `Sold for $${result.output.toFixed(2)} USDT`, 'success');
    updateWalletBalances();
    loadMarketData();
    document.getElementById('sellAmount').value = '';
    document.getElementById('sellReceive').value = '';
  } catch (error) {
    hideLoadingOverlay();
    showToast('Trade Failed', error.message, 'error');
  }
}

function loadMarketData() {
  const { txManager } = window.CarbonChainAPI;
  const trades = txManager.getTransactions('buy').concat(txManager.getTransactions('sell'));
  const tradesList = document.getElementById('tradesList');
  
  if (trades.length === 0) {
    tradesList.innerHTML = '<p class="empty-state">No trades yet</p>';
    return;
  }
  
  tradesList.innerHTML = trades.slice(0, 10).map(trade => `
    <div class="trade-item">
      <span class="trade-type ${trade.type}">${trade.type.toUpperCase()}</span>
      <span>${trade.amount || trade.inputAmount} ${trade.inputToken || 'tCO2'}</span>
      <span style="color: var(--color-text-secondary); font-size: 12px;">${formatTimestamp(trade.timestamp)}</span>
    </div>
  `).join('');
}

/**
 * Staking Page
 */
function setupStakingPage() {
  const stakeBtn = document.getElementById('stakeBtn');
  const unstakeBtn = document.getElementById('unstakeBtn');
  const claimBtn = document.getElementById('claimRewardsBtn');
  
  stakeBtn.addEventListener('click', () => executeStake());
  unstakeBtn.addEventListener('click', () => executeUnstake());
  claimBtn.addEventListener('click', () => executeClaimRewards());
}

async function executeStake() {
  const { wallet } = window.CarbonChainContracts;
  const { staking } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  const amount = parseFloat(document.getElementById('stakeAmount').value);
  if (!amount || amount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount', 'error');
    return;
  }
  
  try {
    showLoadingOverlay('Staking tokens...');
    await staking.stake(amount);
    hideLoadingOverlay();
    
    showToast('Success', `Staked ${amount} tCO2 tokens!`, 'success');
    updateWalletBalances();
    loadDashboardData();
    document.getElementById('stakeAmount').value = '';
  } catch (error) {
    hideLoadingOverlay();
    showToast('Stake Failed', error.message, 'error');
  }
}

async function executeUnstake() {
  const { wallet } = window.CarbonChainContracts;
  const { staking } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  const amount = parseFloat(document.getElementById('unstakeAmount').value);
  if (!amount || amount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount', 'error');
    return;
  }
  
  try {
    showLoadingOverlay('Unstaking tokens...');
    await staking.unstake(amount);
    hideLoadingOverlay();
    
    showToast('Success', `Unstaked ${amount} tCO2 tokens!`, 'success');
    updateWalletBalances();
    loadDashboardData();
    document.getElementById('unstakeAmount').value = '';
  } catch (error) {
    hideLoadingOverlay();
    showToast('Unstake Failed', error.message, 'error');
  }
}

async function executeClaimRewards() {
  const { wallet } = window.CarbonChainContracts;
  const { staking } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  try {
    showLoadingOverlay('Claiming rewards...');
    await staking.claimRewards();
    hideLoadingOverlay();
    
    showToast('Success', 'Rewards claimed successfully!', 'success');
    updateWalletBalances();
    loadDashboardData();
  } catch (error) {
    hideLoadingOverlay();
    showToast('Claim Failed', error.message, 'error');
  }
}

/**
 * Retirement Page
 */
function setupRetirementPage() {
  const retireBtn = document.getElementById('retireBtn');
  const downloadBtn = document.getElementById('downloadPor');
  
  retireBtn.addEventListener('click', () => executeRetirement());
  downloadBtn.addEventListener('click', () => downloadCertificate());
}

async function executeRetirement() {
  const { wallet } = window.CarbonChainContracts;
  const { tCO2Token } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  const amount = parseFloat(document.getElementById('retireAmount').value);
  const reason = document.getElementById('retireReason').value;
  
  if (!amount || amount <= 0) {
    showToast('Invalid Amount', 'Please enter a valid amount', 'error');
    return;
  }
  
  if (!confirm(`Are you sure you want to retire ${amount} tCO2 tokens? This action is irreversible.`)) {
    return;
  }
  
  try {
    showLoadingOverlay('Retiring tokens and generating certificate...');
    const result = await tCO2Token.burn(amount, reason);
    hideLoadingOverlay();
    
    showToast('Success', `Retired ${amount} tCO2 tokens!`, 'success');
    
    // Display certificate
    displayCertificate(result.certificate);
    
    // Update balances
    updateWalletBalances();
    loadDashboardData();
    loadRetirementHistory();
    
    // Clear form
    document.getElementById('retireAmount').value = '';
    document.getElementById('retireReason').value = '';
  } catch (error) {
    hideLoadingOverlay();
    showToast('Retirement Failed', error.message, 'error');
  }
}

function displayCertificate(cert) {
  document.getElementById('porCard').style.display = 'block';
  document.getElementById('porId').textContent = cert.id;
  document.getElementById('porAmount').textContent = cert.amount;
  document.getElementById('porDate').textContent = new Date(cert.date).toLocaleDateString();
  document.getElementById('porWallet').textContent = cert.wallet.substring(0, 10) + '...';
  document.getElementById('porIpfs').textContent = cert.ipfsHash;
  
  // Scroll to certificate
  document.getElementById('porCard').scrollIntoView({ behavior: 'smooth' });
}

function downloadCertificate() {
  const cert = document.getElementById('porCertificate').innerText;
  const blob = new Blob([cert], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'carbon-offset-certificate.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded', 'Certificate downloaded successfully', 'success');
}

function loadRetirementHistory() {
  const { AppState } = window.CarbonChainAPI;
  const history = document.getElementById('retirementHistory');
  
  if (AppState.retirements.length === 0) {
    history.innerHTML = '<p class="empty-state">No retirement history yet.</p>';
    return;
  }
  
  history.innerHTML = AppState.retirements.map(ret => `
    <div class="retirement-item">
      <div>
        <div style="font-weight: 500;">${ret.amount} tCO2</div>
        <div style="font-size: 12px; color: var(--color-text-secondary);">${new Date(ret.date).toLocaleDateString()}</div>
      </div>
      <div style="font-size: 12px;">${ret.id}</div>
    </div>
  `).join('');
}

/**
 * Governance Page
 */
function setupGovernancePage() {
  // Proposals will be loaded when page is navigated to
}

async function loadProposals() {
  const { governor } = window.CarbonChainContracts;
  const { AppState } = window.CarbonChainAPI;
  const list = document.getElementById('proposalsList');
  
  try {
    const proposals = await governor.getProposals();
    
    list.innerHTML = proposals.map(prop => createProposalCard(prop)).join('');
    
    // Add vote listeners
    document.querySelectorAll('.vote-for-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const propId = btn.getAttribute('data-proposal-id');
        castVote(propId, true);
      });
    });
    
    document.querySelectorAll('.vote-against-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const propId = btn.getAttribute('data-proposal-id');
        castVote(propId, false);
      });
    });
    
    // Update voting power
    document.getElementById('votingPower').textContent = AppState.wallet.tCO2Balance || 0;
    document.getElementById('activeProposals').textContent = proposals.length;
  } catch (error) {
    list.innerHTML = '<p class="empty-state">Failed to load proposals</p>';
  }
}

function createProposalCard(prop) {
  const totalVotes = prop.forVotes + prop.againstVotes;
  const forPercentage = totalVotes > 0 ? (prop.forVotes / totalVotes * 100).toFixed(1) : 0;
  
  return `
    <div class="proposal-card">
      <div class="proposal-header">
        <div class="proposal-title">${prop.title}</div>
        <span class="proposal-status">${prop.status}</span>
      </div>
      <div class="proposal-description">${prop.description}</div>
      <div class="proposal-votes">
        <div class="vote-count">
          <span class="vote-label">For</span>
          <span class="vote-value" style="color: var(--color-success);">${formatNumber(prop.forVotes)}</span>
        </div>
        <div class="vote-count">
          <span class="vote-label">Against</span>
          <span class="vote-value" style="color: var(--color-error);">${formatNumber(prop.againstVotes)}</span>
        </div>
      </div>
      <div class="vote-bar">
        <div class="vote-bar-fill" style="width: ${forPercentage}%;"></div>
      </div>
      <div class="proposal-actions">
        <button class="btn btn--primary vote-for-btn" data-proposal-id="${prop.id}">Vote For</button>
        <button class="btn btn--secondary vote-against-btn" data-proposal-id="${prop.id}">Vote Against</button>
      </div>
    </div>
  `;
}

async function castVote(proposalId, support) {
  const { wallet } = window.CarbonChainContracts;
  const { governor } = window.CarbonChainContracts;
  
  if (!wallet.connected) {
    showToast('Wallet Required', 'Please connect your wallet first', 'warning');
    return;
  }
  
  try {
    showLoadingOverlay('Casting vote...');
    await governor.vote(proposalId, support);
    hideLoadingOverlay();
    
    showToast('Vote Cast', `Voted ${support ? 'For' : 'Against'} the proposal`, 'success');
    loadProposals();
  } catch (error) {
    hideLoadingOverlay();
    showToast('Vote Failed', error.message, 'error');
  }
}

/**
 * Portfolio Page
 */
function setupPortfolioPage() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.getAttribute('data-filter');
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTransactionHistory(filter);
    });
  });
}

function loadPortfolioData() {
  updateWalletBalances();
  loadTransactionHistory('all');
}

function loadTransactionHistory(filter) {
  const { txManager } = window.CarbonChainAPI;
  const list = document.getElementById('transactionHistory');
  const transactions = txManager.getTransactions(filter);
  
  if (transactions.length === 0) {
    list.innerHTML = '<p class="empty-state">No transactions yet</p>';
    return;
  }
  
  list.innerHTML = transactions.map(tx => `
    <div class="transaction-item">
      <div class="transaction-info">
        <div class="transaction-type">${formatActivityType(tx.type)}</div>
        <div class="transaction-date">${formatTimestamp(tx.timestamp)}</div>
      </div>
      <div class="transaction-amount">${tx.amount || tx.inputAmount} tCO2</div>
    </div>
  `).join('');
}

/**
 * Chatbot
 */
function setupChatbot() {
  const toggle = document.getElementById('chatbotToggle');
  const close = document.getElementById('chatbotClose');
  const window_el = document.getElementById('chatbotWindow');
  const input = document.getElementById('chatbotInput');
  const send = document.getElementById('chatbotSend');
  
  toggle.addEventListener('click', () => {
    window_el.classList.toggle('hidden');
  });
  
  close.addEventListener('click', () => {
    window_el.classList.add('hidden');
  });
  
  send.addEventListener('click', () => sendChatMessage());
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
}

async function sendChatMessage() {
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message
  addChatMessage(message, 'user');
  input.value = '';
  
  // Show typing indicator
  const typingId = 'typing-' + Date.now();
  addChatMessage('Thinking...', 'bot', typingId);
  
  try {
    const { geminiBot } = window.CarbonChainAPI;
    const response = await geminiBot.sendMessage(message);
    
    // Remove typing indicator
    document.getElementById(typingId)?.remove();
    
    // Add bot response
    addChatMessage(response, 'bot');
  } catch (error) {
    document.getElementById(typingId)?.remove();
    addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
  }
}

function addChatMessage(text, sender, id = null) {
  const messages = document.getElementById('chatbotMessages');
  const div = document.createElement('div');
  div.className = `chatbot-message ${sender}`;
  if (id) div.id = id;
  
  const p = document.createElement('p');
  p.textContent = text;
  div.appendChild(p);
  
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/**
 * Utility Functions
 */
function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(Math.floor(num));
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatActivityType(type) {
  const types = {
    mint: 'Minted Tokens',
    burn: 'Retired Tokens',
    retire: 'Retired Tokens',
    buy: 'Bought tCO2',
    sell: 'Sold tCO2',
    stake: 'Staked Tokens',
    unstake: 'Unstaked Tokens',
    transfer: 'Transferred Tokens',
    vote: 'Voted on Proposal',
    claim_rewards: 'Claimed Rewards'
  };
  return types[type] || type;
}

function getActivityIcon(type) {
  const icons = {
    mint: '🌱',
    burn: '🔥',
    retire: '♻️',
    buy: '📈',
    sell: '📉',
    stake: '🔒',
    unstake: '🔓',
    transfer: '↔️',
    vote: '🗳️',
    claim_rewards: '🎁'
  };
  return icons[type] || '📄';
}

function showToast(title, message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  toast.innerHTML = `
    <div class="toast-message">
      <strong>${title}</strong><br>
      ${message}
    </div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

function showLoadingOverlay(message = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  overlay.querySelector('p').textContent = message;
  overlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// Initialize mock data on first load
if (window.CarbonChainAPI) {
  window.CarbonChainAPI.AppState.stats.totalMinted = 125000;
  window.CarbonChainAPI.AppState.stats.totalRetired = 33000;
  window.CarbonChainAPI.AppState.stats.totalStaked = 50000;
}

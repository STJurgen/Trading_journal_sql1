import { fetchTrades, createTrade, deleteTrade, importCsv, requireAuth } from './tradeService.js';

let fullCalendarLoaderPromise;

function loadFullCalendar() {
  if (window.FullCalendar) {
    return Promise.resolve(window.FullCalendar);
  }

  if (!fullCalendarLoaderPromise) {
    fullCalendarLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js';
      script.async = true;
      script.onload = () => {
        if (window.FullCalendar) {
          resolve(window.FullCalendar);
        } else {
          reject(new Error('FullCalendar failed to load.'));
        }
      };
      script.onerror = () => reject(new Error('Unable to load FullCalendar script.'));
      document.head.appendChild(script);
    });
  }

  return fullCalendarLoaderPromise;
}

requireAuth();

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(value || 0));
}

async function loadDashboard() {
  if (!document.getElementById('pnlChart')) return;

  requireAuth();

  try {
    const trades = await fetchTrades();
    populateTradesTable(trades);
    renderCharts(trades);
    await renderCalendar(trades);
    updateStats(trades);
  } catch (error) {
    console.error(error);
  }
}

function populateTradesTable(trades) {
  const tableBody = document.getElementById('tradesTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = trades
    .slice(0, 7)
    .map((trade) => `
      <tr>
        <td>${trade.symbol}</td>
        <td class="text-capitalize">${trade.trade_type}</td>
        <td>${formatCurrency(trade.entry)}</td>
        <td>${formatCurrency(trade.exit)}</td>
        <td class="${trade.result >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(trade.result)}</td>
        <td>${trade.close_date}</td>
      </tr>
    `)
    .join('');
}

function renderCharts(trades) {
  const pnlCtx = document.getElementById('pnlChart');
  const winRateCtx = document.getElementById('winRateChart');
  const profitFactorCtx = document.getElementById('profitFactorChart');

  const cumulativePnL = [];
  let runningTotal = 0;
  trades
    .slice()
    .reverse()
    .forEach((trade) => {
      runningTotal += Number(trade.result || 0);
      cumulativePnL.push({ date: trade.close_date, total: runningTotal });
    });

  new Chart(pnlCtx, {
    type: 'line',
    data: {
      labels: cumulativePnL.map((p) => p.date),
      datasets: [
        {
          label: 'Net P&L',
          data: cumulativePnL.map((p) => p.total),
          borderColor: '#4dabf7',
          backgroundColor: 'rgba(77, 171, 247, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: '#ced4da' }, grid: { color: 'rgba(206, 212, 218, 0.1)' } },
        x: { ticks: { color: '#ced4da' }, grid: { display: false } }
      }
    }
  });

  const wins = trades.filter((t) => Number(t.result) > 0).length;
  const losses = trades.filter((t) => Number(t.result) <= 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0; // Percentage of wins and losses

  new Chart(winRateCtx, {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [
        {
          data: [wins, losses],
          backgroundColor: ['#38d9a9', '#ff6b6b']
        }
      ]
    },
    options: {
      cutout: '70%'
    }
  });

  const totalWin = trades.filter((t) => Number(t.result) > 0).reduce((acc, t) => acc + Number(t.result), 0);
  const totalLoss = Math.abs(
    trades.filter((t) => Number(t.result) < 0).reduce((acc, t) => acc + Number(t.result), 0)
  );
  const profitFactor = totalLoss ? (totalWin / totalLoss).toFixed(2) : '∞';

  new Chart(profitFactorCtx, {
    type: 'doughnut',
    data: {
      labels: ['Profit', 'Loss'],
      datasets: [
        {
          data: [totalWin, totalLoss || 1],
          backgroundColor: ['#4dabf7', '#ff6b6b']
        }
      ]
    },
    options: {
      cutout: '65%'
    }
  });

  const profitFactorText = document.getElementById('profitFactorText');
  if (profitFactorText) profitFactorText.textContent = `PF: ${profitFactor}`;
  const winRateTextCh = document.getElementById('winRateTextCh');
  if (winRateTextCh) winRateTextCh.textContent = `+${winRate}% Win Rate`;
  const winRateText = document.getElementById('winRateText');
  if (winRateText) winRateText.textContent = `${winRate}% Win Rate`;
}

async function renderCalendar(trades) {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  let FullCalendar;
  try {
    FullCalendar = await loadFullCalendar();
  } catch (error) {
    console.error('Failed to initialise calendar:', error);
    return;
  }

  const events = trades.map((trade) => ({
    title: `${Number(trade.result)}`,
    start: trade.close_date,
    color: Number(trade.result) >= 0 ? '#38d9a9' : '#ff6b6b'
  }));

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    themeSystem: 'standard',
    headerToolbar: {
      left: 'title',
      right: 'prev,next today'
    },
    displayEventTime: false,
    events
  });

  calendar.render();
}

function updateStats(trades) {
  const totalPnL = trades.reduce((acc, trade) => acc + Number(trade.result || 0), 0);
  const totalPnLEl = document.getElementById('totalPnL');
  if (totalPnLEl) totalPnLEl.textContent = formatCurrency(totalPnL);

  const wins = trades.filter((t) => Number(t.result) > 0).length;
  const losses = trades.filter((t) => Number(t.result) <= 0).length;

  const avgWin = wins ? trades.filter((t) => Number(t.result) > 0).reduce((acc, t) => acc + Number(t.result), 0) / wins : 0;
  const avgLoss = losses
    ? Math.abs(trades.filter((t) => Number(t.result) < 0).reduce((acc, t) => acc + Number(t.result), 0) / losses)
    : 0;

  const avgWinText = document.getElementById('avgWinText');
  if (avgWinText) avgWinText.textContent = `Avg Win: ${formatCurrency(avgWin)}`;
  const avgLossText = document.getElementById('avgLossText');
  if (avgLossText) avgLossText.textContent = `Avg Loss: ${formatCurrency(avgLoss)}`;

  const avgWinBar = document.getElementById('avgWinBar');
  const avgLossBar = document.getElementById('avgLossBar');
  if (avgWinBar) avgWinBar.style.width = `${Math.min((avgWin / (avgWin + avgLoss || 1)) * 100, 100)}%`;
  if (avgLossBar) avgLossBar.style.width = `${Math.min((avgLoss / (avgWin + avgLoss || 1)) * 100, 100)}%`;

  const tradeStreak = document.getElementById('tradeStreak');
  if (tradeStreak) tradeStreak.textContent = `${calculateStreak(trades)} Wins`;
  const dayStreak = document.getElementById('dayStreak');
  if (dayStreak) dayStreak.textContent = `${calculateDayStreak(trades)} Days`;
}

function calculateStreak(trades) {
  let streak = 0;
  for (const trade of trades.sort((a, b) => new Date(b.close_date) - new Date(a.close_date))) {
    if (Number(trade.result) > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function calculateDayStreak(trades) {
  const sortedTrades = trades
    .filter((t) => Number(t.result) > 0)
    .map((t) => t.close_date)
    .sort((a, b) => new Date(b) - new Date(a));
  if (!sortedTrades.length) return 0;

  let streak = 1;
  for (let i = 1; i < sortedTrades.length; i += 1) {
    const diff = Math.abs(new Date(sortedTrades[i - 1]) - new Date(sortedTrades[i]));
    if (diff <= 86400000 + 1000) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

async function setupTradeJournal() {
  const journalTableBody = document.getElementById('journalTableBody');
  if (!journalTableBody) return;

  requireAuth();

  try {
    const trades = await fetchTrades();
    renderJournalTable(trades);
  } catch (error) {
    console.error(error);
  }

  const tradeForm = document.getElementById('tradeForm');
  if (tradeForm) {
    tradeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const trade = {
        symbol: document.getElementById('tradeSymbol').value,
        trade_type: document.getElementById('tradeType').value,
        entry: document.getElementById('tradeEntry').value,
        exit: document.getElementById('tradeExit').value,
        result: document.getElementById('tradeResult').value,
        close_date: document.getElementById('tradeDate').value,
        strategy: document.getElementById('tradeStrategy').value,
        notes: document.getElementById('tradeNotes').value
      };

      try {
        await createTrade(trade);
        tradeForm.reset();
        const trades = await fetchTrades();
        renderJournalTable(trades);
      } catch (error) {
        console.error(error);
      }
    });
  }
}

function renderJournalTable(trades) {
  const journalTableBody = document.getElementById('journalTableBody');
  if (!journalTableBody) return;

  journalTableBody.innerHTML = trades
    .map(
      (trade) => `
      <tr>
        <td>${trade.symbol}</td>
        <td class="text-capitalize">${trade.trade_type}</td>
        <td>${formatCurrency(trade.entry)}</td>
        <td>${formatCurrency(trade.exit)}</td>
        <td class="${trade.result >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(trade.result)}</td>
        <td>${trade.close_date}</td>
        <td>${trade.strategy || ''}</td>
        <td>${trade.notes || ''}</td>
        <td><button class="btn btn-sm btn-outline-light" data-delete-id="${trade.id}">Delete</button></td>
      </tr>
    `
    )
    .join('');

  document.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await deleteTrade(button.dataset.deleteId);
        const trades = await fetchTrades();
        renderJournalTable(trades);
      } catch (error) {
        console.error(error);
      }
    });
  });
}

async function setupImport() {
  const importForm = document.getElementById('importForm');
  if (!importForm) return;

  requireAuth();

  importForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('csvFile');
    const summary = document.getElementById('importSummary');
    summary.classList.add('d-none');
    try {
      const response = await importCsv(fileInput.files[0]);
      summary.textContent = `${response.imported} trades imported successfully.`;
      summary.classList.remove('d-none');
      summary.classList.remove('alert-danger');
      summary.classList.add('alert-success');
    } catch (error) {
      summary.textContent = 'Failed to import trades. Please check your CSV format.';
      summary.classList.remove('d-none');
      summary.classList.remove('alert-success');
      summary.classList.add('alert-danger');
    }
  });
}

async function setupReports() {
  if (!document.getElementById('winLossChart')) return;

  requireAuth();

  try {
    const trades = await fetchTrades();
    renderReportCharts(trades);
  } catch (error) {
    console.error(error);
  }
}

function renderReportCharts(trades) {
  const winLossCtx = document.getElementById('winLossChart');
  const monthlyProfitCtx = document.getElementById('monthlyProfitChart');
  const strategyCtx = document.getElementById('strategyChart');

  const wins = trades.filter((t) => Number(t.result) > 0).length;
  const losses = trades.filter((t) => Number(t.result) <= 0).length;
  new Chart(winLossCtx, {
    type: 'bar',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [
        {
          label: 'Trades',
          data: [wins, losses],
          backgroundColor: ['#38d9a9', '#ff6b6b']
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  const monthlyData = {};
  trades.forEach((trade) => {
    const month = new Date(trade.close_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthlyData[month] = (monthlyData[month] || 0) + Number(trade.result || 0);
  });

  new Chart(monthlyProfitCtx, {
    type: 'line',
    data: {
      labels: Object.keys(monthlyData),
      datasets: [
        {
          label: 'Monthly Profit',
          data: Object.values(monthlyData),
          borderColor: '#4dabf7',
          backgroundColor: 'rgba(77, 171, 247, 0.3)',
          fill: true,
          tension: 0.4
        }
      ]
    }
  });

  const strategyData = {};
  trades.forEach((trade) => {
    const strategy = trade.strategy || 'Unspecified';
    strategyData[strategy] = (strategyData[strategy] || 0) + Number(trade.result || 0);
  });

  new Chart(strategyCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(strategyData),
      datasets: [
        {
          data: Object.values(strategyData),
          backgroundColor: ['#4dabf7', '#ffd93d', '#38d9a9', '#ff6b6b', '#845ef7']
        }
      ]
    },
    options: {
      cutout: '60%'
    }
  });
}

loadDashboard();
setupTradeJournal();
setupImport();
setupReports();

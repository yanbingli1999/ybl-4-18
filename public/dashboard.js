const modelTypeLabels = {
  linear: '线性模型',
  exponential: '指数模型',
  quadratic: '二次曲线'
};

const modelColors = {
  linear: '#3b82f6',
  exponential: '#10b981',
  quadratic: '#f59e0b'
};

let trendChart = null;
let modelChart = null;
let currentStartDate = null;
let currentEndDate = null;
let autoRefreshTimer = null;

function initCharts() {
  const trendCtx = document.getElementById('trendChart').getContext('2d');
  const modelCtx = document.getElementById('modelChart').getContext('2d');

  trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '总拟合次数',
          data: [],
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        },
        {
          label: '线性模型',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderDash: [6, 4],
          fill: false,
          tension: 0.4
        },
        {
          label: '指数模型',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderDash: [6, 4],
          fill: false,
          tension: 0.4
        },
        {
          label: '二次曲线',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderDash: [6, 4],
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#94a3b8',
            font: { size: 12 },
            boxWidth: 16,
            boxHeight: 4,
            padding: 16,
            usePointStyle: true,
            pointStyle: 'rect'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(51, 65, 85, 0.5)'
          },
          ticks: {
            color: '#64748b',
            font: { size: 12 }
          }
        },
        y: {
          grid: {
            color: 'rgba(51, 65, 85, 0.5)'
          },
          ticks: {
            color: '#64748b',
            font: { size: 12 },
            precision: 0
          },
          beginAtZero: true
        }
      }
    }
  });

  modelChart = new Chart(modelCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderColor: '#0f172a',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { size: 12 },
            padding: 16,
            boxWidth: 14,
            boxHeight: 14,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 },
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const value = context.raw;
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${context.label}: ${value} 次 (${percent}%)`;
            }
          }
        }
      }
    }
  });
}

async function loadDashboardData() {
  try {
    let url = '/api/dashboard/stats';
    const params = new URLSearchParams();
    if (currentStartDate) params.append('startDate', currentStartDate);
    if (currentEndDate) params.append('endDate', currentEndDate);
    if (params.toString()) url += '?' + params.toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error('获取数据失败');
    const data = await res.json();

    updateSummaryCards(data.summary);
    updateTrendChart(data.fitTrend);
    updateModelChart(data.modelUsage);
    updateRecentlyActive(data.recentlyActive);
    updateHighRiskBatches(data.highRiskBatches);

    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('zh-CN');
  } catch (err) {
    console.error('加载看板数据失败:', err);
  }
}

function updateSummaryCards(summary) {
  animateValue('todayFits', 0, summary.todayFits, 1000);
  document.getElementById('anomalyRatio').textContent = summary.anomalyRatio + '%';
  animateValue('totalDatasets', 0, summary.totalDatasets, 800);
  animateValue('totalFits', 0, summary.totalFits, 1000);

  const todayFitsTrend = document.getElementById('todayFitsTrend');
  if (summary.todayFits > 0) {
    todayFitsTrend.textContent = '今日活跃';
    todayFitsTrend.className = 'stat-trend up';
  } else {
    todayFitsTrend.textContent = '今日暂无';
    todayFitsTrend.className = 'stat-trend';
  }

  const anomalyTrend = document.getElementById('anomalyRatioTrend');
  if (summary.anomalyRatio > 15) {
    anomalyTrend.textContent = '偏高预警';
    anomalyTrend.className = 'stat-trend down';
  } else if (summary.anomalyRatio > 5) {
    anomalyTrend.textContent = '正常范围';
    anomalyTrend.className = 'stat-trend';
  } else {
    anomalyTrend.textContent = '质量优秀';
    anomalyTrend.className = 'stat-trend up';
  }
}

function animateValue(elementId, start, end, duration) {
  const element = document.getElementById(elementId);
  const range = end - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + range * easeProgress);
    element.textContent = current;
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function updateTrendChart(fitTrend) {
  if (!fitTrend || fitTrend.length === 0) {
    const emptyData = generateEmptyTrendData();
    trendChart.data.labels = emptyData.labels;
    trendChart.data.datasets[0].data = emptyData.data;
    trendChart.data.datasets[1].data = emptyData.linearData;
    trendChart.data.datasets[2].data = emptyData.exponentialData;
    trendChart.data.datasets[3].data = emptyData.quadraticData;
    trendChart.update();
    return;
  }

  trendChart.data.labels = fitTrend.map(d => d.date.slice(5));
  trendChart.data.datasets[0].data = fitTrend.map(d => d.total);
  trendChart.data.datasets[1].data = fitTrend.map(d => d.linear || 0);
  trendChart.data.datasets[2].data = fitTrend.map(d => d.exponential || 0);
  trendChart.data.datasets[3].data = fitTrend.map(d => d.quadratic || 0);
  trendChart.update();

  const badge = document.getElementById('fitTrendBadge');
  badge.textContent = `共 ${fitTrend.length} 天`;
}

function generateEmptyTrendData() {
  const labels = [];
  const data = [];
  const linearData = [];
  const exponentialData = [];
  const quadraticData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toISOString().slice(5, 10));
    data.push(0);
    linearData.push(0);
    exponentialData.push(0);
    quadraticData.push(0);
  }
  return { labels, data, linearData, exponentialData, quadraticData };
}

function updateModelChart(modelUsage) {
  const models = Object.keys(modelUsage);
  if (models.length === 0) {
    modelChart.data.labels = ['暂无数据'];
    modelChart.data.datasets[0].data = [1];
    modelChart.data.datasets[0].backgroundColor = ['#334155'];
    modelChart.update();
    return;
  }

  modelChart.data.labels = models.map(m => modelTypeLabels[m] || m);
  modelChart.data.datasets[0].data = models.map(m => modelUsage[m]);
  modelChart.data.datasets[0].backgroundColor = models.map(m => modelColors[m] || '#6b7280');
  modelChart.update();
}

function updateRecentlyActive(activeList) {
  const container = document.getElementById('recentlyActiveList');
  const countEl = document.getElementById('activeDatasetsCount');
  countEl.textContent = activeList.length;

  if (activeList.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无活跃数据</div>';
    return;
  }

  container.innerHTML = activeList.map(item => `
    <div class="active-item" data-dataset="${escapeHtml(item.name)}">
      <div class="active-item-info">
        <div class="active-item-name">${escapeHtml(item.name)}</div>
        <div class="active-item-meta">
          <span>最近活跃: ${formatTime(item.lastActive)}</span>
        </div>
      </div>
      <span class="active-item-count">${item.count} 次</span>
    </div>
  `).join('');

  container.querySelectorAll('.active-item').forEach(el => {
    el.addEventListener('click', () => {
      const datasetName = el.dataset.dataset;
      searchHistoryByDataset(datasetName);
    });
  });
}

function updateHighRiskBatches(riskList) {
  const container = document.getElementById('highRiskList');
  const countEl = document.getElementById('highRiskCount');
  countEl.textContent = riskList.length;

  if (riskList.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无高风险批次</div>';
    return;
  }

  container.innerHTML = riskList.map(item => `
    <div class="risk-item" data-history-id="${item.id}">
      <div class="risk-item-info">
        <div class="risk-item-name">${escapeHtml(item.datasetName)}</div>
        <div class="risk-item-meta">
          <span>${modelTypeLabels[item.modelType] || item.modelType}</span>
          <span>R²: ${item.rSquared.toFixed(4)}</span>
          <span>${formatTime(item.createdAt)}</span>
        </div>
      </div>
      <span class="risk-item-ratio">${item.outlierRatio.toFixed(1)}%</span>
    </div>
  `).join('');

  container.querySelectorAll('.risk-item').forEach(el => {
    el.addEventListener('click', () => {
      const historyId = el.dataset.historyId;
      viewHistoryItem(historyId);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function viewHistoryItem(id) {
  window.location.href = `index.html?historyId=${id}`;
}

function searchHistoryByDataset(datasetName) {
  window.location.href = `index.html?dataset=${encodeURIComponent(datasetName)}`;
}

function applyFilter() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (startDate && endDate && startDate > endDate) {
    alert('开始日期不能晚于结束日期');
    return;
  }

  currentStartDate = startDate || null;
  currentEndDate = endDate || null;
  loadDashboardData();
}

function resetFilter() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  currentStartDate = null;
  currentEndDate = null;
  loadDashboardData();
}

function initEventListeners() {
  document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
  document.getElementById('resetFilterBtn').addEventListener('click', resetFilter);
  document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.location.href = 'index.html';
    }
    if (e.key === 'r' && e.ctrlKey) {
      e.preventDefault();
      loadDashboardData();
    }
  });
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => {
    loadDashboardData();
  }, 30000);
}

function init() {
  initCharts();
  initEventListeners();
  loadDashboardData();
  startAutoRefresh();
}

document.addEventListener('DOMContentLoaded', init);

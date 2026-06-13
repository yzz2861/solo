// ========== 图表模块 ==========

let trendChart = null;
let compareChart = null;
let shiftChart = null;
let reasonChart = null;
let storeRankChart = null;
let newProductChart = null;

const COLORS = {
    primary: '#D4A574',
    secondary: '#8B6914',
    success: '#67C23A',
    warning: '#E6A23C',
    danger: '#F56C6C',
    info: '#909399',
    milk: '#FFF8F0',
    tea: '#5C4033',
    pearl: '#2C2C2C'
};

function initCharts() {
    initTrendChart();
    initCompareChart();
    initShiftChart();
    initReasonChart();
    initStoreRankChart();
    initNewProductChart();
}

function initTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '理论用量',
                data: [],
                borderColor: COLORS.primary,
                backgroundColor: 'rgba(212, 165, 116, 0.1)',
                tension: 0.3,
                fill: true
            }, {
                label: '实际耗用',
                data: [],
                borderColor: COLORS.danger,
                backgroundColor: 'rgba(245, 108, 108, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 1000).toFixed(0) + 'kg';
                        }
                    }
                }
            }
        }
    });
}

function updateTrendChart(dateRange, theoryByDate, actualData) {
    if (!trendChart) return;
    
    const labels = dateRange.map(d => d.slice(5));
    const theoryData = [];
    const actualDataArr = [];
    
    dateRange.forEach(date => {
        let dayTheory = 0;
        if (theoryByDate[date]) {
            dayTheory = Object.values(theoryByDate[date]).reduce((sum, v) => sum + v, 0);
        }
        theoryData.push(dayTheory);
        
        let dayActual = 0;
        if (actualData && actualData[date]) {
            dayActual = actualData[date];
        }
        actualDataArr.push(dayActual);
    });
    
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = theoryData;
    trendChart.data.datasets[1].data = actualDataArr;
    trendChart.update();
}

function initCompareChart() {
    const ctx = document.getElementById('compareChart');
    if (!ctx) return;
    
    compareChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '理论用量',
                data: [],
                backgroundColor: 'rgba(212, 165, 116, 0.8)'
            }, {
                label: '实际耗用',
                data: [],
                backgroundColor: 'rgba(245, 108, 108, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 1000).toFixed(0) + 'kg';
                        }
                    }
                }
            }
        }
    });
}

function updateCompareChart(analysis) {
    if (!compareChart) return;
    
    const topItems = analysis.slice(0, 8);
    const labels = topItems.map(a => a.toppingName);
    const theoryData = topItems.map(a => a.theoryGrams);
    const actualData = topItems.map(a => a.actualGrams);
    
    compareChart.data.labels = labels;
    compareChart.data.datasets[0].data = theoryData;
    compareChart.data.datasets[1].data = actualData;
    compareChart.update();
}

function initShiftChart() {
    const ctx = document.getElementById('shiftChart');
    if (!ctx) return;
    
    shiftChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '报废率',
                data: [],
                backgroundColor: [],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '报废率: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function updateShiftChart(shiftData) {
    if (!shiftChart) return;
    
    const labels = shiftData.map(s => s.shiftName);
    const data = shiftData.map(s => s.wasteRate);
    const colors = shiftData.map(s => s.abnormal ? COLORS.danger : COLORS.primary);
    
    shiftChart.data.labels = labels;
    shiftChart.data.datasets[0].data = data;
    shiftChart.data.datasets[0].backgroundColor = colors;
    shiftChart.update();
}

function initReasonChart() {
    const ctx = document.getElementById('reasonChart');
    if (!ctx) return;
    
    reasonChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#F56C6C',
                    '#E6A23C',
                    '#67C23A',
                    '#409EFF',
                    '#909399',
                    '#D4A574'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function updateReasonChart(reasonDist) {
    if (!reasonChart) return;
    
    const topReasons = reasonDist.slice(0, 6);
    const labels = topReasons.map(r => r.reason);
    const data = topReasons.map(r => r.totalGrams);
    
    reasonChart.data.labels = labels;
    reasonChart.data.datasets[0].data = data;
    reasonChart.update();
}

function initStoreRankChart() {
    const ctx = document.getElementById('storeRankChart');
    if (!ctx) return;
    
    storeRankChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '损耗率',
                data: [],
                backgroundColor: [],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '损耗率: ' + context.parsed.x.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function updateStoreRankChart(storeRank) {
    if (!storeRankChart) return;
    
    const labels = storeRank.map(s => s.storeName);
    const data = storeRank.map(s => s.lossRate);
    const colors = data.map(rate => {
        if (rate > 15) return COLORS.danger;
        if (rate > 8) return COLORS.warning;
        return COLORS.success;
    });
    
    storeRankChart.data.labels = labels;
    storeRankChart.data.datasets[0].data = data;
    storeRankChart.data.datasets[0].backgroundColor = colors;
    storeRankChart.update();
}

function initNewProductChart() {
    const ctx = document.getElementById('newProductChart');
    if (!ctx) return;
    
    newProductChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '理论单杯成本',
                data: [],
                backgroundColor: 'rgba(212, 165, 116, 0.8)'
            }, {
                label: '实际单杯成本',
                data: [],
                backgroundColor: 'rgba(245, 108, 108, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ¥' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function updateNewProductChart(newProductAnalysis) {
    if (!newProductChart) return;
    
    const labels = newProductAnalysis.map(p => p.productName);
    const theoryData = newProductAnalysis.map(p => parseFloat(p.theoryPerCup));
    const actualData = newProductAnalysis.map(p => parseFloat(p.actualPerCup));
    
    newProductChart.data.labels = labels;
    newProductChart.data.datasets[0].data = theoryData;
    newProductChart.data.datasets[1].data = actualData;
    newProductChart.update();
}

function updateAllCharts(view, data) {
    if (view === 'manager') {
        updateTrendChart(data.dateRange, data.theoryByDate, data.actualByDate);
        updateCompareChart(data.analysis);
        updateShiftChart(data.shiftData);
        updateReasonChart(data.reasonDist);
    } else if (view === 'boss') {
        updateStoreRankChart(data.storeRank);
    } else if (view === 'headquarters') {
        updateNewProductChart(data.newProductAnalysis);
    }
}

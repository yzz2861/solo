let state = {
  currentId: null,
  schemes: [],
  activeCompare: [],
  charts: {},
  currentResult: null,
  currentIssues: []
};

let debounceTimer = null;
function debounced(fn, ms = 200) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn.apply(null, args), ms);
  };
}

function $ (sel, root = document) { return root.querySelector(sel); }
function $$ (sel, root = document) { return [...root.querySelectorAll(sel)]; }

function getCurrentScheme() {
  return state.schemes.find(s => s.id === state.currentId) || null;
}

function toMeters(value, units) {
  if (units === 'imperial') return value * FOOT_TO_METER;
  return value;
}
function fromMeters(meters, units) {
  if (units === 'imperial') return meters / FOOT_TO_METER;
  return meters;
}

function init() {
  state.schemes = loadSchemes();
  if (state.schemes.length === 0) {
    const d = defaultScheme('方案 A - 基础');
    const res = addScheme(d);
    state.schemes = [res.scheme];
  }
  state.currentId = state.schemes[0].id;
  state.activeCompare = [state.currentId];

  buildPurposeOptions();
  buildMaterialOptions();
  renderSchemeList();
  renderSchemeTabs();
  renderAll();
  bindEvents();
}

function buildPurposeOptions() {
  const sel = $('#purpose-select');
  sel.innerHTML = Object.keys(PURPOSES).map(k =>
    `<option value="${k}">${PURPOSES[k].name}</option>`).join('');
}

function buildMaterialOptions() {
  const cats = {
    wall: '墙体基础',
    absorber_bass: '低频吸声',
    absorber_medium: '中高频吸声',
    diffuser: '扩散体',
    floor: '地面',
    ceiling: '顶面',
    custom: '自定义'
  };
  const grouped = {};
  for (const [id, m] of Object.entries(MATERIALS_DB)) {
    const c = m.category || 'wall';
    (grouped[c] = grouped[c] || []).push({ id, ...m });
  }
  let html = '';
  for (const [ck, cv] of Object.entries(cats)) {
    if (!grouped[ck]) continue;
    html += `<optgroup label="${cv}">`;
    html += grouped[ck].map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    html += `</optgroup>`;
  }
  $$('.surface-material-select').forEach(el => { el.innerHTML = html; });
}

function renderSchemeList() {
  const list = $('#scheme-list');
  list.innerHTML = state.schemes.map(s => `
    <div class="scheme-row ${s.id === state.currentId ? 'active' : ''}" data-id="${s.id}">
      <div class="scheme-swatch" style="background:${SCHEME_COLORS[state.schemes.indexOf(s) % SCHEME_COLORS.length]}"></div>
      <div class="scheme-info">
        <div class="scheme-name" contenteditable="true" data-field="name">${s.name || '未命名'}</div>
        <div class="scheme-meta">
          ${s.room.L.toFixed(1)}×${s.room.W.toFixed(1)}×${s.room.H.toFixed(1)}m
          · ${(s.room.L * s.room.W * s.room.H).toFixed(0)}m³
        </div>
      </div>
      <label class="compare-toggle">
        <input type="checkbox" ${state.activeCompare.includes(s.id) ? 'checked' : ''} data-id="${s.id}">
        <span>对比</span>
      </label>
      <button class="icon-btn clone-btn" data-id="${s.id}" title="复制">⎘</button>
      <button class="icon-btn del-btn" data-id="${s.id}" title="删除">🗑</button>
    </div>
  `).join('');
  $('#add-scheme-btn').disabled = state.schemes.length >= MAX_SCHEMES;
  $('#add-scheme-btn').title = state.schemes.length >= MAX_SCHEMES ? `最多 ${MAX_SCHEMES} 套方案` : '新增方案';
}

function renderSchemeTabs() {
  const tabs = $('#scheme-tabs');
  tabs.innerHTML = state.schemes.map((s, idx) => `
    <button class="tab ${s.id === state.currentId ? 'active' : ''}" data-id="${s.id}"
      style="--tab-color:${SCHEME_COLORS[idx % SCHEME_COLORS.length]}">
      <span class="dot"></span>
      <span>${s.name || '方案 ' + (idx+1)}</span>
    </button>
  `).join('');
}

function renderRoomInputs() {
  const s = getCurrentScheme();
  if (!s) return;
  const unit = s.units;
  $('#units-metric').checked = (unit === 'metric');
  $('#units-imperial').checked = (unit === 'imperial');
  const label = unit === 'metric' ? 'm' : 'ft';
  $$('.unit-label').forEach(el => el.textContent = label);

  $('#room-L').value = fromMeters(s.room.L, unit).toFixed(2);
  $('#room-W').value = fromMeters(s.room.W, unit).toFixed(2);
  $('#room-H').value = fromMeters(s.room.H, unit).toFixed(2);
  $('#purpose-select').value = s.purpose;

  const V = s.room.L * s.room.W * s.room.H;
  $('#room-summary').textContent =
    `体积 ≈ ${V.toFixed(1)} m³  ·  总表面积 ≈ ${(2*(s.room.L*s.room.W + s.room.L*s.room.H + s.room.W*s.room.H)).toFixed(1)} ㎡`;
}

function renderSurfaces() {
  const s = getCurrentScheme();
  if (!s) return;
  const surfaces = ['north', 'south', 'east', 'west', 'floor', 'ceiling'];
  const metrics = calcRoomMetrics(s.room.L, s.room.W, s.room.H);
  const areas = metrics.wallAreas;

  const root = $('#surfaces-grid');
  root.innerHTML = surfaces.map(k => {
    const conf = s.surfaces[k] || {};
    const area = areas[k];
    const covered = area * (conf.coverage != null ? conf.coverage : 1);
    const alpha = getMaterialAlpha(conf.materialId, conf.customAlpha);
    const price = getMaterialPrice(conf.materialId, conf.customPrice);
    return `
    <div class="surface-card" data-surface="${k}">
      <div class="surface-head">
        <h5>${SURFACE_LABELS[k]}</h5>
        <span class="area-tag">${area.toFixed(1)}㎡</span>
      </div>
      <label>材料
        <select class="surface-material-select" data-surface="${k}">
        </select>
      </label>
      <div class="row-2">
        <label class="flex-2">覆盖率
          <input type="range" min="0" max="100" value="${((conf.coverage||1)*100).toFixed(0)}"
                 class="coverage-slider" data-surface="${k}">
          <span class="coverage-val">${((conf.coverage||1)*100).toFixed(0)}%</span>
        </label>
        <label class="flex-1">单价¥/㎡
          <input type="number" step="1" min="0" value="${price.toFixed(0)}"
                 class="price-input" data-surface="${k}">
        </label>
      </div>
      <div class="coverage-area">贴材面积 ≈ <strong>${covered.toFixed(2)} ㎡</strong> ≈ ¥${(covered * price).toFixed(0)}</div>
      <div class="alpha-strip">
        ${FREQ_BANDS.map(f => `
          <div class="alpha-cell">
            <div class="f">${f===1000?'1k':f===2000?'2k':f===4000?'4k':f}</div>
            <div class="bar-wrap">
              <div class="bar" style="height:${Math.min(100, alpha[f]*100)}%"></div>
            </div>
            <div class="v">${alpha[f].toFixed(2)}</div>
          </div>`).join('')}
      </div>
      ${conf.materialId === 'custom' ? `
        <div class="custom-alpha-grid">
          ${FREQ_BANDS.map(f => `
            <label>${f===1000?'1k':f===2000?'2k':f===4000?'4k':f}Hz
              <input type="number" min="0" max="1" step="0.01"
                value="${(conf.customAlpha && conf.customAlpha[f]!=null)?conf.customAlpha[f]:0.10}"
                class="custom-alpha" data-surface="${k}" data-freq="${f}">
            </label>`).join('')}
        </div>` : ''}
    </div>`;
  }).join('');

  $$('.surface-material-select', root).forEach(sel => {
    const k = sel.dataset.surface;
    const cats = {wall:'墙体基础',absorber_bass:'低频吸声',absorber_medium:'中高频吸声',diffuser:'扩散体',floor:'地面',ceiling:'顶面',custom:'自定义'};
    const grouped = {};
    for (const [id, m] of Object.entries(MATERIALS_DB)) {
      const c = m.category || 'wall';
      (grouped[c]=grouped[c]||[]).push({id,...m});
    }
    let opts = '';
    for (const [ck, cv] of Object.entries(cats)) {
      if (!grouped[ck]) continue;
      opts += `<optgroup label="${cv}">` + grouped[ck].map(m=>`<option value="${m.id}">${m.name}</option>`).join('') + `</optgroup>`;
    }
    sel.innerHTML = opts;
    sel.value = (s.surfaces[k] && s.surfaces[k].materialId) || 'gypsum_board_12mm';
  });
}

function renderCurtains() {
  const s = getCurrentScheme();
  if (!s) return;
  const root = $('#curtains-list');
  root.innerHTML = (s.curtains || []).map((c, i) => `
    <div class="furniture-row" data-index="${i}">
      <select data-list="curtains" data-i="${i}" data-field="type">
        ${Object.keys(CURTAIN_TYPES).map(k =>
          `<option value="${k}" ${c.type===k?'selected':''}>${CURTAIN_TYPES[k].name}</option>`).join('')}
      </select>
      <label>宽
        <input type="number" step="0.1" min="0" value="${(c.widthM||0).toFixed(1)}"
               data-list="curtains" data-i="${i}" data-field="widthM" class="sm-input"> m
      </label>
      <label>高
        <input type="number" step="0.1" min="0" value="${(c.heightM||0).toFixed(1)}"
               data-list="curtains" data-i="${i}" data-field="heightM" class="sm-input"> m
      </label>
      <span class="row-area">≈ ${((c.widthM||0)*(c.heightM||0)).toFixed(1)}㎡</span>
      <button class="icon-btn sm" data-list="curtains" data-i="${i}" data-act="del">×</button>
    </div>
  `).join('') || `<div class="empty-hint">还没加窗帘，点击右侧「+ 加窗帘」添加</div>`;
}

function renderFurniture() {
  const s = getCurrentScheme();
  if (!s) return;
  const root = $('#furniture-list');
  root.innerHTML = (s.furniture || []).map((f, i) => `
    <div class="furniture-row" data-index="${i}">
      <select data-list="furniture" data-i="${i}" data-field="type">
        ${Object.keys(FURNITURE_TYPES).map(k =>
          `<option value="${k}" ${f.type===k?'selected':''}>${FURNITURE_TYPES[k].name}</option>`).join('')}
      </select>
      <label>数量
        <input type="number" step="1" min="0" value="${f.count||0}"
               data-list="furniture" data-i="${i}" data-field="count" class="sm-input">
      </label>
      <span class="row-area">≈ ${((FURNITURE_TYPES[f.type]||{}).eqArea||0)*(f.count||0).toFixed(1)}㎡</span>
      <button class="icon-btn sm" data-list="furniture" data-i="${i}" data-act="del">×</button>
    </div>
  `).join('') || `<div class="empty-hint">家具/设备还没加，点击「+ 加家具」</div>`;
}

function renderIssues(issues) {
  const el = $('#issues-block');
  if (!issues || !issues.length) {
    el.innerHTML = '<div class="no-issues">✅ 未发现明显问题</div>';
    el.classList.remove('has-issues');
    return;
  }
  el.classList.add('has-issues');
  el.innerHTML = issues.map(i => `
    <div class="issue-item issue-${i.level}">
      <div class="issue-head">
        <span class="issue-level">
          ${i.level==='error'?'⛔ 错误':i.level==='warning'?'⚠️ 提醒':'ℹ️ 信息'}
        </span>
        <span class="issue-code">${i.code}</span>
      </div>
      <div class="issue-msg">${i.message}</div>
      ${i.suggestion ? `<div class="issue-suggest">💡 ${i.suggestion}</div>` : ''}
    </div>
  `).join('');
}

function renderResult() {
  const s = getCurrentScheme();
  if (!s) return;
  const result = runFullCalculation(s);
  const issues = validateScheme(s, result);
  state.currentResult = result;
  state.currentIssues = issues;

  renderOwnerReport($('#owner-report'), s, result, issues);
  renderAcousticianReport($('#acoustician-report'), s, result, issues);
  renderIssues(issues);
  renderCharts();
}

function renderCharts() {
  const compareSchemes = state.activeCompare
    .map(id => state.schemes.find(x => x.id === id))
    .filter(Boolean);

  const freqLabels = FREQ_BANDS.map(f => f === 1000 ? '1k' : f === 2000 ? '2k' : f === 4000 ? '4k' : f);

  const lineDatasets = compareSchemes.map((sc, i) => {
    const r = runFullCalculation(sc);
    const color = SCHEME_COLORS[state.schemes.indexOf(sc) % SCHEME_COLORS.length];
    return {
      label: sc.name || `方案 ${i+1}`,
      data: FREQ_BANDS.map(f => +r.rt60ByBand[f].toFixed(3)),
      borderColor: color,
      backgroundColor: color + '22',
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false
    };
  });

  if (compareSchemes.length === 0) {
    lineDatasets.push({
      label: '(无对比方案)',
      data: FREQ_BANDS.map(() => null),
      borderColor: '#888',
      borderDash: [5, 5]
    });
  }

  if (state.currentResult) {
    lineDatasets.push({
      label: '目标上界',
      data: FREQ_BANDS.map(f => +state.currentResult.target[f].max.toFixed(3)),
      borderColor: '#55efc4',
      borderDash: [6, 4],
      pointRadius: 0,
      borderWidth: 1.5,
      fill: '+1',
      backgroundColor: 'rgba(85,239,196,0.08)'
    });
    lineDatasets.push({
      label: '目标下界',
      data: FREQ_BANDS.map(f => +state.currentResult.target[f].min.toFixed(3)),
      borderColor: '#55efc4',
      borderDash: [6, 4],
      pointRadius: 0,
      borderWidth: 1.5,
      fill: false
    });
  }

  if (state.charts.line) {
    state.charts.line.data.labels = freqLabels;
    state.charts.line.data.datasets = lineDatasets;
    state.charts.line.update();
  } else {
    const ctx = document.getElementById('rt-chart').getContext('2d');
    state.charts.line = new Chart(ctx, {
      type: 'line',
      data: { labels: freqLabels, datasets: lineDatasets },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: '#e0e6ed' } },
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${c.parsed.y?.toFixed?.(3) ?? '-'} s`
            }
          }
        },
        scales: {
          x: { title: { display: true, text: '倍频程中心频率 (Hz)', color: '#9aa5b1' }, ticks: { color: '#9aa5b1' }, grid: { color: '#2a3441' } },
          y: {
            beginAtZero: true,
            max: 2.0,
            title: { display: true, text: 'RT₆₀ (s)', color: '#9aa5b1' },
            ticks: { color: '#9aa5b1' },
            grid: { color: '#2a3441' }
          }
        }
      }
    });
  }

  if (state.currentResult) {
    const mat = state.currentResult.materialBreakdown;
    const doughnutData = mat.length
      ? { labels: mat.map(m => m.materialName),
          datasets: [{ data: mat.map(m => +m.totalCost.toFixed(0)),
            backgroundColor: SCHEME_COLORS.concat(['#74b9ff','#fdcb6e','#e17055','#fab1a0','#81ecec','#ffeaa7']).slice(0, mat.length) }] }
      : { labels: ['(暂无材料预算)'], datasets: [{ data: [1], backgroundColor: ['#555'] }] };
    if (state.charts.budget) {
      state.charts.budget.data = doughnutData;
      state.charts.budget.update();
    } else {
      const ctx = document.getElementById('budget-chart').getContext('2d');
      state.charts.budget = new Chart(ctx, {
        type: 'doughnut',
        data: doughnutData,
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#e0e6ed', padding: 8, font: { size: 11 } } },
            tooltip: {
              callbacks: { label: (c) => {
                const v = c.parsed;
                const total = c.dataset.data.reduce((a,b)=>a+b,0);
                return `${c.label}: ¥${v} (${total>0?(v/total*100).toFixed(1):0}%)`;
              }}
            }
          }
        }
      });
    }

    const evalBars = FREQ_BANDS.map(f => {
      const ev = state.currentResult.bandEvaluation[f];
      return +(ev.rt - (ev.targetMin + ev.targetMax) / 2).toFixed(3);
    });
    const barColors = FREQ_BANDS.map(f => {
      const st = state.currentResult.bandEvaluation[f].status;
      return st === 'good' ? '#27ae60' : st === 'muddy' ? '#e74c3c' : '#f39c12';
    });
    if (state.charts.deviation) {
      state.charts.deviation.data.labels = freqLabels;
      state.charts.deviation.data.datasets[0].data = evalBars;
      state.charts.deviation.data.datasets[0].backgroundColor = barColors;
      state.charts.deviation.update();
    } else {
      const ctx = document.getElementById('deviation-chart').getContext('2d');
      state.charts.deviation = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: freqLabels,
          datasets: [{
            label: '偏离目标中心 (s)',
            data: evalBars,
            backgroundColor: barColors,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => `偏离: ${c.parsed.y > 0 ? '+' : ''}${c.parsed.y} s (${c.parsed.y>0?'偏闷':c.parsed.y<0?'偏干':'理想'})` } }
          },
          scales: {
            x: { ticks: { color: '#9aa5b1' }, grid: { color: '#2a3441' } },
            y: { ticks: { color: '#9aa5b1' }, grid: { color: '#2a3441' } }
          }
        }
      });
    }
  }
}

function renderAll() {
  renderRoomInputs();
  renderSurfaces();
  renderCurtains();
  renderFurniture();
  renderResult();
}

function updateCurrent(patch) {
  const s = updateScheme(state.currentId, patch);
  if (s) {
    state.schemes = loadSchemes();
  }
}

function bindEvents() {
  // Scheme list
  $('#scheme-list').addEventListener('click', (e) => {
    const row = e.target.closest('.scheme-row');
    const id = row?.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('del-btn')) {
      if (state.schemes.length <= 1) return alert('至少保留 1 套方案');
      if (!confirm(`确认删除「${state.schemes.find(s=>s.id===id)?.name}」？`)) return;
      state.schemes = deleteScheme(id);
      state.activeCompare = state.activeCompare.filter(x => x !== id);
      if (state.currentId === id) state.currentId = state.schemes[0]?.id;
      if (!state.activeCompare.includes(state.currentId)) state.activeCompare.push(state.currentId);
      renderSchemeList(); renderSchemeTabs(); renderAll();
      return;
    }
    if (e.target.classList.contains('clone-btn')) {
      const r = cloneScheme(id);
      if (r.ok) {
        state.schemes = loadSchemes();
        state.currentId = r.scheme.id;
        state.activeCompare.push(r.scheme.id);
        renderSchemeList(); renderSchemeTabs(); renderAll();
      } else alert(r.reason);
      return;
    }
    const cb = e.target.closest('.compare-toggle')?.querySelector('input');
    if (cb) {
      e.stopPropagation();
      if (cb.checked) state.activeCompare.push(id);
      else state.activeCompare = state.activeCompare.filter(x => x !== id);
      renderCharts();
      return;
    }
    state.currentId = id;
    if (!state.activeCompare.includes(id)) state.activeCompare.push(id);
    renderSchemeList(); renderSchemeTabs(); renderAll();
  });

  $('#scheme-list').addEventListener('input', (e) => {
    if (e.target.classList.contains('scheme-name')) {
      const row = e.target.closest('.scheme-row');
      if (!row) return;
      clearTimeout(window._nameT);
      window._nameT = setTimeout(() => {
        updateScheme(row.dataset.id, { name: e.target.textContent.trim() || '未命名' });
        state.schemes = loadSchemes();
        renderSchemeTabs();
      }, 400);
    }
  });

  $('#scheme-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    state.currentId = tab.dataset.id;
    if (!state.activeCompare.includes(tab.dataset.id)) state.activeCompare.push(tab.dataset.id);
    renderSchemeList(); renderSchemeTabs(); renderAll();
  });

  $('#add-scheme-btn').addEventListener('click', () => {
    const n = state.schemes.length + 1;
    const names = ['A','B','C','D','E'];
    const d = defaultScheme(`方案 ${names[n-1] || n} - 新建`);
    const r = addScheme(d);
    if (!r.ok) return alert(r.reason);
    state.schemes = loadSchemes();
    state.currentId = r.scheme.id;
    state.activeCompare.push(r.scheme.id);
    renderSchemeList(); renderSchemeTabs(); renderAll();
  });

  // Room inputs
  const roomHandler = debounced(() => {
    const s = getCurrentScheme();
    if (!s) return;
    const units = $('#units-metric').checked ? 'metric' : 'imperial';
    const L = toMeters(parseFloat($('#room-L').value) || 0, units);
    const W = toMeters(parseFloat($('#room-W').value) || 0, units);
    const H = toMeters(parseFloat($('#room-H').value) || 0, units);
    updateCurrent({ units, room: { L, W, H } });
    renderRoomInputs(); renderSurfaces(); renderResult();
  }, 200);
  $('#room-L').addEventListener('input', roomHandler);
  $('#room-W').addEventListener('input', roomHandler);
  $('#room-H').addEventListener('input', roomHandler);
  $('#units-metric').addEventListener('change', roomHandler);
  $('#units-imperial').addEventListener('change', roomHandler);
  $('#purpose-select').addEventListener('change', (e) => {
    updateCurrent({ purpose: e.target.value });
    renderResult();
  });

  // Surfaces
  $('#surfaces-grid').addEventListener('change', (e) => {
    const s = getCurrentScheme();
    if (!s) return;
    const key = e.target.dataset.surface;
    if (!key) return;
    const conf = { ...(s.surfaces[key] || {}) };
    if (e.target.classList.contains('surface-material-select')) {
      conf.materialId = e.target.value;
      if (e.target.value !== 'custom') delete conf.customAlpha;
    } else if (e.target.classList.contains('price-input')) {
      conf.customPrice = parseFloat(e.target.value) || 0;
    } else if (e.target.classList.contains('custom-alpha')) {
      conf.customAlpha = conf.customAlpha || { ...MATERIALS_DB.custom.alpha };
      conf.customAlpha[e.target.dataset.freq] = parseFloat(e.target.value) || 0;
    }
    s.surfaces[key] = conf;
    updateCurrent({ surfaces: s.surfaces });
    renderSurfaces(); renderResult();
  });
  $('#surfaces-grid').addEventListener('input', (e) => {
    if (!e.target.classList.contains('coverage-slider')) return;
    const s = getCurrentScheme();
    const key = e.target.dataset.surface;
    if (!s || !key) return;
    const conf = { ...(s.surfaces[key] || {}), coverage: parseInt(e.target.value) / 100 };
    s.surfaces[key] = conf;
    $(`.coverage-val`, e.target.closest('.surface-card')).textContent = e.target.value + '%';
    clearTimeout(window._covT);
    window._covT = setTimeout(() => {
      updateCurrent({ surfaces: s.surfaces });
      renderSurfaces(); renderResult();
    }, 150);
  });

  // Curtains + Furniture
  $('#add-curtain-btn').addEventListener('click', () => {
    const s = getCurrentScheme();
    s.curtains = [...(s.curtains || []), { type: 'heavy', widthM: 2, heightM: 2.5 }];
    updateCurrent({ curtains: s.curtains });
    renderCurtains(); renderResult();
  });
  $('#add-furniture-btn').addEventListener('click', () => {
    const s = getCurrentScheme();
    s.furniture = [...(s.furniture || []), { type: 'sofa_small', count: 1 }];
    updateCurrent({ furniture: s.furniture });
    renderFurniture(); renderResult();
  });

  const listHandler = (e) => {
    const listName = e.target.dataset.list;
    if (!listName) return;
    const i = parseInt(e.target.dataset.i);
    const s = getCurrentScheme();
    const arr = [...(s[listName] || [])];
    if (!arr[i]) return;
    if (e.target.dataset.act === 'del') {
      arr.splice(i, 1);
    } else {
      const field = e.target.dataset.field;
      let v = e.target.value;
      if (e.target.type === 'number') v = parseFloat(v) || 0;
      arr[i] = { ...arr[i], [field]: v };
    }
    updateCurrent({ [listName]: arr });
    if (listName === 'curtains') renderCurtains(); else renderFurniture();
    renderResult();
  };
  const safeBind = (selector, evt, fn) => {
    const el = $(selector);
    if (el) el.addEventListener(evt, fn);
  };
  safeBind('#curtains-list', 'change', listHandler);
  safeBind('#furniture-list', 'change', listHandler);

  // Reports
  safeBind('#print-owner', 'click', () => printReport('owner'));
  safeBind('#print-acoustician', 'click', () => printReport('acoustician'));

  // Export / import
  safeBind('#export-btn', 'click', () => exportJSON(state.schemes));
  safeBind('#import-btn', 'click', () => { const f = $('#import-file'); if (f) f.click(); });
  safeBind('#import-file', 'change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = await importJSON(f);
      const merged = [...state.schemes];
      const before = merged.length;
      for (const sc of data) {
        if (merged.length >= MAX_SCHEMES) break;
        sc.id = uuid();
        sc.name = (sc.name || '导入') + ' (导入)';
        sc.createdAt = Date.now();
        merged.push(sc);
      }
      saveSchemes(merged);
      state.schemes = merged;
      if (!state.currentId) state.currentId = state.schemes[0]?.id;
      alert(`导入成功，新增 ${merged.length - before} 套方案`);
      renderSchemeList(); renderSchemeTabs(); renderAll();
    } catch (err) {
      alert('导入失败：' + err.message);
    } finally {
      e.target.value = '';
    }
  });

  // Theme toggle
  safeBind('#theme-toggle', 'click', () => {
    document.body.classList.toggle('light-theme');
  });
}

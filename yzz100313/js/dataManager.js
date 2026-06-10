const DataManager = (function() {
  const STORAGE_KEY = 'drone_review_data_v1';

  let state = {
    routes: [],
    noFlyZones: [],
    pilotRecords: [],
    risks: [],
    reviews: {}
  };

  let importFingerprints = {
    routes: new Set(),
    noFlyZones: new Set(),
    pilotRecords: new Set()
  };

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        state = data.state || state;
        importFingerprints = {
          routes: new Set(data.fingerprints?.routes || []),
          noFlyZones: new Set(data.fingerprints?.noFlyZones || []),
          pilotRecords: new Set(data.fingerprints?.pilotRecords || [])
        };
      }
    } catch (e) {
      console.error('加载本地数据失败:', e);
    }
  }

  function saveToStorage() {
    try {
      const data = {
        state,
        fingerprints: {
          routes: Array.from(importFingerprints.routes),
          noFlyZones: Array.from(importFingerprints.noFlyZones),
          pilotRecords: Array.from(importFingerprints.pilotRecords)
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('保存本地数据失败:', e);
    }
  }

  function clearAll() {
    state = {
      routes: [],
      noFlyZones: [],
      pilotRecords: [],
      risks: [],
      reviews: {}
    };
    importFingerprints = {
      routes: new Set(),
      noFlyZones: new Set(),
      pilotRecords: new Set()
    };
    localStorage.removeItem(STORAGE_KEY);
  }

  function computeFileFingerprint(content, fileName) {
    return Utils.hashString(fileName + '|' + content);
  }

  function isDuplicate(type, fingerprint) {
    return importFingerprints[type].has(fingerprint);
  }

  function markImported(type, fingerprint) {
    importFingerprints[type].add(fingerprint);
  }

  async function importRouteCSV(file) {
    const text = await Utils.readFileAsText(file);
    const fingerprint = computeFileFingerprint(text, file.name);

    if (isDuplicate('routes', fingerprint)) {
      return { skipped: true, message: '文件已导入，跳过重复' };
    }

    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (result.errors.length > 0) {
      throw new Error('CSV 解析错误: ' + result.errors[0].message);
    }

    const routes = parseRouteCSV(result.data, file.name);
    routes.forEach(r => {
      const existing = state.routes.find(x => x.id === r.id);
      if (!existing) {
        state.routes.push(r);
      } else {
        existing.name = r.name;
        existing.planPoints = r.planPoints;
        existing.actualPoints = r.actualPoints;
        existing.flightDate = r.flightDate;
        existing.maxHeight = r.maxHeight;
        existing.sourceFile = r.sourceFile;
        if (r.pilot) existing.pilot = r.pilot;
        if (r.approver) existing.approver = r.approver;
        if (r.sourcePersonnel?.routeCSV) {
          existing.sourcePersonnel.routeCSV = r.sourcePersonnel.routeCSV;
        }
      }
    });

    markImported('routes', fingerprint);
    saveToStorage();

    return { success: true, count: routes.length, skipped: false };
  }

  function parseRouteCSV(rows, fileName) {
    const routes = {};
    let defaultRouteId = fileName.replace(/\.csv$/i, '');

    rows.forEach((row, idx) => {
      const routeId = row.route_id || row.航线编号 || row.id || defaultRouteId;
      const pointType = row.type || row.类型 || 'actual';
      const lon = parseFloat(row.lon || row.经度 || row.longitude || row.x);
      const lat = parseFloat(row.lat || row.纬度 || row.latitude || row.y);
      const height = parseFloat(row.height || row.高度 || row.altitude || row.h) || 0;
      const timestamp = row.time || row.时间 || row.timestamp || null;

      if (isNaN(lon) || isNaN(lat)) return;

      if (!routes[routeId]) {
        routes[routeId] = {
          id: routeId,
          name: row.route_name || row.航线名称 || routeId,
          planPoints: [],
          actualPoints: [],
          pilot: row.pilot || row.飞手 || '',
          approver: row.approver || row.审批人 || '',
          flightDate: row.date || row.飞行日期 || null,
          maxHeight: parseFloat(row.max_height || row.限高 || row.maxHeight) || 120,
          sourceFile: fileName,
          sourcePersonnel: {
            routeCSV: {
              pilot: row.pilot || row.飞手 || '',
              approver: row.approver || row.审批人 || '',
              sourceFile: fileName
            },
            pilotRecord: {
              pilot: '',
              approver: '',
              sourceFile: ''
            },
            noFlyZone: {
              pilot: '',
              approver: '',
              sourceFile: ''
            }
          },
          createdAt: new Date().toISOString()
        };
      }

      const point = {
        index: idx,
        lon,
        lat,
        height,
        timestamp: timestamp
      };

      if (pointType === 'plan' || pointType === '计划') {
        routes[routeId].planPoints.push(point);
      } else {
        routes[routeId].actualPoints.push(point);
      }

      if (row.pilot || row.飞手) {
        const pilotVal = row.pilot || row.飞手;
        routes[routeId].pilot = pilotVal;
        routes[routeId].sourcePersonnel.routeCSV.pilot = pilotVal;
      }
      if (row.approver || row.审批人) {
        const approverVal = row.approver || row.审批人;
        routes[routeId].approver = approverVal;
        routes[routeId].sourcePersonnel.routeCSV.approver = approverVal;
      }
      if (row.max_height || row.限高) {
        routes[routeId].maxHeight = parseFloat(row.max_height || row.限高) || 120;
      }
      if (row.date || row.飞行日期) {
        routes[routeId].flightDate = row.date || row.飞行日期;
      }
    });

    return Object.values(routes).map(r => {
      r.planPoints.sort((a, b) => a.index - b.index);
      r.actualPoints.sort((a, b) => a.index - b.index);
      return r;
    });
  }

  async function importNoFlyGeoJSON(file) {
    const text = await Utils.readFileAsText(file);
    const fingerprint = computeFileFingerprint(text, file.name);

    if (isDuplicate('noFlyZones', fingerprint)) {
      return { skipped: true, message: '文件已导入，跳过重复' };
    }

    const geojson = JSON.parse(text);
    const zones = parseNoFlyZones(geojson, file.name);

    zones.forEach(zone => {
      const existing = state.noFlyZones.find(x => x.id === zone.id);
      if (!existing) {
        state.noFlyZones.push(zone);
      } else {
        Object.assign(existing, zone);
      }
    });

    markImported('noFlyZones', fingerprint);
    saveToStorage();

    return { success: true, count: zones.length, skipped: false };
  }

  function parseNoFlyZones(geojson, fileName) {
    const zones = [];

    function processFeature(feature, idx) {
      const geom = feature.geometry;
      if (!geom) return;

      const props = feature.properties || {};
      const id = props.id || props.zone_id || `nofly_${fileName}_${idx}`;
      const name = props.name || props.名称 || `禁飞区 ${idx + 1}`;
      const type = props.type || props.类型 || '禁飞区';
      const maxHeight = parseFloat(props.max_height || props.限高) || 0;

      zones.push({
        id,
        name,
        type,
        geometry: geom,
        maxHeight,
        properties: props,
        sourceFile: fileName
      });
    }

    if (geojson.type === 'FeatureCollection') {
      geojson.features.forEach((f, i) => processFeature(f, i));
    } else if (geojson.type === 'Feature') {
      processFeature(geojson, 0);
    } else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
      processFeature({ type: 'Feature', geometry: geojson, properties: {} }, 0);
    }

    return zones;
  }

  async function importPilotJSON(file) {
    const text = await Utils.readFileAsText(file);
    const fingerprint = computeFileFingerprint(text, file.name);

    if (isDuplicate('pilotRecords', fingerprint)) {
      return { skipped: true, message: '文件已导入，跳过重复' };
    }

    const data = JSON.parse(text);
    const records = parsePilotRecords(data, file.name);

    records.forEach(rec => {
      const existing = state.pilotRecords.find(x => x.id === rec.id);
      if (!existing) {
        state.pilotRecords.push(rec);
      } else {
        Object.assign(existing, rec);
      }

      const route = state.routes.find(r => r.id === rec.routeId);
      if (route) {
        if (!route.sourcePersonnel) {
          route.sourcePersonnel = {
            routeCSV: { pilot: route.pilot || '', approver: route.approver || '', sourceFile: route.sourceFile || '' },
            pilotRecord: { pilot: '', approver: '', sourceFile: '' },
            noFlyZone: { pilot: '', approver: '', sourceFile: '' }
          };
        }
        route.sourcePersonnel.pilotRecord = {
          pilot: rec.pilot || '',
          approver: rec.approver || '',
          sourceFile: rec.sourceFile || fileName
        };
        if (rec.flightDate) route.flightDate = rec.flightDate;
        if (rec.maxHeight) route.maxHeight = rec.maxHeight;
        if (rec.actualPoints && rec.actualPoints.length > 0) {
          route.actualPoints = rec.actualPoints;
        }
      }
    });

    markImported('pilotRecords', fingerprint);
    saveToStorage();

    return { success: true, count: records.length, skipped: false };
  }

  function parsePilotRecords(data, fileName) {
    const records = [];

    function processRecord(obj, idx) {
      const routeId = obj.route_id || obj.routeId || obj.航线编号 || `pilot_${fileName}_${idx}`;
      const points = obj.points || obj.actual_points || obj.实际航点 || [];

      records.push({
        id: routeId,
        routeId,
        pilot: obj.pilot || obj.飞手 || '',
        approver: obj.approver || obj.审批人 || '',
        flightDate: obj.date || obj.flight_date || obj.飞行日期 || null,
        maxHeight: parseFloat(obj.max_height || obj.限高) || 120,
        actualPoints: points.map((p, i) => ({
          index: i,
          lon: parseFloat(p.lon || p.经度 || p.longitude || p.x),
          lat: parseFloat(p.lat || p.纬度 || p.latitude || p.y),
          height: parseFloat(p.height || p.高度 || p.altitude || p.h) || 0,
          timestamp: p.time || p.timestamp || null
        })).filter(p => !isNaN(p.lon) && !isNaN(p.lat)),
        notes: obj.notes || obj.备注 || '',
        sourceFile: fileName
      });
    }

    if (Array.isArray(data)) {
      data.forEach((d, i) => processRecord(d, i));
    } else if (data.records || data.records) {
      (data.records || data.records).forEach((d, i) => processRecord(d, i));
    } else {
      processRecord(data, 0);
    }

    return records;
  }

  function getRoutes() {
    return state.routes;
  }

  function getRouteById(id) {
    return state.routes.find(r => r.id === id);
  }

  function getNoFlyZones() {
    return state.noFlyZones;
  }

  function getPilotRecords() {
    return state.pilotRecords;
  }

  function setRisks(risks) {
    state.risks = risks;
    saveToStorage();
  }

  function getRisks() {
    return state.risks;
  }

  function getRisksByRouteId(routeId) {
    return state.risks.filter(r => r.routeId === routeId);
  }

  function getReview(riskId) {
    return state.reviews[riskId] || null;
  }

  function saveReview(riskId, review) {
    state.reviews[riskId] = {
      ...review,
      updatedAt: new Date().toISOString()
    };
    saveToStorage();
  }

  function getReviews() {
    return state.reviews;
  }

  function getStats() {
    const totalRoutes = state.routes.length;
    const totalRisks = state.risks.length;
    const pendingRisks = state.risks.filter(r => {
      const review = state.reviews[r.id];
      return !review || review.status === 'pending';
    }).length;
    const confirmedRisks = state.risks.filter(r => {
      const review = state.reviews[r.id];
      return review && review.status === 'confirmed';
    }).length;

    return {
      totalRoutes,
      totalRisks,
      pendingRisks,
      confirmedRisks
    };
  }

  function hasData() {
    return state.routes.length > 0;
  }

  return {
    loadFromStorage,
    saveToStorage,
    clearAll,
    importRouteCSV,
    importNoFlyGeoJSON,
    importPilotJSON,
    getRoutes,
    getRouteById,
    getNoFlyZones,
    getPilotRecords,
    setRisks,
    getRisks,
    getRisksByRouteId,
    getReview,
    saveReview,
    getReviews,
    getStats,
    hasData
  };
})();

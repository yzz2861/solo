const MapViewer = (function() {
  let map = null;
  let planLayer = null;
  let actualLayer = null;
  let noFlyLayer = null;
  let riskMarkers = [];
  let riskHighlightLayer = null;
  let currentRoute = null;

  function init() {
    map = L.map('map', {
      center: [39.9042, 116.4074],
      zoom: 11,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    planLayer = L.layerGroup().addTo(map);
    actualLayer = L.layerGroup().addTo(map);
    noFlyLayer = L.layerGroup().addTo(map);
    riskHighlightLayer = L.layerGroup().addTo(map);

    renderNoFlyZones();
  }

  function renderNoFlyZones() {
    noFlyLayer.clearLayers();
    const zones = DataManager.getNoFlyZones();

    zones.forEach(zone => {
      const style = {
        color: '#ef4444',
        weight: 2,
        opacity: 0.8,
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        dashArray: '5, 5'
      };

      const layer = L.geoJSON(zone.geometry, {
        style: style
      }).bindPopup(`
        <div class="popup-title">${Utils.escapeHtml(zone.name)}</div>
        <div class="popup-row"><span>类型：</span><span>${Utils.escapeHtml(zone.type || '禁飞区')}</span></div>
        ${zone.maxHeight ? `<div class="popup-row"><span>限高：</span><span>${zone.maxHeight}m</span></div>` : ''}
      `);

      layer.addTo(noFlyLayer);
    });
  }

  function showRoute(routeId) {
    const route = DataManager.getRouteById(routeId);
    if (!route) return;

    currentRoute = route;

    planLayer.clearLayers();
    actualLayer.clearLayers();
    clearRiskMarkers();
    riskHighlightLayer.clearLayers();

    if (route.planPoints.length > 0) {
      const planLatLngs = route.planPoints.map(p => [p.lat, p.lon]);
      const planLine = L.polyline(planLatLngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(planLayer);

      route.planPoints.forEach((p, i) => {
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 3,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 1,
          weight: 1
        }).bindPopup(`
          <div class="popup-title">计划航点 #${i + 1}</div>
          <div class="popup-row"><span>经度：</span><span>${p.lon.toFixed(6)}</span></div>
          <div class="popup-row"><span>纬度：</span><span>${p.lat.toFixed(6)}</span></div>
          <div class="popup-row"><span>高度：</span><span>${p.height.toFixed(1)}m</span></div>
        `).addTo(planLayer);
      });
    }

    if (route.actualPoints.length > 0) {
      const actualLatLngs = route.actualPoints.map(p => [p.lat, p.lon]);
      const actualLine = L.polyline(actualLatLngs, {
        color: '#22c55e',
        weight: 3,
        opacity: 0.9
      }).addTo(actualLayer);

      route.actualPoints.forEach((p, i) => {
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 2,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 1,
          weight: 1
        }).bindPopup(`
          <div class="popup-title">实际航点 #${i + 1}</div>
          <div class="popup-row"><span>经度：</span><span>${p.lon.toFixed(6)}</span></div>
          <div class="popup-row"><span>纬度：</span><span>${p.lat.toFixed(6)}</span></div>
          <div class="popup-row"><span>高度：</span><span>${p.height.toFixed(1)}m</span></div>
          ${p.timestamp ? `<div class="popup-row"><span>时间：</span><span>${Utils.escapeHtml(String(p.timestamp))}</span></div>` : ''}
        `).addTo(actualLayer);
      });
    }

    const risks = DataManager.getRisksByRouteId(routeId);
    renderRiskMarkers(risks);

    fitToRoute(route);
  }

  function fitToRoute(route) {
    const allPoints = [];

    if (route.planPoints) {
      allPoints.push(...route.planPoints.map(p => [p.lat, p.lon]));
    }
    if (route.actualPoints) {
      allPoints.push(...route.actualPoints.map(p => [p.lat, p.lon]));
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds.pad(0.2));
    }
  }

  function renderRiskMarkers(risks) {
    clearRiskMarkers();

    risks.forEach(risk => {
      if (!risk.location) return;

      const colors = {
        nofly: '#ef4444',
        height: '#f59e0b',
        person: '#8b5cf6'
      };

      const color = colors[risk.type] || '#ef4444';
      const review = DataManager.getReview(risk.id);

      const icon = L.divIcon({
        className: 'risk-marker',
        html: `<div style="
          width: 20px;
          height: 20px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ${review && review.status !== 'pending' ? 'opacity: 0.6;' : ''}
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([risk.location.lat, risk.location.lon], { icon })
        .bindPopup(`
          <div class="popup-title">${Utils.escapeHtml(Utils.getRiskTypeLabel(risk.type))}</div>
          <div style="font-size: 12px; color: #374151; margin-bottom: 8px;">
            ${Utils.escapeHtml(risk.description)}
          </div>
          ${review ? `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 6px; font-size: 11px;">
              <div>状态：${Utils.escapeHtml(Utils.getRiskStatusLabel(review.status))}</div>
              ${review.comment ? `<div>意见：${Utils.escapeHtml(review.comment)}</div>` : ''}
            </div>
          ` : ''}
        `)
        .on('click', () => {
          if (window.App && App.highlightRisk) {
            App.highlightRisk(risk.id);
          }
        });

      marker.riskId = risk.id;
      marker.addTo(actualLayer);
      riskMarkers.push(marker);
    });
  }

  function clearRiskMarkers() {
    riskMarkers.forEach(m => m.remove());
    riskMarkers = [];
  }

  function highlightRisk(riskId) {
    riskHighlightLayer.clearLayers();

    const risk = DataManager.getRisks().find(r => r.id === riskId);
    if (!risk || !risk.location) return;

    const colors = {
      nofly: '#ef4444',
      height: '#f59e0b',
      person: '#8b5cf6'
    };

    const color = colors[risk.type] || '#ef4444';

    const highlightCircle = L.circle([risk.location.lat, risk.location.lon], {
      radius: 150,
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.15,
      dashArray: '5, 5'
    }).addTo(riskHighlightLayer);

    if (risk.type === 'height' && risk.details?.segmentPoints) {
      const segLatLngs = risk.details.segmentPoints.map(p => [p.lat, p.lon]);
      L.polyline(segLatLngs, {
        color: '#f59e0b',
        weight: 5,
        opacity: 0.8
      }).addTo(riskHighlightLayer);
    }

    if (risk.type === 'nofly' && risk.zoneId) {
      const zone = DataManager.getNoFlyZones().find(z => z.id === risk.zoneId);
      if (zone) {
        L.geoJSON(zone.geometry, {
          style: {
            color: '#ef4444',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 0.3
          }
        }).addTo(riskHighlightLayer);
      }
    }

    map.panTo([risk.location.lat, risk.location.lon]);
    map.setZoom(Math.max(map.getZoom(), 14));

    const marker = riskMarkers.find(m => m.riskId === riskId);
    if (marker) {
      marker.openPopup();
    }
  }

  function clearHighlight() {
    riskHighlightLayer.clearLayers();
  }

  function refresh() {
    renderNoFlyZones();
    if (currentRoute) {
      showRoute(currentRoute.id);
    }
  }

  function getMap() {
    return map;
  }

  return {
    init,
    showRoute,
    highlightRisk,
    clearHighlight,
    refresh,
    getMap,
    renderNoFlyZones
  };
})();

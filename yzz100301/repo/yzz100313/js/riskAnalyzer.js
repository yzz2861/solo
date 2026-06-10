const RiskAnalyzer = (function() {
  function analyzeAll() {
    const routes = DataManager.getRoutes();
    const noFlyZones = DataManager.getNoFlyZones();
    const allRisks = [];

    routes.forEach(route => {
      const risks = analyzeRoute(route, noFlyZones);
      allRisks.push(...risks);
    });

    DataManager.setRisks(allRisks);
    return allRisks;
  }

  function analyzeRoute(route, noFlyZones) {
    const risks = [];
    const points = route.actualPoints.length > 0 ? route.actualPoints : route.planPoints;

    if (points.length === 0) return risks;

    const noflyRisks = checkNoFlyZones(route, points, noFlyZones);
    risks.push(...noflyRisks);

    const heightRisks = checkHeightLimit(route, points);
    risks.push(...heightRisks);

    const personRisks = checkPersonConsistency(route);
    risks.push(...personRisks);

    return risks;
  }

  function checkNoFlyZones(route, points, noFlyZones) {
    const risks = [];

    if (noFlyZones.length === 0 || points.length < 2) return risks;

    const lineCoords = points.map(p => [p.lon, p.lat]);
    const lineString = turf.lineString(lineCoords);

    noFlyZones.forEach(zone => {
      const zonePolygon = buildTurfPolygon(zone.geometry);
      if (!zonePolygon) return;

      const intersection = turf.lineIntersect(lineString, zonePolygon);
      if (intersection.features.length === 0) return;

      const crossedPoints = findCrossedPoints(points, zonePolygon);

      if (crossedPoints.length > 0) {
        const riskId = `${route.id}_nofly_${zone.id}`;
        const entryPoint = crossedPoints[0];
        const exitPoint = crossedPoints[crossedPoints.length - 1];

        risks.push({
          id: riskId,
          type: 'nofly',
          routeId: route.id,
          routeName: route.name,
          zoneId: zone.id,
          zoneName: zone.name,
          description: `航线 "${route.name}" 穿越禁飞区 "${zone.name}"`,
          severity: 'high',
          location: {
            lat: entryPoint.lat,
            lon: entryPoint.lon
          },
          details: {
            entryPoint: { index: entryPoint.index, lat: entryPoint.lat, lon: entryPoint.lon, height: entryPoint.height },
            exitPoint: { index: exitPoint.index, lat: exitPoint.lat, lon: exitPoint.lon, height: exitPoint.height },
            crossedPointCount: crossedPoints.length,
            zoneType: zone.type
          },
          createdAt: new Date().toISOString()
        });
      }
    });

    return risks;
  }

  function buildTurfPolygon(geometry) {
    if (!geometry) return null;

    if (geometry.type === 'Polygon') {
      return turf.polygon(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      return turf.multiPolygon(geometry.coordinates);
    }

    return null;
  }

  function findCrossedPoints(points, zonePolygon) {
    const crossed = [];
    let inside = false;
    let firstInsideIdx = -1;

    for (let i = 0; i < points.length; i++) {
      const pt = turf.point([points[i].lon, points[i].lat]);
      const isInside = turf.booleanPointInPolygon(pt, zonePolygon);

      if (isInside && !inside) {
        inside = true;
        firstInsideIdx = i;
        crossed.push(points[i]);
      } else if (!isInside && inside) {
        inside = false;
        crossed.push(points[i]);
      } else if (isInside && i === points.length - 1) {
        crossed.push(points[i]);
      }
    }

    return crossed;
  }

  function checkHeightLimit(route, points) {
    const risks = [];
    const maxHeight = route.maxHeight || 120;

    const exceededPoints = points.filter(p => p.height > maxHeight);
    if (exceededPoints.length === 0) return risks;

    let maxExceedPoint = exceededPoints[0];
    let maxExceed = 0;

    exceededPoints.forEach(p => {
      const exceed = p.height - maxHeight;
      if (exceed > maxExceed) {
        maxExceed = exceed;
        maxExceedPoint = p;
      }
    });

    const segments = findContinuousSegments(points, p => p.height > maxHeight);

    segments.forEach((seg, idx) => {
      const segMaxPoint = seg.reduce((max, p) => p.height > max.height ? p : max, seg[0]);

      risks.push({
        id: `${route.id}_height_${idx}`,
        type: 'height',
        routeId: route.id,
        routeName: route.name,
        description: `高度超限：最大高度 ${segMaxPoint.height.toFixed(1)}m，超出限制 ${(segMaxPoint.height - maxHeight).toFixed(1)}m`,
        severity: 'medium',
        location: {
          lat: segMaxPoint.lat,
          lon: segMaxPoint.lon
        },
        details: {
          limit: maxHeight,
          maxHeight: segMaxPoint.height,
          exceedAmount: segMaxPoint.height - maxHeight,
          pointCount: seg.length,
          startIndex: seg[0].index,
          endIndex: seg[seg.length - 1].index,
          segmentPoints: seg.map(p => ({ index: p.index, lat: p.lat, lon: p.lon, height: p.height }))
        },
        createdAt: new Date().toISOString()
      });
    });

    return risks;
  }

  function findContinuousSegments(points, predicate) {
    const segments = [];
    let currentSeg = [];

    for (let i = 0; i < points.length; i++) {
      if (predicate(points[i])) {
        currentSeg.push(points[i]);
      } else if (currentSeg.length > 0) {
        segments.push(currentSeg);
        currentSeg = [];
      }
    }

    if (currentSeg.length > 0) {
      segments.push(currentSeg);
    }

    return segments;
  }

  function checkPersonConsistency(route) {
    const risks = [];

    if (!route.pilot || !route.approver) return risks;

    if (route.pilot === route.approver) {
      risks.push({
        id: `${route.id}_person_self`,
        type: 'person',
        routeId: route.id,
        routeName: route.name,
        description: `飞手与审批人为同一人：${route.pilot}`,
        severity: 'medium',
        location: null,
        details: {
          pilot: route.pilot,
          approver: route.approver,
          issue: '飞手审批自己的飞行任务'
        },
        createdAt: new Date().toISOString()
      });
    }

    return risks;
  }

  function filterRisks(risks, filters) {
    return risks.filter(risk => {
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(risk.type)) return false;
      }

      if (filters.onlyUnreviewed) {
        const review = DataManager.getReview(risk.id);
        if (review && review.status !== 'pending') return false;
      }

      if (filters.routeId) {
        if (risk.routeId !== filters.routeId) return false;
      }

      return true;
    });
  }

  return {
    analyzeAll,
    analyzeRoute,
    filterRisks
  };
})();

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || !lines[0].trim()) return [];
  
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j] !== undefined ? fields[j] : '';
    }
    data.push(obj);
  }
  return data;
}

function checkSourceExists(name) {
  const filePath = path.join(__dirname, '..', 'data', `${name}.csv`);
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Source file not found: /data/${name}.csv`);
    process.exit(1);
  }
  return filePath;
}

function writeJSONAtomic(name, data) {
  const targetPath = path.join(outputDir, `${name}.json`);
  const tempPath = path.join(outputDir, `${name}.tmp.json`);
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, targetPath);
  console.log(`Successfully wrote ${name}.json`);
}

function main() {
  console.log('Starting data conversion...');

  // 1. clusters.json
  const clustersPath = checkSourceExists('cluster_metadata');
  const clustersData = parseCSV(clustersPath).map(row => ({
    cluster_id: Number(row.cluster_id),
    zone_name: row.zone_name,
    centroid_lat: Number(row.centroid_lat),
    centroid_lng: Number(row.centroid_lng),
    violation_count: Number(row.violation_count),
    total_cis: Number(row.total_cis),
    avg_cis: Number(row.avg_cis),
    peak_hour: Number(row.peak_hour),
    top_vehicle: row.top_vehicle,
    top_violation: row.top_violation,
    tier: row.tier,
    risk_score: Number(row.risk_score),
  }));
  writeJSONAtomic('clusters', clustersData);

  // 2. parking_hotspots.json
  const hotspotsPath = checkSourceExists('parking_hotspots');
  const hotspotsData = parseCSV(hotspotsPath).map(row => ({
    cluster_id: Number(row.cluster_id),
    zone_name: row.zone_name,
    centroid_lat: Number(row.centroid_lat),
    centroid_lng: Number(row.centroid_lng),
    parking_violation_count: Number(row.parking_violation_count),
    avg_congestion_impact_pct: Number(row.avg_congestion_impact_pct),
    vehicle_types_affected: Number(row.vehicle_types_affected),
    location_context: row.location_context,
    peak_hours: row.peak_hours,
    priority_score: Number(row.priority_score),
    enforcement_gap: Number(row.enforcement_gap),
    deployments_count: Number(row.deployments_count),
  }));
  writeJSONAtomic('parking_hotspots', hotspotsData);

  // 3. parking_temporal_heatmap.json
  const heatmapPath = checkSourceExists('parking_temporal_heatmap');
  const heatmapData = parseCSV(heatmapPath).map(row => {
    const result = { day: row.day };
    for (let h = 0; h < 24; h++) {
      const key = `hour_${h}`;
      result[key] = Number(row[key]);
    }
    return result;
  });
  writeJSONAtomic('parking_temporal_heatmap', heatmapData);

  // 4. temporal_hourly_city.json
  const temporalPath = checkSourceExists('temporal_hourly_city');
  const temporalData = parseCSV(temporalPath).map(row => ({
    hour: Number(row.hour),
    count: Number(row.count),
  }));
  writeJSONAtomic('temporal_hourly_city', temporalData);

  // 5. prophet_forecasts.json
  const forecastsPath = checkSourceExists('prophet_forecasts');
  const forecastsData = parseCSV(forecastsPath).map(row => ({
    ds: row.ds,
    yhat: Number(row.yhat),
    yhat_lower: Number(row.yhat_lower),
    yhat_upper: Number(row.yhat_upper),
    cluster_id: Number(row.cluster_id),
  }));
  writeJSONAtomic('prophet_forecasts', forecastsData);

  // 6. parking_violations.json
  const violationsPath = checkSourceExists('parking_violations');
  const rawViolations = parseCSV(violationsPath);
  const groups = {};
  for (const row of rawViolations) {
    const cid = Number(row.cluster_id);
    if (!groups[cid]) {
      groups[cid] = {
        cluster_id: cid,
        violations: [],
      };
    }
    groups[cid].violations.push(row);
  }
  const violationsData = Object.values(groups).map(group => {
    const total = group.violations.length;
    const vTypeCounts = {};
    for (const v of group.violations) {
      const t = v.violation_type || 'UNKNOWN';
      vTypeCounts[t] = (vTypeCounts[t] || 0) + 1;
    }
    const violation_types = Object.entries(vTypeCounts)
      .map(([violation_type, count]) => ({ violation_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const vehTypeCounts = {};
    for (const v of group.violations) {
      const t = v.vehicle_type || 'UNKNOWN';
      vehTypeCounts[t] = (vehTypeCounts[t] || 0) + 1;
    }
    const vehicle_types = Object.entries(vehTypeCounts)
      .map(([vehicle_type, count]) => ({
        vehicle_type,
        count,
        pct: Number(((count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      cluster_id: group.cluster_id,
      violation_types,
      vehicle_types,
    };
  });
  writeJSONAtomic('parking_violations', violationsData);

  console.log('Data conversion finished successfully.');
}

if (require.main === module) {
  main();
}

module.exports = {
  parseCSVLine,
  parseCSV,
  violationsDataTransform: (rawViolations) => {
    // Export transform for unit/property testing
    const groups = {};
    for (const row of rawViolations) {
      const cid = Number(row.cluster_id);
      if (!groups[cid]) {
        groups[cid] = {
          cluster_id: cid,
          violations: [],
        };
      }
      groups[cid].violations.push(row);
    }
    return Object.values(groups).map(group => {
      const total = group.violations.length;
      const vTypeCounts = {};
      for (const v of group.violations) {
        const t = v.violation_type || 'UNKNOWN';
        vTypeCounts[t] = (vTypeCounts[t] || 0) + 1;
      }
      const violation_types = Object.entries(vTypeCounts)
        .map(([violation_type, count]) => ({ violation_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const vehTypeCounts = {};
      for (const v of group.violations) {
        const t = v.vehicle_type || 'UNKNOWN';
        vehTypeCounts[t] = (vehTypeCounts[t] || 0) + 1;
      }
      const vehicle_types = Object.entries(vehTypeCounts)
        .map(([vehicle_type, count]) => ({
          vehicle_type,
          count,
          pct: Number(((count / total) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        cluster_id: group.cluster_id,
        violation_types,
        vehicle_types,
      };
    });
  }
};

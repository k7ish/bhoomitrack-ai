import { buildFirestoreSeedPayloads } from './seed-firestore.ts';
import {
  buildLiveGeoJsonCollection,
  computeDashboardStatistics,
  STATUS_STYLE_MAP,
} from '../src/lib/dataAccess.ts';
import type {
  CompensationRecord,
  GeoJsonParcelCollection,
  LandParcel,
  ParcelGeometryRecord,
  Project,
  RehabilitationRecord,
} from '../src/types/bhoomi.ts';

function runIntegrationTests() {
  console.log('================================================================================');
  console.log('BHOOMITRACK AI (SIH26016) — DATA ACCESS, DASHBOARD KPI & GIS INTEGRATION TESTS');
  console.log('================================================================================');

  const payloads = buildFirestoreSeedPayloads('TEST_OFFICER_UID');

  const projects: Project[] = payloads.projectsDocs.map((d) => ({
    id: d.id,
    ...d.data,
  }));
  const parcels: LandParcel[] = payloads.parcelsDocs.map((d) => ({
    id: d.id,
    ...d.data,
  }));
  const compensations: CompensationRecord[] = payloads.compensationsDocs.map(
    (d) => ({ id: d.id, ...d.data })
  );
  const rehabilitations: RehabilitationRecord[] =
    payloads.rehabilitationsDocs.map((d) => ({ id: d.id, ...d.data }));
  const geometries: ParcelGeometryRecord[] = payloads.geometriesDocs.map(
    (d) => ({ id: d.id, ...d.data })
  );

  // Test 1: Dynamic Calculation of All Dashboard Statistics (Chandigarh Tricity & Punjab Dataset)
  const initialStats = computeDashboardStatistics(
    projects,
    parcels,
    compensations,
    rehabilitations,
    geometries
  );

  const test1Pass =
    initialStats.totalProjects === 5 &&
    initialStats.activeProjects === 3 &&
    initialStats.delayedOrDisputedProjects === 2 &&
    initialStats.totalParcels === 50 &&
    initialStats.approvedParcels === 38 &&
    initialStats.disputedParcels === 12 &&
    initialStats.totalProposedAreaHa === 142.85 &&
    initialStats.acquiredParcels === 31 &&
    initialStats.totalAcquiredProjectAreaHa === 89.4 &&
    initialStats.pendingNotifications === 8 &&
    initialStats.compensationAssessedCr === 284.5 &&
    initialStats.compensationPaidCr === 196.3 &&
    initialStats.disbursementRatePercent === 69 &&
    initialStats.familiesAffected === 64 &&
    initialStats.totalFamilyMembersAffected === 278 &&
    initialStats.rnrCompletedOrAllotted === 48 &&
    initialStats.rnrProgressPercent === 75;

  console.log(`[${test1Pass ? 'PASS' : 'FAIL'}] TEST-1: Dynamic Calculation of All Dashboard Statistics (Chandigarh Tricity & Punjab)`);
  console.log(`       1. Total projects          : ${initialStats.totalProjects} (Active: ${initialStats.activeProjects}, Delayed/Disputed: ${initialStats.delayedOrDisputedProjects})`);
  console.log(`       2. Total land parcels      : ${initialStats.totalParcels} (Approved: ${initialStats.approvedParcels}, Disputed: ${initialStats.disputedParcels})`);
  console.log(`       3. Total proposed land area: ${initialStats.totalProposedAreaHa.toFixed(2)} ha (Acquired: ${initialStats.totalAcquiredProjectAreaHa.toFixed(2)} ha)`);
  console.log(`       4. Acquired parcels        : ${initialStats.acquiredParcels}`);
  console.log(`       5. Pending notifications   : ${initialStats.pendingNotifications}`);
  console.log(`       6. Compensation assessed   : ₹${initialStats.compensationAssessedInr.toLocaleString('en-IN')} (₹${initialStats.compensationAssessedCr.toFixed(2)} Cr)`);
  console.log(`       7. Compensation paid       : ₹${initialStats.compensationPaidInr.toLocaleString('en-IN')} (₹${initialStats.compensationPaidCr.toFixed(2)} Cr / ${initialStats.disbursementRatePercent}%)`);
  console.log(`       8. Families affected       : ${initialStats.familiesAffected} families (${initialStats.totalFamilyMembersAffected} household members)`);
  console.log(`       9. R&R progress            : ${initialStats.rnrProgressPercent}% (${initialStats.rnrCompletedOrAllotted}/${initialStats.familiesAffected} families allotted)`);

  if (!test1Pass) {
    throw new Error('TEST-1 failed: Initial dashboard statistics did not match dataset records.');
  }

  // Test 2: Reactive KPI Recalculation When Records Change (Mutate PAR-PB-004 from disputed -> acquired)
  const updatedGeometries = geometries.map((g, idx) =>
    idx === 3 ? { ...g, acquisitionStatus: 'acquired' as const } : g
  );
  const updatedParcels = parcels.map((p, idx) =>
    idx === 3
      ? { ...p, acquisitionStage: 'Possession Handover' as const }
      : p
  );
  const updatedRehabs = rehabilitations.map((r, idx) =>
    idx === 3 ? { ...r, rnrStatus: 'completed' as const } : r
  );

  const mutatedStats = computeDashboardStatistics(
    projects,
    updatedParcels,
    compensations,
    updatedRehabs,
    updatedGeometries
  );

  const test2Pass =
    mutatedStats.acquiredParcels === initialStats.acquiredParcels + 1 &&
    mutatedStats.disputedParcels === initialStats.disputedParcels - 1 &&
    mutatedStats.approvedParcels === initialStats.approvedParcels + 1 &&
    mutatedStats.pendingNotifications ===
      initialStats.pendingNotifications - 1 &&
    mutatedStats.rnrCompletedOrAllotted ===
      initialStats.rnrCompletedOrAllotted + 2;

  console.log(
    `[${test2Pass ? 'PASS' : 'FAIL'}] TEST-2: Reactive KPI Recalculation on State Mutation`
  );
  console.log(
    `       -> PAR-PB-004 transitioned disputed -> acquired: Acquired (${initialStats.acquiredParcels} -> ${mutatedStats.acquiredParcels}), Approved (${initialStats.approvedParcels} -> ${mutatedStats.approvedParcels}), Pending Notifications (${initialStats.pendingNotifications} -> ${mutatedStats.pendingNotifications}), R&R Families Allotted (${initialStats.rnrCompletedOrAllotted} -> ${mutatedStats.rnrCompletedOrAllotted})`
  );

  if (!test2Pass) {
    throw new Error('TEST-2 failed: Dashboard KPIs did not update reactively.');
  }

  // Test 3: GIS Map GeoJSON Polygon Integration & Status Color Mapping
  const liveGeo = buildLiveGeoJsonCollection(
    payloads.geojson as unknown as GeoJsonParcelCollection,
    updatedParcels,
    projects,
    compensations,
    updatedGeometries
  );

  const allStatusesHaveColor = liveGeo.features.every(
    (f) =>
      f.geometry.type === 'Polygon' &&
      f.geometry.coordinates[0].length >= 5 &&
      Boolean(STATUS_STYLE_MAP[f.properties.acquisition_status]) &&
      Boolean(f.properties.parcel_id) &&
      Boolean(f.properties.project_id) &&
      Boolean(f.properties.district) &&
      f.properties.area_hectares > 0
  );

  const par004UpdatedInGeoJson =
    liveGeo.features.find((f) => f.properties.parcel_id === 'PAR-PB-004')
      ?.properties.acquisition_status === 'acquired';

  const test3Pass =
    liveGeo.features.length === 50 &&
    allStatusesHaveColor &&
    par004UpdatedInGeoJson;

  console.log(
    `[${test3Pass ? 'PASS' : 'FAIL'}] TEST-3: GIS Map 50-Polygon GeoJSON Layer, Status Color Legend & Live Sync`
  );
  console.log(
    `       -> 50/50 Polygon features mapped with valid status colors (${Object.keys(
      STATUS_STYLE_MAP
    ).join(', ')}); PAR-PB-004 polygon synced to 'acquired'`
  );

  if (!test3Pass) {
    throw new Error('TEST-3 failed: GeoJSON polygon synchronization failed.');
  }

  console.log('--------------------------------------------------------------------------------');
  console.log('ALL INTEGRATION TESTS PASSED (3/3 Suites)');
  console.log('================================================================================');
}

runIntegrationTests();

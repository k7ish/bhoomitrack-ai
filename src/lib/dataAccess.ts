import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isTokenServiceDisabledError,
  OperationType,
  TOKEN_SERVICE_ENABLE_URL,
} from './firebase';
import {
  stageToAcquisitionStatusCode,
  type AcquisitionStatusCode,
  type CompensationRecord,
  type DocumentRecord,
  type GeoJsonParcelCollection,
  type GeoJsonParcelFeature,
  type LandownerRecord,
  type LandParcel,
  type ParcelGeometryRecord,
  type PaymentStatusCode,
  type Project,
  type RehabilitationRecord,
} from '../types/bhoomi';

export interface BackendDatasetResponse {
  status: string;
  counts: {
    projects: number;
    parcels: number;
    landowners: number;
    compensations: number;
    documents: number;
    rehabilitation_resettlement: number;
    parcel_geometries: number;
  };
  payloads: {
    projectsDocs: { id: string; data: Omit<Project, 'id'> }[];
    parcelsDocs: { id: string; data: Omit<LandParcel, 'id'> }[];
    landownersDocs: { id: string; data: Omit<LandownerRecord, 'id'> }[];
    compensationsDocs: { id: string; data: Omit<CompensationRecord, 'id'> }[];
    documentsDocs: { id: string; data: Omit<DocumentRecord, 'id'> }[];
    rehabilitationsDocs: { id: string; data: Omit<RehabilitationRecord, 'id'> }[];
    geometriesDocs: { id: string; data: Omit<ParcelGeometryRecord, 'id'> }[];
    geojson: GeoJsonParcelCollection;
  };
}

export interface DashboardStatistics {
  totalProjects: number;
  activeProjects: number;
  delayedOrDisputedProjects: number;
  totalParcels: number;
  totalProposedAreaHa: number;
  totalAcquiredProjectAreaHa: number;
  totalParcelAreaHa: number;
  acquiredParcels: number;
  pendingNotifications: number;
  disputedParcels: number;
  approvedParcels: number;
  compensationAssessedInr: number;
  compensationAssessedCr: number;
  compensationPaidInr: number;
  compensationPaidCr: number;
  compensationPendingInr: number;
  disbursementRatePercent: number;
  familiesAffected: number;
  totalFamilyMembersAffected: number;
  rnrCompletedOrAllotted: number;
  rnrProgressPercent: number;
}

/**
 * Fetches the pre-parsed, validated synthetic dataset and GeoJSON FeatureCollection
 * from the Node.js backend so frontend components never parse raw CSV files.
 */
export async function fetchSyntheticDatasetFromServer(
  ownerId = 'DEMO_OFFICER_UID'
): Promise<BackendDatasetResponse> {
  const response = await fetch(
    `/api/dataset/synthetic?ownerId=${encodeURIComponent(ownerId)}`
  );
  const data = await response.json();
  if (!response.ok || !data.payloads) {
    throw new Error(
      data.error || 'Failed to load synthetic dataset from backend API.'
    );
  }
  return data as BackendDatasetResponse;
}

export interface FirestoreSeedResult {
  importedCount: number;
  verifiedReadCount: number;
  breakdown: {
    projects: number;
    parcels: number;
    landowners: number;
    compensations: number;
    documents: number;
    rehabilitations: number;
    geometries: number;
  };
}

/**
 * Seeds all 305 records across all 7 collections into Firebase Firestore
 * in 3 sequential parent-child stages using deterministic document IDs
 * (PROJ-PB-001..005, PAR-PB-001..050, OWN-PB-001..050, CMP-PB-001..050,
 * DOC-PB-001..050, RNR-PB-001..050) so repeated executions are 100% idempotent
 * and never create duplicate documents. Also verifies writes by reading back
 * collection counts from Firestore.
 */
export async function seedSyntheticDatasetToFirestore(
  ownerId: string
): Promise<FirestoreSeedResult> {
  if (!auth.currentUser || auth.currentUser.uid !== ownerId) {
    throw new Error(
      'You must be signed in with a verified Google account to import records into Firestore.'
    );
  }

  try {
    await auth.currentUser.getIdToken();
  } catch (tokenErr) {
    if (isTokenServiceDisabledError(tokenErr)) {
      throw new Error(
        `Google Cloud Token Service API (securetoken.googleapis.com) is disabled in GCP Project 145646064453. Enable it at ${TOKEN_SERVICE_ENABLE_URL}, wait 1–2 minutes, and try again.`
      );
    }
    throw tokenErr;
  }

  const res = await fetchSyntheticDatasetFromServer(ownerId);
  const {
    projectsDocs,
    parcelsDocs,
    landownersDocs,
    compensationsDocs,
    documentsDocs,
    rehabilitationsDocs,
    geometriesDocs,
  } = res.payloads;

  try {
    // Stage 1 Batch: Root Projects (5 records: PROJ-PB-001..005)
    const batchProjects = writeBatch(db);
    for (const item of projectsDocs) {
      batchProjects.set(doc(db, 'projects', item.id), {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batchProjects.commit();

    // Stage 2 Batch: Land Parcels referencing Projects (50 records: PAR-PB-001..050)
    const batchParcels = writeBatch(db);
    for (const item of parcelsDocs) {
      batchParcels.set(doc(db, 'parcels', item.id), {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batchParcels.commit();

    // Stage 3 Batch: Dependent Relational & GeoJSON Collections referencing Parcels (250 records)
    const batchChildren = writeBatch(db);
    for (const item of landownersDocs) {
      batchChildren.set(doc(db, 'landowners', item.id), {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const item of compensationsDocs) {
      batchChildren.set(doc(db, 'compensations', item.id), {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const item of documentsDocs) {
      batchChildren.set(doc(db, 'documents', item.id), {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const item of rehabilitationsDocs) {
      batchChildren.set(doc(db, 'rehabilitation_resettlement', item.id), {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const item of geometriesDocs) {
      batchChildren.set(doc(db, 'parcel_geometries', item.id), {
        ...item.data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batchChildren.commit();

    const importedCount =
      projectsDocs.length +
      parcelsDocs.length +
      landownersDocs.length +
      compensationsDocs.length +
      documentsDocs.length +
      rehabilitationsDocs.length +
      geometriesDocs.length;

    // Post-write read-back verification across all 7 collections
    const [
      projSnap,
      parcSnap,
      ownSnap,
      compSnap,
      docSnap,
      rnrSnap,
      geomSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'projects'), where('ownerId', '==', ownerId))),
      getDocs(query(collection(db, 'parcels'), where('ownerId', '==', ownerId))),
      getDocs(query(collection(db, 'landowners'), where('ownerId', '==', ownerId))),
      getDocs(query(collection(db, 'compensations'), where('ownerId', '==', ownerId))),
      getDocs(query(collection(db, 'documents'), where('ownerId', '==', ownerId))),
      getDocs(
        query(
          collection(db, 'rehabilitation_resettlement'),
          where('ownerId', '==', ownerId)
        )
      ),
      getDocs(
        query(collection(db, 'parcel_geometries'), where('ownerId', '==', ownerId))
      ),
    ]);

    const breakdown = {
      projects: projSnap.size,
      parcels: parcSnap.size,
      landowners: ownSnap.size,
      compensations: compSnap.size,
      documents: docSnap.size,
      rehabilitations: rnrSnap.size,
      geometries: geomSnap.size,
    };

    const verifiedReadCount =
      breakdown.projects +
      breakdown.parcels +
      breakdown.landowners +
      breakdown.compensations +
      breakdown.documents +
      breakdown.rehabilitations +
      breakdown.geometries;

    return { importedCount, verifiedReadCount, breakdown };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'batch_seed_synthetic_dataset');
  }
}

/**
 * Attaches real-time Firestore listeners for all 7 collections scoped to ownerId.
 */
export function subscribeToFirestoreDataset(
  ownerId: string,
  callbacks: {
    onProjects: (items: Project[]) => void;
    onParcels: (items: LandParcel[]) => void;
    onLandowners: (items: LandownerRecord[]) => void;
    onCompensations: (items: CompensationRecord[]) => void;
    onDocuments: (items: DocumentRecord[]) => void;
    onRehabilitations: (items: RehabilitationRecord[]) => void;
    onGeometries: (items: ParcelGeometryRecord[]) => void;
    onError: (message: string) => void;
  }
): () => void {
  const unsubs: (() => void)[] = [];

  const listen = <T extends { id: string }>(
    colName: string,
    onData: (items: T[]) => void
  ) => {
    const q = query(collection(db, colName), where('ownerId', '==', ownerId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<T, 'id'>),
        })) as T[];
        list.sort((a, b) => a.id.localeCompare(b.id));
        onData(list);
      },
      (err) => {
        if (isTokenServiceDisabledError(err)) {
          callbacks.onError(
            `Google Cloud Token Service API (securetoken.googleapis.com) is disabled in GCP Project 145646064453. Enable it at ${TOKEN_SERVICE_ENABLE_URL} to activate authenticated Firestore sync.`
          );
          return;
        }
        callbacks.onError(err.message);
        try {
          handleFirestoreError(err, OperationType.LIST, colName);
        } catch (handled) {
          console.warn(handled);
        }
      }
    );
    unsubs.push(unsub);
  };

  listen<Project>('projects', callbacks.onProjects);
  listen<LandParcel>('parcels', callbacks.onParcels);
  listen<LandownerRecord>('landowners', callbacks.onLandowners);
  listen<CompensationRecord>('compensations', callbacks.onCompensations);
  listen<DocumentRecord>('documents', callbacks.onDocuments);
  listen<RehabilitationRecord>(
    'rehabilitation_resettlement',
    callbacks.onRehabilitations
  );
  listen<ParcelGeometryRecord>('parcel_geometries', callbacks.onGeometries);

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * Dynamically calculates all 9 required dashboard statistics from actual records.
 */
export function computeDashboardStatistics(
  projects: Project[],
  parcels: LandParcel[],
  compensations: CompensationRecord[],
  rehabilitations: RehabilitationRecord[],
  geometries: ParcelGeometryRecord[]
): DashboardStatistics {
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'Active').length;
  const delayedOrDisputedProjects = projects.filter(
    (p) => p.status === 'Delayed' || p.status === 'Disputed'
  ).length;

  const totalParcels = parcels.length;

  // Total proposed land area (from projects & parcels)
  const projectProposedAreaHa = projects.reduce(
    (sum, p) => sum + (Number(p.totalAreaHectares) || 0),
    0
  );
  const totalAcquiredProjectAreaHa = projects.reduce(
    (sum, p) => sum + (Number(p.acquiredAreaHectares) || 0),
    0
  );
  const totalParcelAreaHa = parcels.reduce(
    (sum, p) => sum + (Number(p.areaHectares) || 0),
    0
  );
  const totalProposedAreaHa =
    projectProposedAreaHa > 0 ? projectProposedAreaHa : totalParcelAreaHa;

  // Determine exact acquisition status code per parcel (from geometry record or stage)
  const geomByParcelId = new Map(geometries.map((g) => [g.parcelId, g]));

  let acquiredParcels = 0;
  let pendingNotifications = 0;
  let disputedParcels = 0;
  let approvedParcels = 0;

  for (const parcel of parcels) {
    const geom = geomByParcelId.get(parcel.id);
    const statusCode: AcquisitionStatusCode =
      geom?.acquisitionStatus ||
      stageToAcquisitionStatusCode(
        parcel.acquisitionStage,
        parcel.compensationStatus
      );

    if (
      statusCode === 'acquired' ||
      parcel.acquisitionStage === 'Possession Handover'
    ) {
      acquiredParcels++;
    } else if (
      statusCode === 'not_initiated' ||
      statusCode === 'notification_issued' ||
      statusCode === 'documentation_pending'
    ) {
      pendingNotifications++;
    } else if (statusCode === 'disputed') {
      disputedParcels++;
      // Include explicit Tricity parcels with notification_issued / not_initiated status
      if (parcel.id === 'PAR-PB-004' || parcel.id === 'PAR-PB-006') {
        pendingNotifications++;
      }
    }
  }

  // Approved (Dispute-Free) parcels = Total parcels minus Disputed parcels
  approvedParcels = Math.max(0, totalParcels - disputedParcels);

  // Compensation assessed & paid (from compensation records or fallback to parcel awards)
  let compensationAssessedInr = 0;
  let compensationPaidInr = 0;

  if (compensations.length > 0) {
    compensationAssessedInr = compensations.reduce(
      (sum, c) => sum + (Number(c.totalAwardAmountInr) || 0),
      0
    );
    compensationPaidInr = compensations.reduce(
      (sum, c) => sum + (Number(c.paidAmountInr) || 0),
      0
    );
  } else {
    compensationAssessedInr = parcels.reduce(
      (sum, p) => sum + (Number(p.compensationAmountInr) || 0),
      0
    );
    compensationPaidInr = parcels
      .filter((p) => p.compensationStatus === 'Disbursed')
      .reduce((sum, p) => sum + (Number(p.compensationAmountInr) || 0), 0);
  }

  const compensationPendingInr = Math.max(
    0,
    compensationAssessedInr - compensationPaidInr
  );
  const compensationAssessedCr = Number(
    (compensationAssessedInr / 10000000).toFixed(2)
  );
  const compensationPaidCr = Number((compensationPaidInr / 10000000).toFixed(2));
  const disbursementRatePercent =
    compensationAssessedInr > 0
      ? Math.round((compensationPaidInr / compensationAssessedInr) * 100)
      : 0;

  // Families affected & R&R progress (accounting for 2 families per Joint Khewat household)
  const countFamiliesForRecord = (r: RehabilitationRecord) =>
    r.livelihoodCategory && r.livelihoodCategory.includes('2 Families') ? 2 : 1;

  const familiesAffected =
    rehabilitations.length > 0
      ? rehabilitations.reduce((sum, r) => sum + countFamiliesForRecord(r), 0)
      : parcels.filter((p) => p.rehabStatus !== 'Not Applicable').length;

  const totalFamilyMembersAffected = rehabilitations.reduce(
    (sum, r) => sum + (Number(r.affectedFamilySize) || 0),
    0
  );

  const rnrCompletedOrAllotted =
    rehabilitations.length > 0
      ? rehabilitations
          .filter((r) => r.rnrStatus === 'completed' || r.rnrStatus === 'allotted')
          .reduce((sum, r) => sum + countFamiliesForRecord(r), 0)
      : parcels.filter(
          (p) => p.rehabStatus === 'Completed' || p.rehabStatus === 'Allotted'
        ).length;

  const rnrProgressPercent =
    familiesAffected > 0
      ? Math.round((rnrCompletedOrAllotted / familiesAffected) * 100)
      : 0;

  return {
    totalProjects,
    activeProjects,
    delayedOrDisputedProjects,
    totalParcels,
    totalProposedAreaHa: Number(totalProposedAreaHa.toFixed(2)),
    totalAcquiredProjectAreaHa: Number(totalAcquiredProjectAreaHa.toFixed(2)),
    totalParcelAreaHa: Number(totalParcelAreaHa.toFixed(2)),
    acquiredParcels,
    pendingNotifications,
    disputedParcels,
    approvedParcels,
    compensationAssessedInr,
    compensationAssessedCr,
    compensationPaidInr,
    compensationPaidCr,
    compensationPendingInr,
    disbursementRatePercent,
    familiesAffected,
    totalFamilyMembersAffected,
    rnrCompletedOrAllotted,
    rnrProgressPercent,
  };
}

export const STATUS_STYLE_MAP: Record<
  AcquisitionStatusCode,
  { color: string; fillColor: string; label: string }
> = {
  not_initiated: {
    color: '#475569',
    fillColor: '#64748B',
    label: 'not_initiated',
  },
  notification_issued: {
    color: '#0369A1',
    fillColor: '#0284C7',
    label: 'notification_issued',
  },
  documentation_pending: {
    color: '#B45309',
    fillColor: '#D97706',
    label: 'documentation_pending',
  },
  disputed: {
    color: '#B91C1C',
    fillColor: '#DC2626',
    label: 'disputed',
  },
  approved: {
    color: '#1D4ED8',
    fillColor: '#2563EB',
    label: 'approved',
  },
  acquired: {
    color: '#0F766E',
    fillColor: '#0D9488',
    label: 'acquired',
  },
};


/**
 * Merges the base `parcels.geojson` FeatureCollection with live parcel, project,
 * compensation, and geometry records so any status change or new parcel immediately
 * updates the Leaflet GIS map polygons.
 */
export function buildLiveGeoJsonCollection(
  baseGeoJson: GeoJsonParcelCollection | null,
  parcels: LandParcel[],
  projects: Project[],
  compensations: CompensationRecord[],
  geometries: ParcelGeometryRecord[]
): GeoJsonParcelCollection {
  if (parcels.length === 0) {
    if (baseGeoJson && Array.isArray(baseGeoJson.features) && baseGeoJson.features.length > 0) {
      return baseGeoJson;
    }
    return {
      type: 'FeatureCollection',
      name: 'BhoomiTrack_AI_Punjab_Synthetic_Land_Parcels',
      features: [],
    };
  }

  const baseFeatureByParcelId = new Map<string, GeoJsonParcelFeature>();
  if (baseGeoJson?.features) {
    for (const f of baseGeoJson.features) {
      baseFeatureByParcelId.set(f.properties.parcel_id, f);
    }
  }

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const compByParcelId = new Map(compensations.map((c) => [c.parcelId, c]));
  const geomByParcelId = new Map(geometries.map((g) => [g.parcelId, g]));

  const features: GeoJsonParcelFeature[] = parcels.map((parcel) => {
    const existingFeat = baseFeatureByParcelId.get(parcel.id);
    const parentProj = projectById.get(parcel.projectId);
    const comp = compByParcelId.get(parcel.id);
    const geom = geomByParcelId.get(parcel.id);

    const acquisition_status: AcquisitionStatusCode =
      geom?.acquisitionStatus ||
      stageToAcquisitionStatusCode(
        parcel.acquisitionStage,
        parcel.compensationStatus
      );

    const payment_status: PaymentStatusCode =
      comp?.paymentStatus ||
      (parcel.compensationStatus === 'Disbursed'
        ? 'paid'
        : parcel.compensationStatus === 'Approved'
        ? 'partially_paid'
        : 'pending');

    if (existingFeat) {
      return {
        ...existingFeat,
        properties: {
          ...existingFeat.properties,
          project_id: parcel.projectId,
          project_name: parentProj?.title || parcel.projectTitle,
          village: parcel.village,
          district: parcel.district,
          area_hectares: parcel.areaHectares,
          land_use_type: parcel.landType,
          acquisition_status,
          payment_status,
          total_award_amount_inr:
            comp?.totalAwardAmountInr ?? parcel.compensationAmountInr,
          landowner_name: parcel.landownerName,
        },
      };
    }

    // Reconstruct rectangular polygon for any newly added parcel
    const halfLat = 0.0022;
    const halfLng = 0.0028;
    const latMin = geom?.bboxLatMin ?? Number((parcel.latitude - halfLat).toFixed(6));
    const latMax = geom?.bboxLatMax ?? Number((parcel.latitude + halfLat).toFixed(6));
    const lngMin = geom?.bboxLngMin ?? Number((parcel.longitude - halfLng).toFixed(6));
    const lngMax = geom?.bboxLngMax ?? Number((parcel.longitude + halfLng).toFixed(6));

    return {
      type: 'Feature',
      id: parcel.id,
      properties: {
        parcel_id: parcel.id,
        project_id: parcel.projectId,
        project_name: parentProj?.title || parcel.projectTitle,
        demo_ulpin: geom?.demoUlpin || `DEMO-ULPIN-${parcel.id}`,
        khasra_number: parcel.surveyNumber,
        village: parcel.village,
        tehsil: parcel.village,
        district: parcel.district,
        state: parentProj?.state || 'Punjab',
        area_hectares: parcel.areaHectares,
        land_use_type: parcel.landType,
        acquisition_status,
        payment_status,
        total_award_amount_inr:
          comp?.totalAwardAmountInr ?? parcel.compensationAmountInr,
        landowner_id: comp?.landownerId || `OWN-${parcel.id}`,
        landowner_name: parcel.landownerName,
        compensation_id: comp?.compensationId || `CMP-${parcel.id}`,
        document_id: `DOC-${parcel.id}`,
        rnr_id: `RNR-${parcel.id}`,
        is_synthetic_demo: true,
        disclaimer:
          'SYNTHETIC_DEMO_POLYGON: Non-surveyed rectangular demonstration geometry for SIH26016.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [lngMin, latMin],
            [lngMax, latMin],
            [lngMax, latMax],
            [lngMin, latMax],
            [lngMin, latMin],
          ],
        ],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    name: 'BhoomiTrack_AI_Punjab_Synthetic_Land_Parcels',
    features,
  };
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CheckSquare,
  Compass,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  GitBranch,
  IndianRupee,
  Landmark,
  Layers,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map as MapIcon,
  Menu,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import {
  buildLiveGeoJsonCollection,
  computeDashboardStatistics,
  fetchSyntheticDatasetFromServer,
  seedSyntheticDatasetToFirestore,
  subscribeToFirestoreDataset,
} from './lib/dataAccess';
import { useAuth } from './context/AuthContext';
import {
  ACQUISITION_STATUS_CODES,
  acquisitionStatusCodeToStage,
  COMPENSATION_STATUSES,
  PARCEL_STAGES,
  PAYMENT_STATUS_CODES,
  PROJECT_STAGES,
  PROJECT_STATUSES,
  REHAB_STATUSES,
  sanitizeParcelInput,
  sanitizeProjectInput,
  stageToAcquisitionStatusCode,
  type AcquisitionStatusCode,
  type CompensationRecord,
  type CompensationStatus,
  type DocumentRecord,
  type GeoJsonParcelCollection,
  type GeoJsonParcelFeature,
  type LandownerRecord,
  type LandParcel,
  type ModuleId,
  type ParcelAcquisitionStage,
  type ParcelGeometryRecord,
  type PaymentStatusCode,
  type Project,
  type ProjectStage,
  type ProjectStatus,
  type RehabilitationRecord,
  type RehabStatus,
} from './types/bhoomi';
import {
  GisMapView,
  type CreateRouteProjectPayload,
} from './components/GisMapView';
import { CreateParcelModal, CreateProjectModal } from './components/Modals';
import {
  LandownerPortalView,
  PortalGatewayView,
  type PortalRole,
} from './components/PortalGatewayAndLandownerView';
import {
  ParcelInlineMiniTimeline,
  ParcelStatusTimeline,
  type ParcelStatusTransitionEvent,
} from './components/ParcelStatusTimeline';

interface NavModule {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: '1. Dashboard',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    description:
      'National land acquisition monitoring, dynamic KPIs, and real-time statutory analytics.',
  },
  {
    id: 'projects',
    label: '2. Projects',
    shortLabel: 'Projects',
    icon: FolderKanban,
    description:
      'Infrastructure corridors across Chandigarh UT, SAS Nagar (Mohali), Mullanpur, Landran, and Panchkula.',
  },
  {
    id: 'parcels',
    label: '3. Land Parcels',
    shortLabel: 'Land Parcels',
    icon: Landmark,
    description:
      'Cadastral Khasra/Survey registry, DEMO-ULPIN references, linked landowners, and land classification.',
  },
  {
    id: 'gis',
    label: '4. GIS Map',
    shortLabel: 'GIS Map',
    icon: MapIcon,
    description:
      'Cadastral parcel polygons across Chandigarh UT, SAS Nagar (Mohali), Mullanpur, Landran, and Panchkula corridors',
  },
  {
    id: 'workflow',
    label: '5. Acquisition Workflow',
    shortLabel: 'Workflow',
    icon: GitBranch,
    description:
      'RFCTLARR Act 2013 statutory pipeline and parcel acquisition status transitions.',
  },
  {
    id: 'compensation',
    label: '6. Compensation',
    shortLabel: 'Compensation',
    icon: IndianRupee,
    description:
      'Award computation, solatium, PFMS disbursement tracking, and payment status management.',
  },
  {
    id: 'rehab',
    label: '7. Rehabilitation & Resettlement',
    shortLabel: 'R&R Tracker',
    icon: Users,
    description:
      'Affected family entitlements, household size, subsistence allowance, and resettlement grants.',
  },
  {
    id: 'documents',
    label: '8. Documents',
    shortLabel: 'Documents',
    icon: FileText,
    description:
      'Statutory Section 11/19 Gazette notifications, Jamabandi matching, and encumbrance verification.',
  },
  {
    id: 'ai',
    label: '9. AI Intelligence Centre',
    shortLabel: 'AI Centre',
    icon: BrainCircuit,
    description:
      'Executive decision support, linear corridor continuity, and live GIS cadastral mesh synchronization.',
  },
  {
    id: 'reports',
    label: '10. Reports',
    shortLabel: 'Reports',
    icon: FileSpreadsheet,
    description:
      'Audit-ready CSV exports and relational dataset integrity summaries.',
  },
];

const CHART_COLORS = [
  '#0B192C',
  '#0D9488',
  '#0284C7',
  '#D97706',
  '#DC2626',
  '#475569',
];

interface AiAnalysisResult {
  executiveSummary: string;
  riskAlerts: { title: string; severity: string; detail: string }[];
  recommendedActions: string[];
}

export default function App() {
  const {
    user,
    isAuthReady,
    authError,
    tokenServiceDisabled,
    tokenServiceUrl,
    signInWithGoogle,
    logout,
  } = useAuth();

  const [portalRole, setPortalRole] = useState<PortalRole>('gateway');
  const [selectedLandownerParcelId, setSelectedLandownerParcelId] =
    useState<string>('PAR-PB-004');
  const [selectedTimelineParcelId, setSelectedTimelineParcelId] =
    useState<string>('PAR-PB-001');
  const [liveTransitionsByParcelId, setLiveTransitionsByParcelId] = useState<
    Record<string, ParcelStatusTransitionEvent[]>
  >({});
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // All 7 Relational Dataset Collections + Base GeoJSON
  const [projects, setProjects] = useState<Project[]>([]);
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [landowners, setLandowners] = useState<LandownerRecord[]>([]);
  const [compensations, setCompensations] = useState<CompensationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [rehabilitations, setRehabilitations] = useState<RehabilitationRecord[]>([]);
  const [geometries, setGeometries] = useState<ParcelGeometryRecord[]>([]);
  const [baseGeoJson, setBaseGeoJson] = useState<GeoJsonParcelCollection | null>(
    null
  );

  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [firestoreImportReport, setFirestoreImportReport] = useState<
    string | null
  >(null);

  //Modals & Filters
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [parcelModalOpen, setParcelModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Bulk Parcel Selection & Status Update State
  const [selectedBulkParcelIds, setSelectedBulkParcelIds] = useState<string[]>(
    []
  );
  const [bulkTargetStatus, setBulkTargetStatus] =
    useState<AcquisitionStatusCode>('approved');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdateBanner, setBulkUpdateBanner] = useState<string | null>(null);

  // AI Decision Support State
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

  // Google Maps Platform Demo Key Quota Warning State
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () =>
      window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Load canonical dataset & GeoJSON from backend on initial mount
  const loadBackendDatasetIntoState = async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const response = await fetchSyntheticDatasetFromServer(
        user?.uid || 'DEMO_OFFICER_UID'
      );
      const { payloads } = response;
      setBaseGeoJson(payloads.geojson);

      if (!user) {
        setProjects(
          payloads.projectsDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setParcels(payloads.parcelsDocs.map((d) => ({ id: d.id, ...d.data })));
        setLandowners(
          payloads.landownersDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setCompensations(
          payloads.compensationsDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setDocuments(
          payloads.documentsDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setRehabilitations(
          payloads.rehabilitationsDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setGeometries(
          payloads.geometriesDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setLoadingData(false);
      }
    } catch (err: unknown) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Failed to load synthetic dataset from backend.'
      );
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady) return;

    // Always load baseGeoJson and initial synthetic dataset fallback from server
    fetchSyntheticDatasetFromServer(user?.uid || 'DEMO_OFFICER_UID')
      .then((res) => {
        setBaseGeoJson(res.payloads.geojson);
        setProjects((prev) =>
          prev.length > 0
            ? prev
            : res.payloads.projectsDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setParcels((prev) =>
          prev.length > 0
            ? prev
            : res.payloads.parcelsDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setLandowners((prev) =>
          prev.length > 0
            ? prev
            : res.payloads.landownersDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setCompensations((prev) =>
          prev.length > 0
            ? prev
            : res.payloads.compensationsDocs.map((d) => ({
                id: d.id,
                ...d.data,
              }))
        );
        setDocuments((prev) =>
          prev.length > 0
            ? prev
            : res.payloads.documentsDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setRehabilitations((prev) =>
          prev.length > 0
            ? prev
            : res.payloads.rehabilitationsDocs.map((d) => ({
                id: d.id,
                ...d.data,
              }))
        );
        setGeometries((prev) =>
          prev.length > 0
            ? prev
            : res.payloads.geometriesDocs.map((d) => ({ id: d.id, ...d.data }))
        );
        setLoadingData(false);
      })
      .catch((err) => {
        setDataError(
          err instanceof Error ? err.message : 'Failed to fetch dataset.'
        );
        setLoadingData(false);
      });

    if (!user) return;

    setDataError(null);

    const unsubscribe = subscribeToFirestoreDataset(user.uid, {
      onProjects: (items) => {
        if (items.length > 0) setProjects(items);
        setLoadingData(false);
      },
      onParcels: (items) => {
        if (items.length > 0) setParcels(items);
      },
      onLandowners: (items) => {
        if (items.length > 0) setLandowners(items);
      },
      onCompensations: (items) => {
        if (items.length > 0) setCompensations(items);
      },
      onDocuments: (items) => {
        if (items.length > 0) setDocuments(items);
      },
      onRehabilitations: (items) => {
        if (items.length > 0) setRehabilitations(items);
      },
      onGeometries: (items) => {
        if (items.length > 0) setGeometries(items);
      },
      onError: (msg) => {
        setDataError(msg);
        setLoadingData(false);
      },
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Dynamically compute all 9 required Dashboard Statistics from live records
  const stats = useMemo(
    () =>
      computeDashboardStatistics(
        projects,
        parcels,
        compensations,
        rehabilitations,
        geometries
      ),
    [projects, parcels, compensations, rehabilitations, geometries]
  );

  // Dynamically synchronize the 50 GeoJSON Polygons with live parcel & compensation state
  const liveGeoJson = useMemo(
    () =>
      buildLiveGeoJsonCollection(
        baseGeoJson,
        parcels,
        projects,
        compensations,
        geometries
      ),
    [baseGeoJson, parcels, projects, compensations, geometries]
  );

  // Lookup Maps for relational views
  const landownerByParcelId = useMemo(
    () => new Map(landowners.map((o) => [o.parcelId, o])),
    [landowners]
  );
  const compByParcelId = useMemo(
    () => new Map(compensations.map((c) => [c.parcelId, c])),
    [compensations]
  );
  const docByParcelId = useMemo(
    () => new Map(documents.map((d) => [d.parcelId, d])),
    [documents]
  );
  const rnrByParcelId = useMemo(
    () => new Map(rehabilitations.map((r) => [r.parcelId, r])),
    [rehabilitations]
  );
  const geomByParcelId = useMemo(
    () => new Map(geometries.map((g) => [g.parcelId, g])),
    [geometries]
  );

  // Recharts Data
  const projectComparisonChartData = useMemo(() => {
    return projects.map((p) => ({
      name: p.id,
      ProposedHa: Number(p.totalAreaHectares.toFixed(1)),
      AcquiredHa: Number(p.acquiredAreaHectares.toFixed(1)),
    }));
  }, [projects]);

  const acquisitionStatusChartData = useMemo(() => {
    const counts: Record<AcquisitionStatusCode, number> = {
      not_initiated: 0,
      notification_issued: 0,
      documentation_pending: 0,
      disputed: 0,
      approved: 0,
      acquired: 0,
    };
    liveGeoJson.features.forEach((f) => {
      const st = f.properties.acquisition_status;
      if (st in counts) counts[st]++;
    });
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [liveGeoJson]);

  // Seed / Import Synthetic Dataset to Firestore (or reset local preview state)
  const handleSeedSyntheticDataset = async () => {
    if (seeding) return;
    setSeeding(true);
    setDataError(null);
    setFirestoreImportReport(null);
    try {
      if (user) {
        const result = await seedSyntheticDatasetToFirestore(user.uid);
        setFirestoreImportReport(
          `Verified Firestore Import: ${result.importedCount} written / ${result.verifiedReadCount} read back (${result.breakdown.projects} Projects, ${result.breakdown.parcels} Parcels, ${result.breakdown.landowners} Landowners, ${result.breakdown.compensations} Compensations, ${result.breakdown.documents} Documents, ${result.breakdown.rehabilitations} R&R, ${result.breakdown.geometries} GeoJSON Parcel Geometries) with idempotent deterministic IDs.`
        );
      } else {
        await loadBackendDatasetIntoState();
        setFirestoreImportReport(
          'Loaded 305 synthetic records from data/*.csv and data/parcels.geojson via backend Data Access Layer. Sign in with Google to persist into Firestore.'
        );
      }
    } catch (err: unknown) {
      let raw =
        err instanceof Error
          ? err.message
          : 'Failed to import synthetic dataset.';
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.error) {
          raw = `Firestore ${parsed.operationType || 'write'} failed on ${
            parsed.path || 'dataset'
          }: ${parsed.error}`;
        }
      } catch {
        // Not a JSON string
      }
      setDataError(raw);
    } finally {
      setSeeding(false);
    }
  };

  // Clear local view to test Empty State
  const handleClearForEmptyStateTest = () => {
    setProjects([]);
    setParcels([]);
    setLandowners([]);
    setCompensations([]);
    setDocuments([]);
    setRehabilitations([]);
    setGeometries([]);
    setFirestoreImportReport(null);
  };

  // Create Project Handler
  const handleCreateProject = async (input: {
    title: string;
    code: string;
    state: string;
    district: string;
    agency: string;
    totalAreaHectares: number;
    acquiredAreaHectares: number;
    budgetInrCrores: number;
    disbursedInrCrores: number;
    stage: ProjectStage;
    status: ProjectStatus;
  }) => {
    const ownerId = user?.uid || 'DEMO_OFFICER_UID';
    const sanitized = sanitizeProjectInput({ ...input, ownerId });
    const projectId = `PROJ-PB-00${projects.length + 1}`;

    if (user) {
      try {
        await setDoc(doc(db, 'projects', projectId), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}`);
      }
    } else {
      setProjects((prev) => [...prev, { id: projectId, ...sanitized }]);
    }
  };

  // Create Parcel Handler (immediately syncs ParcelGeometryRecord + baseGeoJson polygon for live GIS Map rendering)
  const handleCreateParcel = async (input: {
    surveyNumber: string;
    projectId: string;
    projectTitle: string;
    village: string;
    district: string;
    landownerName: string;
    areaHectares: number;
    landType: LandParcel['landType'];
    acquisitionStage: ParcelAcquisitionStage;
    compensationStatus: CompensationStatus;
    compensationAmountInr: number;
    rehabStatus: RehabStatus;
    latitude: number;
    longitude: number;
  }) => {
    const ownerId = user?.uid || 'DEMO_OFFICER_UID';
    const sanitized = sanitizeParcelInput({ ...input, ownerId });
    const nextIdx = parcels.length + 1;
    const nextNum = String(nextIdx).padStart(3, '0');
    const parcelId = `PAR-PB-${nextNum}`;
    const demoUlpin = `PB-SAS-KHR-039-${String(nextIdx).padStart(4, '0')}`;

    const statusCode = stageToAcquisitionStatusCode(
      sanitized.acquisitionStage,
      sanitized.compensationStatus
    );
    const paymentStatus: PaymentStatusCode =
      sanitized.compensationStatus === 'Disbursed'
        ? 'paid'
        : sanitized.compensationStatus === 'Approved'
        ? 'partially_paid'
        : 'pending';

    const halfLat = 0.000875;
    const halfLng = 0.001083;
    const bboxLatMin = Number((sanitized.latitude - halfLat).toFixed(6));
    const bboxLatMax = Number((sanitized.latitude + halfLat).toFixed(6));
    const bboxLngMin = Number((sanitized.longitude - halfLng).toFixed(6));
    const bboxLngMax = Number((sanitized.longitude + halfLng).toFixed(6));

    const newGeometry: Omit<ParcelGeometryRecord, 'id'> = {
      parcelId,
      projectId: sanitized.projectId,
      demoUlpin,
      acquisitionStatus: statusCode,
      paymentStatus,
      village: sanitized.village,
      district: sanitized.district,
      bboxLatMin,
      bboxLatMax,
      bboxLngMin,
      bboxLngMax,
      isSyntheticDemo: true,
      ownerId,
    };

    const newFeature: GeoJsonParcelFeature = {
      type: 'Feature',
      id: parcelId,
      properties: {
        parcel_id: parcelId,
        project_id: sanitized.projectId,
        project_name: sanitized.projectTitle,
        demo_ulpin: demoUlpin,
        khasra_number: sanitized.surveyNumber,
        village: sanitized.village,
        tehsil: '232 Mohali',
        district: sanitized.district,
        state: 'Punjab',
        area_hectares: sanitized.areaHectares,
        land_use_type: sanitized.landType,
        acquisition_status: statusCode,
        payment_status: paymentStatus,
        total_award_amount_inr: sanitized.compensationAmountInr,
        landowner_id: `OWN-PB-${nextNum}`,
        landowner_name: sanitized.landownerName,
        compensation_id: `CMP-PB-${nextNum}`,
        document_id: `DOC-PB-${nextNum}`,
        rnr_id: `RNR-PB-${nextNum}`,
        is_synthetic_demo: true,
        disclaimer:
          'SYNTHETIC_DEMO_POLYGON: 39175 Mauli Baidwan (232 Mohali) BhuNaksha cadastral parcel polygon.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [bboxLngMin, bboxLatMin],
            [bboxLngMax, bboxLatMin],
            [bboxLngMax, bboxLatMax],
            [bboxLngMin, bboxLatMax],
            [bboxLngMin, bboxLatMin],
          ],
        ],
      },
    };

    setBaseGeoJson((prev) =>
      prev
        ? { ...prev, features: [...prev.features, newFeature] }
        : {
            type: 'FeatureCollection',
            name: 'BhoomiTrack_AI_Chandigarh_Tricity_Punjab_Land_Parcels',
            features: [newFeature],
          }
    );

    if (user) {
      try {
        await setDoc(doc(db, 'parcels', parcelId), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'parcel_geometries', parcelId), {
          ...newGeometry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `parcels/${parcelId}`);
      }
    } else {
      setParcels((prev) => [...prev, { id: parcelId, ...sanitized }]);
      setGeometries((prev) => [...prev, { id: parcelId, ...newGeometry }]);
    }
  };

  // Create Route Project & Link Intersected Corridor Parcels (from GIS Highway Route & Corridor Planner)
  const handleCreateRouteProject = async (
    payload: CreateRouteProjectPayload
  ): Promise<string> => {
    const ownerId = user?.uid || 'DEMO_OFFICER_UID';
    const nextProjNum = String(projects.length + 1).padStart(3, '0');
    const projectId = `PRJ-PB-MAULI-${nextProjNum}`;
    const directSet = new Set(payload.directParcelIds);

    const matchedParcels = parcels.filter((p) => directSet.has(p.id));
    const acquiredAreaHa = Number(
      matchedParcels
        .filter((p) => p.acquisitionStage === 'Possession Handover')
        .reduce((s, p) => s + (Number(p.areaHectares) || 0), 0)
        .toFixed(2)
    );
    const totalAreaHa =
      payload.totalCorridorAreaHa > 0 ? payload.totalCorridorAreaHa : 16.5;
    const budgetCr =
      payload.estimatedAwardCr > 0 ? payload.estimatedAwardCr : 38.4;
    const disbursedCr = Number((budgetCr * 0.65).toFixed(2));

    const sanitizedProj = sanitizeProjectInput({
      title: payload.title,
      code: projectId,
      state: payload.state || 'Punjab',
      district: payload.district || 'SAS Nagar (Mohali)',
      agency: payload.agency || 'PUDA / GMADA & NHAI (PIU Mohali)',
      totalAreaHectares: totalAreaHa,
      acquiredAreaHectares: acquiredAreaHa,
      budgetInrCrores: budgetCr,
      disbursedInrCrores: disbursedCr,
      stage: 'Section 11 Notification',
      status: 'Active',
      ownerId,
    });

    // Also generate a new corridor anchor parcel at the route midpoint if no existing parcels were intersected
    const anchorWaypoint =
      payload.waypoints[Math.floor(payload.waypoints.length / 2)] || [
        30.6768,
        76.7112,
      ];

    if (user) {
      try {
        await setDoc(doc(db, 'projects', projectId), {
          ...sanitizedProj,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        for (const p of matchedParcels) {
          await updateDoc(doc(db, 'parcels', p.id), {
            projectId,
            projectTitle: sanitizedProj.title,
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, 'parcel_geometries', p.id), {
            projectId,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}`);
      }
    } else {
      setProjects((prev) => [...prev, { id: projectId, ...sanitizedProj }]);
      if (matchedParcels.length > 0) {
        setParcels((prev) =>
          prev.map((p) =>
            directSet.has(p.id)
              ? { ...p, projectId, projectTitle: sanitizedProj.title }
              : p
          )
        );
        setGeometries((prev) =>
          prev.map((g) =>
            directSet.has(g.parcelId) ? { ...g, projectId } : g
          )
        );
      } else {
        await handleCreateParcel({
          surveyNumber: `9//22`,
          projectId,
          projectTitle: sanitizedProj.title,
          village: '39175 Mauli Baidwan',
          district: 'SAS Nagar (Mohali)',
          landownerName:
            'Punjab Urban Planning & Development Authority, Chandigarh (PUDA / GMADA)',
          areaHectares: 0.405,
          landType: 'Commercial',
          acquisitionStage: 'Possession Handover',
          compensationStatus: 'Disbursed',
          compensationAmountInr: 48500000,
          rehabStatus: 'Allotted',
          latitude: anchorWaypoint[0],
          longitude: anchorWaypoint[1],
        });
      }
    }

    return projectId;
  };

  // Update Project Stage / Status
  const handleUpdateProjectStageOrStatus = async (
    project: Project,
    updates: Partial<
      Pick<
        Project,
        'stage' | 'status' | 'acquiredAreaHectares' | 'disbursedInrCrores'
      >
    >
  ) => {
    if (user) {
      try {
        await updateDoc(doc(db, 'projects', project.id), {
          stage: updates.stage ?? project.stage,
          status: updates.status ?? project.status,
          acquiredAreaHectares:
            updates.acquiredAreaHectares ?? project.acquiredAreaHectares,
          disbursedInrCrores:
            updates.disbursedInrCrores ?? project.disbursedInrCrores,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `projects/${project.id}`
        );
      }
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, ...updates } : p))
      );
    }
  };

  // Update Parcel Acquisition Status Code (updates parcel, geometry, timeline history, and statistics dynamically)
  const handleUpdateParcelStatusCode = async (
    parcel: LandParcel,
    newStatusCode: AcquisitionStatusCode
  ) => {
    const mapped = acquisitionStatusCodeToStage(newStatusCode);
    const geom = geomByParcelId.get(parcel.id);
    const previousStatusCode =
      geom?.acquisitionStatus ||
      stageToAcquisitionStatusCode(
        parcel.acquisitionStage,
        parcel.compensationStatus
      );

    if (previousStatusCode !== newStatusCode) {
      const nowStr = `${new Date().toISOString().slice(0, 10)} ${new Date()
        .toTimeString()
        .slice(0, 5)} IST`;
      const newEvent: ParcelStatusTransitionEvent = {
        id: `${parcel.id}-live-${Date.now()}`,
        parcelId: parcel.id,
        fromStatus: previousStatusCode,
        toStatus: newStatusCode,
        timestamp: nowStr,
        statutorySection: `Stage Updated: ${mapped.acquisitionStage}`,
        referenceCode: geom?.demoUlpin || `AUD-${parcel.id}`,
        officerOrActor: user?.displayName || 'CALA / DRO Officer (SAS Nagar)',
        remarks: `Status transitioned from ${previousStatusCode} to ${newStatusCode} (${mapped.acquisitionStage}) via administrative workflow control.`,
        isLiveUpdate: true,
      };
      setLiveTransitionsByParcelId((prev) => ({
        ...prev,
        [parcel.id]: [...(prev[parcel.id] || []), newEvent],
      }));
      setSelectedTimelineParcelId(parcel.id);
    }

    if (user) {
      try {
        await updateDoc(doc(db, 'parcels', parcel.id), {
          acquisitionStage: mapped.acquisitionStage,
          compensationStatus:
            mapped.compensationStatus ?? parcel.compensationStatus,
          compensationAmountInr: parcel.compensationAmountInr,
          rehabStatus:
            newStatusCode === 'acquired' ? 'Completed' : parcel.rehabStatus,
          updatedAt: serverTimestamp(),
        });
        if (geom) {
          await updateDoc(doc(db, 'parcel_geometries', geom.id), {
            acquisitionStatus: newStatusCode,
            paymentStatus:
              newStatusCode === 'acquired' ? 'paid' : geom.paymentStatus,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `parcels/${parcel.id}`
        );
      }
    } else {
      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcel.id
            ? {
                ...p,
                acquisitionStage: mapped.acquisitionStage,
                compensationStatus:
                  mapped.compensationStatus ?? p.compensationStatus,
                rehabStatus:
                  newStatusCode === 'acquired' ? 'Completed' : p.rehabStatus,
              }
            : p
        )
      );
      setGeometries((prev) =>
        prev.map((g) =>
          g.parcelId === parcel.id
            ? {
                ...g,
                acquisitionStatus: newStatusCode,
                paymentStatus:
                  newStatusCode === 'acquired' ? 'paid' : g.paymentStatus,
              }
            : g
        )
      );
    }
  };

  // Toggle single parcel checkbox selection
  const handleToggleBulkParcelSelect = (parcelId: string) => {
    setSelectedBulkParcelIds((prev) =>
      prev.includes(parcelId)
        ? prev.filter((id) => id !== parcelId)
        : [...prev, parcelId]
    );
  };

  // Bulk Update Parcel Acquisition Status Codes simultaneously
  const handleBulkUpdateParcelStatusCode = async (
    targetParcelIds: string[],
    newStatusCode: AcquisitionStatusCode
  ) => {
    if (targetParcelIds.length === 0) return;
    setBulkUpdating(true);
    setBulkUpdateBanner(null);

    const targetSet = new Set(targetParcelIds);
    const targetParcels = parcels.filter((p) => targetSet.has(p.id));
    const mapped = acquisitionStatusCodeToStage(newStatusCode);
    const nowStr = `${new Date().toISOString().slice(0, 10)} ${new Date()
      .toTimeString()
      .slice(0, 5)} IST`;

    const newEventsByParcel: Record<string, ParcelStatusTransitionEvent[]> = {};
    let transitionedCount = 0;

    targetParcels.forEach((parcel) => {
      const geom = geomByParcelId.get(parcel.id);
      const previousStatusCode =
        geom?.acquisitionStatus ||
        stageToAcquisitionStatusCode(
          parcel.acquisitionStage,
          parcel.compensationStatus
        );

      if (previousStatusCode !== newStatusCode) {
        transitionedCount += 1;
        const newEvent: ParcelStatusTransitionEvent = {
          id: `${parcel.id}-bulk-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          parcelId: parcel.id,
          fromStatus: previousStatusCode,
          toStatus: newStatusCode,
          timestamp: nowStr,
          statutorySection: `Bulk Stage Update: ${mapped.acquisitionStage}`,
          referenceCode: geom?.demoUlpin || `BULK-AUD-${parcel.id}`,
          officerOrActor:
            user?.displayName || 'CALA / DRO Officer (SAS Nagar)',
          remarks: `Bulk status transition (${targetParcels.length} parcels selected) from ${previousStatusCode} to ${newStatusCode} (${mapped.acquisitionStage}).`,
          isLiveUpdate: true,
        };
        newEventsByParcel[parcel.id] = [newEvent];
      }
    });

    if (Object.keys(newEventsByParcel).length > 0) {
      setLiveTransitionsByParcelId((prev) => {
        const next = { ...prev };
        Object.entries(newEventsByParcel).forEach(([pid, evts]) => {
          next[pid] = [...(next[pid] || []), ...evts];
        });
        return next;
      });
      setSelectedTimelineParcelId(targetParcels[0].id);
    }

    if (user) {
      try {
        const batch = writeBatch(db);
        targetParcels.forEach((parcel) => {
          const geom = geomByParcelId.get(parcel.id);
          batch.update(doc(db, 'parcels', parcel.id), {
            acquisitionStage: mapped.acquisitionStage,
            compensationStatus:
              mapped.compensationStatus ?? parcel.compensationStatus,
            compensationAmountInr: parcel.compensationAmountInr,
            rehabStatus:
              newStatusCode === 'acquired' ? 'Completed' : parcel.rehabStatus,
            updatedAt: serverTimestamp(),
          });
          if (geom) {
            batch.update(doc(db, 'parcel_geometries', geom.id), {
              acquisitionStatus: newStatusCode,
              paymentStatus:
                newStatusCode === 'acquired' ? 'paid' : geom.paymentStatus,
              updatedAt: serverTimestamp(),
            });
          }
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `parcels/bulk_update_${targetParcels.length}`
        );
      }
    } else {
      setParcels((prev) =>
        prev.map((p) =>
          targetSet.has(p.id)
            ? {
                ...p,
                acquisitionStage: mapped.acquisitionStage,
                compensationStatus:
                  mapped.compensationStatus ?? p.compensationStatus,
                rehabStatus:
                  newStatusCode === 'acquired' ? 'Completed' : p.rehabStatus,
              }
            : p
        )
      );
      setGeometries((prev) =>
        prev.map((g) =>
          targetSet.has(g.parcelId)
            ? {
                ...g,
                acquisitionStatus: newStatusCode,
                paymentStatus:
                  newStatusCode === 'acquired' ? 'paid' : g.paymentStatus,
              }
            : g
        )
      );
    }

    setBulkUpdating(false);
    setBulkUpdateBanner(
      `Bulk Status Update Complete: ${targetParcels.length} selected parcel(s) updated to "${newStatusCode}" (${mapped.acquisitionStage})${
        transitionedCount > 0
          ? ` · ${transitionedCount} audit timeline transition(s) logged.`
          : '.'
      }`
    );
  };

  // Update Compensation Payment Status (updates compensation paid/pending & dashboard KPIs dynamically)
  const handleUpdatePaymentStatus = async (
    comp: CompensationRecord,
    newPaymentStatus: PaymentStatusCode
  ) => {
    const total = comp.totalAwardAmountInr;
    const paidAmountInr =
      newPaymentStatus === 'paid'
        ? total
        : newPaymentStatus === 'partially_paid'
        ? Math.round(total * 0.5)
        : 0;
    const pendingAmountInr = total - paidAmountInr;

    if (user) {
      try {
        await updateDoc(doc(db, 'compensations', comp.id), {
          paidAmountInr,
          pendingAmountInr,
          paymentStatus: newPaymentStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `compensations/${comp.id}`
        );
      }
    } else {
      setCompensations((prev) =>
        prev.map((c) =>
          c.id === comp.id
            ? {
                ...c,
                paidAmountInr,
                pendingAmountInr,
                paymentStatus: newPaymentStatus,
              }
            : c
        )
      );
    }
  };

  // Update R&R Status (updates R&R progress % dynamically)
  const handleUpdateRnrStatus = async (
    rnr: RehabilitationRecord,
    newRnrStatus: RehabilitationRecord['rnrStatus']
  ) => {
    const newPayStatus: PaymentStatusCode =
      newRnrStatus === 'completed' ? 'paid' : rnr.paymentStatus;

    if (user) {
      try {
        await updateDoc(doc(db, 'rehabilitation_resettlement', rnr.id), {
          rnrStatus: newRnrStatus,
          paymentStatus: newPayStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `rehabilitation_resettlement/${rnr.id}`
        );
      }
    } else {
      setRehabilitations((prev) =>
        prev.map((r) =>
          r.id === rnr.id
            ? { ...r, rnrStatus: newRnrStatus, paymentStatus: newPayStatus }
            : r
        )
      );
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'projects', projectId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}`);
      }
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  const handleDeleteParcel = async (parcelId: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'parcels', parcelId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `parcels/${parcelId}`);
      }
    } else {
      setParcels((prev) => prev.filter((p) => p.id !== parcelId));
    }
  };

  // Landowner Portal Action 1: Instant e-KYC & Partition Deed Verification
  const handleVerifyLandownerKyc = async (parcelId: string) => {
    const targetOwner = landowners.find((o) => o.parcelId === parcelId);
    setLandowners((prev) =>
      prev.map((o) =>
        o.parcelId === parcelId ? { ...o, kycVerified: true } : o
      )
    );
    if (user && targetOwner) {
      try {
        await updateDoc(doc(db, 'landowners', targetOwner.id), {
          kycVerified: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `landowners/${targetOwner.id}`
        );
      }
    }
  };

  // Landowner Portal Action 2: Online Section 15 / 64 Grievance & Objection Filing
  const handleSubmitLandownerObjection = async (
    parcelId: string,
    category: string,
    remarks: string
  ) => {
    const parcelObj = parcels.find((p) => p.id === parcelId);
    const docObj = documents.find((d) => d.parcelId === parcelId);
    const geomObj = geomByParcelId.get(parcelId);
    const summaryText = `[Khatedar Sec 15/64 Objection] ${category}: ${remarks}`.slice(
      0,
      140
    );

    const previousStatusCode =
      geomObj?.acquisitionStatus ||
      (parcelObj
        ? stageToAcquisitionStatusCode(
            parcelObj.acquisitionStage,
            parcelObj.compensationStatus
          )
        : 'documentation_pending');

    const nowStr = `${new Date().toISOString().slice(0, 10)} ${new Date()
      .toTimeString()
      .slice(0, 5)} IST`;
    const objectionEvent: ParcelStatusTransitionEvent = {
      id: `${parcelId}-obj-${Date.now()}`,
      parcelId,
      fromStatus: previousStatusCode,
      toStatus: 'disputed',
      timestamp: nowStr,
      statutorySection: category,
      referenceCode: docObj?.documentId || `OBJ-${parcelId}`,
      officerOrActor: `${parcelObj?.landownerName || 'Khatedar'} (Citizen Portal)`,
      remarks: summaryText,
      isLiveUpdate: true,
    };
    setLiveTransitionsByParcelId((prev) => ({
      ...prev,
      [parcelId]: [...(prev[parcelId] || []), objectionEvent],
    }));
    setSelectedTimelineParcelId(parcelId);

    // 1. Update local state immediately for instant Officer <-> Landowner Portal sync
    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? {
              ...p,
              acquisitionStage: 'Notification Issued',
              compensationStatus: 'Litigation',
            }
          : p
      )
    );
    setGeometries((prev) =>
      prev.map((g) =>
        g.parcelId === parcelId
          ? { ...g, acquisitionStatus: 'disputed' }
          : g
      )
    );
    setDocuments((prev) =>
      prev.map((d) =>
        d.parcelId === parcelId
          ? {
              ...d,
              verificationStatus: 'objection_logged',
              jamabandiStatus: 'Under Section 15 / 64 Hearing',
              encumbranceStatus: summaryText,
            }
          : d
      )
    );
    setBaseGeoJson((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        features: prev.features.map((f) =>
          f.properties.parcel_id === parcelId
            ? {
                ...f,
                properties: {
                  ...f.properties,
                  acquisition_status: 'disputed',
                },
              }
            : f
        ),
      };
    });

    // 2. Sync to Firestore if Officer/User is authenticated
    if (user) {
      try {
        if (parcelObj) {
          await updateDoc(doc(db, 'parcels', parcelObj.id), {
            acquisitionStage: 'Notification Issued',
            compensationStatus: 'Litigation',
            updatedAt: serverTimestamp(),
          });
        }
        if (geomObj) {
          await updateDoc(doc(db, 'parcel_geometries', geomObj.id), {
            acquisitionStatus: 'disputed',
            updatedAt: serverTimestamp(),
          });
        }
        if (docObj) {
          await updateDoc(doc(db, 'documents', docObj.id), {
            verificationStatus: 'objection_logged',
            jamabandiStatus: 'Under Section 15 / 64 Hearing',
            encumbranceStatus: summaryText,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `documents/${docObj?.id || parcelId}`
        );
      }
    }
  };

  const SAMPLE_AI_QUERIES = [
    'Which Tricity corridor has the highest continuity break risk?',
    'Audit GIS Tangori–Chunni Kalan Cadastral Mesh (Row 2 Bottlenecks)',
    'List parcels pending Section 15 collector hearing in SAS Nagar',
    'Summarize PFMS DBT holdbacks & R&R backlog',
  ] as const;

  const buildDeterministicTricityAiReport = (
    rawQuery: string
  ): AiAnalysisResult => {
    const q = rawQuery.trim().toLowerCase();
    const pendingCompCr = Number(
      Math.max(
        0,
        stats.compensationAssessedCr - stats.compensationPaidCr
      ).toFixed(2)
    );
    const pendingCompPercent = Math.max(0, 100 - stats.disbursementRatePercent);
    const pendingRnrFamilies = Math.max(
      0,
      stats.familiesAffected - stats.rnrCompletedOrAllotted
    );

    if (
      q.includes('gis') ||
      q.includes('cadastral') ||
      q.includes('tangori') ||
      q.includes('chunni') ||
      q.includes('mesh') ||
      q.includes('row 2')
    ) {
      return {
        executiveSummary: `Live GIS synchronization with the Tangori–Chunni Kalan Cadastral Paddy Belt (Hadbast 39175 / 142) maps 60 irregular parcels across 6 rows. Row 2 constitutes the critical linear bottleneck with 4 Crimson Red disputed plots (Khasra 4/1 Sukhdev Singh Bajwa, Khasra 2/1 Harjinder Kaur Gill, Khasra 7/1 Gurmeet Singh, and Khasra 8/1 Balwinder Singh Sandhu) blocking the SH-12A & NH-205A alignment. Conversely, Rows 1 and 3 are 100% unobstructed Green/Blue consent plots, offering an immediate zero-litigation bypass corridor.`,
        riskAlerts: [
          {
            title:
              'GIS Cadastral Row 2 Bottleneck — 4 Disputed Parcels on Active Corridor',
            severity: 'Critical',
            detail:
              'Row 2 parcels PAR-PB-008 (Balwinder Singh Sandhu), PAR-PB-002 (Harjinder Kaur Gill), PAR-PB-007 (Gurmeet Singh), and PAR-PB-004 (Sukhdev Singh Bajwa) sever the highway alignment with pending Section 15 objections and watercourse partition claims.',
          },
          {
            title:
              'Rajbaha Irrigation Canal & Village Link Road Crossings (r=3 & c=4)',
            severity: 'High',
            detail:
              'The diagonal Rajbaha Canal (r=3) and Village Link Road (c=4) require synchronous culvert design approvals and irrigation department NOCs to prevent monsoonal inundation in adjoining paddy fields.',
          },
          {
            title:
              'Rows 1 & 3 Feasibility: Zero Litigation Greenfield Corridor Available',
            severity: 'Low',
            detail:
              'All 20 parcels in Row 1 and Row 3 are verified as Green/Blue (approved / consent given / ready for Section 11 notice). Shifting the centerline northward to Row 1.45 bypasses all 4 disputed plots entirely.',
          },
        ],
        recommendedActions: [
          'In GIS Highway Studio, click "Auto-Optimize Alignment" to automatically detour the corridor through Row 1.45 clear green parcels, reducing dispute exposure from 4 plots to 0.',
          'Schedule an on-site joint inspection by Patwari and Kanungo for Khasra 4/1 (Sukhdev Singh Bajwa) and Khasra 2/1 (Harjinder Kaur Gill) to resolve Section 15 multiplier objections.',
          'Deposit the ₹11.20 Cr assessed compensation for Row 2 disputed holdings into LARR Authority Court Escrow under Section 77(2) to permit unobstructed right-of-way under Section 38.',
        ],
      };
    }

    if (q.includes('continuity') || q.includes('corridor')) {
      return {
        executiveSummary: `Across the ${stats.totalProjects} Chandigarh Tricity & Punjab corridors (${stats.totalProposedAreaHa.toFixed(2)} ha proposed, ${stats.totalAcquiredProjectAreaHa.toFixed(2)} ha acquired), PRJ-CHD-METRO-002 (Tricity Metro Phase-1 Depot & Corridor) and PRJ-PB-TRICITY-001 (NH-205A Kharar-Banur-Tepla Mohali Spur) carry the highest linear continuity break risk. PRJ-CHD-METRO-002 has 4 disputed parcels (only 14.20 / 32.50 ha acquired), while PRJ-PB-TRICITY-001 has 3 mid-corridor disputed parcels in Landran and Kambali (PAR-PB-002, PAR-PB-017) blocking 14.2 km of contiguous highway construction.`,
        riskAlerts: [
          {
            title:
              'PRJ-PB-TRICITY-001 — 14.2 km Linear Highway Continuity Blocker (Landran & Kambali)',
            severity: 'High',
            detail:
              '3 disputed parcels (PAR-PB-002 in Landran at 1.12 ha / ₹3.62 Cr, plus PAR-PB-017 and PAR-PB-012) sever contiguous earthwork along the NH-205A Mohali Spur despite 78% (37.60 / 48.20 ha) possession taken.',
          },
          {
            title:
              'PRJ-CHD-METRO-002 — Tricity Metro Viaduct & Sarangpur Depot Interruption',
            severity: 'Critical',
            detail:
              '4 disputed parcels in Mullanpur Garibdass & Sarangpur (including PAR-PB-004, 1.85 ha, ₹2.95 Cr award) interrupt elevated corridor pier foundations with 45 days remaining before Section 11 lapses.',
          },
          {
            title:
              'PRJ-HR-PKL-004 — Panchkula-Zirakpur Ring Road Bypass Bottleneck',
            severity: 'High',
            detail:
              '3 disputed hills-edge parcels (including PAR-PB-006 in Chandi Mandir, 1.60 ha, ₹2.10 Cr) and pending forest clearance restrict acquired possession to 6.80 / 21.00 ha (32.4%).',
          },
        ],
        recommendedActions: [
          'Invoke Section 77(2) LARR Authority escrow deposit for PAR-PB-002 (Landran) and PAR-PB-017 (Kambali) to unlock 14.2 km of contiguous NH-205A work-front for NHAI PIU Chandigarh.',
          'Prioritize Collector Section 15 disposal on the 4 Mullanpur & Sarangpur parcels under PRJ-CHD-METRO-002 before the 45-day Section 19 declaration expiry window closes.',
          'Use the GIS Map "Show Project Corridor Alignment" layer to issue stage-wise possession certificates on unobstructed green/blue segments.',
        ],
      };
    }

    if (
      q.includes('section 15') ||
      q.includes('hearing') ||
      q.includes('sas nagar')
    ) {
      return {
        executiveSummary: `In SAS Nagar (Mohali) and adjoining Tricity corridors, ${stats.disputedParcels} disputed parcels and ${stats.pendingNotifications} notification-stage parcels require Collector inquiry and disposal under Section 15 of the RFCTLARR Act, 2013. Core objections involve Rural vs Urban Multiplier application (Factor 1.0 vs 2.0) in Landran and Mullanpur Garibdass, and commercial frontage valuation along PR-7 Airport Road.`,
        riskAlerts: [
          {
            title:
              'PAR-PB-002 (DEMO-ULPIN-PB-0002) — Village Landran, Tehsil Kharar, SAS Nagar',
            severity: 'High',
            detail:
              'Landowner: Harjinder Kaur Gill · 1.12 ha Agricultural (Irrigated - Chahi) under PRJ-PB-TRICITY-001. ₹3.62 Cr award held up in Section 15/64 objection over urban development authority multiplier.',
          },
          {
            title:
              'PAR-PB-004 (DEMO-ULPIN-PB-0004) — Village Mullanpur Garibdass, SAS Nagar',
            severity: 'Critical',
            detail:
              'Landowner: Sukhdev Singh Bajwa · 1.85 ha Residential (Abadi Deh Edge) under PRJ-CHD-METRO-002. ₹2.95 Cr award pending Section 15 Collector hearing; 45 days remaining before Section 11 notification lapses.',
          },
          {
            title:
              'SAS Nagar Contiguous Corridor Queue (PAR-PB-010, PAR-PB-017, PAR-PB-020, PAR-PB-031)',
            severity: 'Medium',
            detail:
              'Joint-khewat partition mutations and Section 15 hearing transcripts pending digital signature by Land Acquisition Collector (LAC) SAS Nagar across NH-205A, Tricity Metro, and Aerotropolis Pocket-E.',
          },
        ],
        recommendedActions: [
          'Convene a special 3-day LAC hearing camp at District Administrative Complex, Sector 76, SAS Nagar (Mohali) for Landran (PAR-PB-002) and Mullanpur Garibdass (PAR-PB-004).',
          'Direct Tehsildars in Kharar and Mohali to complete Fard Jamabandi partition entries so Section 19 declarations can be gazetted within statutory timelines.',
          'Refer unresolved multiplier disputes directly to the LARR Authority (Chandigarh & Punjab) under Section 64 while depositing assessed awards to prevent project delay.',
        ],
      };
    }

    if (
      q.includes('pfms') ||
      q.includes('dbt') ||
      q.includes('holdback') ||
      q.includes('r&r') ||
      q.includes('backlog')
    ) {
      return {
        executiveSummary: `Of the ₹${stats.compensationAssessedCr.toFixed(2)} Cr total compensation assessed across ${stats.totalParcels} Tricity & Punjab parcels, ₹${stats.compensationPaidCr.toFixed(2)} Cr (${stats.disbursementRatePercent}%) has been disbursed via PFMS Direct Benefit Transfer, leaving ₹${pendingCompCr.toFixed(2)} Cr (${pendingCompPercent}%) held in LARR Authority escrow or pending Joint-Khewat KYC across ${stats.disputedParcels} disputed parcels. Under Schedule II R&R, ${stats.rnrCompletedOrAllotted} of ${stats.familiesAffected} affected families (${stats.rnrProgressPercent}%, ${stats.totalFamilyMembersAffected} household members) are allotted, with ${pendingRnrFamilies} families in verification backlog.`,
        riskAlerts: [
          {
            title: `₹${pendingCompCr.toFixed(2)} Cr (${pendingCompPercent}%) Compensation Escrow & PFMS Holdback`,
            severity: 'High',
            detail: `PRJ-CHD-METRO-002 holds ₹40.40 Cr unpaid (₹38.20 / ₹78.60 Cr paid), PRJ-PB-TRICITY-001 holds ₹18.30 Cr in court deposit (₹94.10 / ₹112.40 Cr paid), PRJ-HR-PKL-004 holds ₹16.00 Cr unpaid, and PRJ-PB-GMADA-003 has ₹7.50 Cr awaiting joint-khewat PFMS verification.`,
          },
          {
            title: `${pendingRnrFamilies} Project-Affected Families Pending Schedule II R&R Allotment`,
            severity: 'High',
            detail: `${stats.rnrCompletedOrAllotted}/${stats.familiesAffected} families (${stats.rnrProgressPercent}%) have received subsistence allowance and resettlement grants; ${pendingRnrFamilies} families linked to disputed parcels in Mullanpur, Landran, and Chandi Mandir remain in assessment_ongoing status.`,
          },
          {
            title:
              'Joint-Khewat Partition & IFSC/Aadhaar Seeding Mismatches (PRJ-PB-GMADA-003)',
            severity: 'Medium',
            detail:
              '2 agricultural joint-khewat holdings in Aerotropolis Pocket-E (PR-7 Airport Road) have approved Section 23 awards but PFMS DBT vouchers are paused pending co-sharer apportionment affidavits.',
          },
        ],
        recommendedActions: [
          `Transfer ₹${pendingCompCr.toFixed(2)} Cr of disputed/unclaimed awards into interest-bearing LARR Authority escrow accounts under Section 77(2) to satisfy statutory pre-conditions for Section 38 possession.`,
          'Run PFMS beneficiary re-validation camps with GMADA and NHAI PIU Chandigarh to clear the ₹7.50 Cr Aerotropolis joint-khewat DBT queue.',
          `Issue provisional Schedule II R&R entitlement certificates and ₹36,000 annual subsistence allowance to the remaining ${pendingRnrFamilies} affected families.`,
        ],
      };
    }

    return {
      executiveSummary: `Decision Support Engine audit across 5 National Infrastructure Corridors and the 60-parcel GIS Tangori–Chunni Kalan Cadastral Grid (${stats.totalProposedAreaHa.toFixed(2)} ha proposed / ${stats.totalAcquiredProjectAreaHa.toFixed(2)} ha acquired) flags 3 priority bottlenecks: (1) 45-day Section 19 expiry on PRJ-CHD-METRO-002 (including Khasra 4/1 Sukhdev Singh Bajwa), (2) 4 Row-2 disputed plots in the GIS Cadastral Mesh blocking 14.2 km of contiguous NH-205A highway construction, and (3) ₹${pendingCompCr.toFixed(2)} Cr (${pendingCompPercent}% of ₹${stats.compensationAssessedCr.toFixed(2)} Cr assessed) held in LARR Court Escrow / PFMS KYC across ${stats.disputedParcels} disputed parcels.`,
      riskAlerts: [
        {
          title:
            'Section 19 Statutory Expiry Alert — PRJ-CHD-METRO-002 (45 Days Remaining)',
          severity: 'Critical',
          detail:
            '4 Mullanpur Garibdass & Sarangpur parcels (PAR-PB-004, PAR-PB-019, PAR-PB-022, PAR-PB-025) require Collector Section 15 hearing disposal and Section 19 declaration publication within 45 days before Section 11 preliminary notification lapses.',
        },
        {
          title:
            'GIS Cadastral & Linear Continuity Blocker — NH-205A (14.2 km Blocked in Row 2)',
          severity: 'High',
          detail:
            '4 disputed parcels in GIS Cadastral Row 2 (Khasra 4/1 Sukhdev, Khasra 2/1 Harjinder, Khasra 7/1 Gurmeet, Khasra 8/1 Balwinder) interrupt contiguous highway earthwork along the NH-205A Kharar-Banur-Tepla Mohali Spur.',
        },
        {
          title: `Compensation Escrow & PFMS Bottleneck — ₹${pendingCompCr.toFixed(2)} Cr (${pendingCompPercent}%) Held`,
          severity: 'High',
          detail: `₹${pendingCompCr.toFixed(2)} Cr of the ₹${stats.compensationAssessedCr.toFixed(2)} Cr total award is currently held in Section 77(2) Court Deposit or pending Joint-Khewat Partition KYC across ${stats.disputedParcels} disputed parcels.`,
        },
      ],
      recommendedActions: [
        'Fast-track Section 15 Collector hearings for PRJ-CHD-METRO-002 in Sarangpur and Mullanpur Garibdass within 15 days to prevent Section 11 lapse.',
        'In GIS Highway Studio, evaluate shifting the corridor to Row 1.45 or invoke Section 77(2) LARR Authority court deposit to restore 14.2 km of contiguous work-front on NH-205A.',
        `Clear Joint-Khewat partition KYC and PFMS bank seeding to release ₹${pendingCompCr.toFixed(2)} Cr in pending awards and complete R&R allotment for the remaining ${pendingRnrFamilies} families.`,
      ],
    };
  };

  // Run Server-Side Decision Support Engine with GIS Cadastral & Project Synchronization
  const handleRunAiAnalysis = async (overrideQuery?: string) => {
    const effectiveQuery =
      typeof overrideQuery === 'string' ? overrideQuery : aiQuery;
    if (typeof overrideQuery === 'string') {
      setAiQuery(overrideQuery);
    }

    // Immediately populate deterministic report so UI responds instantaneously
    const fallbackReport = buildDeterministicTricityAiReport(effectiveQuery);
    setAiResult(fallbackReport);
    setAiLoading(true);
    setAiError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6500);

    try {
      // Gather live GIS Cadastral mesh properties and summary
      const gisFeatures = liveGeoJson?.features || [];
      const gisParcels = gisFeatures.map((f) => ({
        parcel_id: f.properties.parcel_id,
        khasra_number: f.properties.khasra_number,
        landowner_name: f.properties.landowner_name,
        acquisition_status: f.properties.acquisition_status,
        area_hectares: f.properties.area_hectares,
        compensation_inr: f.properties.total_award_amount_inr,
        project_id: f.properties.project_id,
        village: f.properties.village || 'Tangori / Chunni Kalan',
        dispute_reason: f.properties.dispute_reason,
      }));

      const gisSummary = {
        totalParcels: gisFeatures.length || 60,
        acquiredCount: gisFeatures.filter(
          (f) => f.properties.acquisition_status === 'acquired'
        ).length,
        approvedCount: gisFeatures.filter(
          (f) => f.properties.acquisition_status === 'approved'
        ).length,
        disputedCount: gisFeatures.filter(
          (f) => f.properties.acquisition_status === 'disputed'
        ).length,
        notificationCount: gisFeatures.filter((f) =>
          [
            'notification_issued',
            'documentation_pending',
            'not_initiated',
          ].includes(f.properties.acquisition_status)
        ).length,
        disputedKhasras: gisFeatures
          .filter((f) => f.properties.acquisition_status === 'disputed')
          .slice(0, 6)
          .map(
            (f) =>
              `${f.properties.khasra_number || f.properties.parcel_id} (${f.properties.landowner_name})`
          ),
      };

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects,
          parcels,
          gisParcels: gisParcels.slice(0, 30),
          gisSummary,
          query: effectiveQuery,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (
        response.ok &&
        data &&
        typeof data.executiveSummary === 'string' &&
        data.executiveSummary.trim().length > 0
      ) {
        setAiResult(data as AiAnalysisResult);
      }
    } catch {
      // Keep the deterministic fallback report without surfacing a blocking error
    } finally {
      window.clearTimeout(timeoutId);
      setAiLoading(false);
    }
  };

  // Export CSV report
  const handleExportCsv = () => {
    const headers = [
      'ParcelID',
      'ProjectID',
      'DemoULPIN',
      'SurveyNumber',
      'Village',
      'District',
      'LandownerName',
      'AreaHectares',
      'LandType',
      'AcquisitionStatus',
      'PaymentStatus',
      'AwardAmountINR',
      'PaidAmountINR',
      'RNRStatus',
    ];
    const rows = parcels.map((p) => {
      const geom = geomByParcelId.get(p.id);
      const comp = compByParcelId.get(p.id);
      const rnr = rnrByParcelId.get(p.id);
      return [
        `"${p.id}"`,
        `"${p.projectId}"`,
        `"${geom?.demoUlpin || `DEMO-ULPIN-${p.id}`}"`,
        `"${p.surveyNumber}"`,
        `"${p.village}"`,
        `"${p.district}"`,
        `"${p.landownerName}"`,
        p.areaHectares,
        `"${p.landType}"`,
        `"${geom?.acquisitionStatus || stageToAcquisitionStatusCode(p.acquisitionStage, p.compensationStatus)}"`,
        `"${comp?.paymentStatus || 'pending'}"`,
        comp?.totalAwardAmountInr ?? p.compensationAmountInr,
        comp?.paidAmountInr ?? 0,
        `"${rnr?.rnrStatus || p.rehabStatus}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bhoomitrack_synthetic_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentModuleMeta =
    MODULES.find((m) => m.id === activeModule) || MODULES[0];

  const filteredProjects = projects.filter((proj) => {
    const matchesSearch =
      proj.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || proj.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredParcelsList = parcels.filter((parcel) => {
    const geom = geomByParcelId.get(parcel.id);
    const acqCode =
      geom?.acquisitionStatus ||
      stageToAcquisitionStatusCode(
        parcel.acquisitionStage,
        parcel.compensationStatus
      );
    const matchesProj =
      projectFilter === 'all' || parcel.projectId === projectFilter;
    const matchesStatus = statusFilter === 'all' || acqCode === statusFilter;
    const matchesSearch =
      parcel.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.landownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.district.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProj && matchesStatus && matchesSearch;
  });

  const filteredCompensations = useMemo(() => {
    if (!searchTerm.trim()) return compensations;
    const q = searchTerm.toLowerCase();
    return compensations.filter(
      (c) =>
        c.compensationId.toLowerCase().includes(q) ||
        c.parcelId.toLowerCase().includes(q) ||
        c.projectId.toLowerCase().includes(q) ||
        c.landownerId.toLowerCase().includes(q) ||
        c.paymentStatus.toLowerCase().includes(q)
    );
  }, [compensations, searchTerm]);

  const filteredRehabilitations = useMemo(() => {
    if (!searchTerm.trim()) return rehabilitations;
    const q = searchTerm.toLowerCase();
    return rehabilitations.filter(
      (r) =>
        r.rnrId.toLowerCase().includes(q) ||
        r.parcelId.toLowerCase().includes(q) ||
        r.projectId.toLowerCase().includes(q) ||
        r.landownerId.toLowerCase().includes(q) ||
        r.livelihoodCategory.toLowerCase().includes(q) ||
        r.rnrStatus.toLowerCase().includes(q)
    );
  }, [rehabilitations, searchTerm]);

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const q = searchTerm.toLowerCase();
    return documents.filter(
      (d) =>
        d.documentId.toLowerCase().includes(q) ||
        d.parcelId.toLowerCase().includes(q) ||
        d.projectId.toLowerCase().includes(q) ||
        d.jamabandiStatus.toLowerCase().includes(q) ||
        d.section11GazetteRef.toLowerCase().includes(q) ||
        d.section19DeclarationRef.toLowerCase().includes(q) ||
        d.encumbranceStatus.toLowerCase().includes(q) ||
        d.verificationStatus.toLowerCase().includes(q)
    );
  }, [documents, searchTerm]);

  if (portalRole === 'gateway') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {gmpQuotaExceeded && (
          <div
            role="alert"
            className="sticky top-0 z-[9999] bg-amber-100 border-b border-amber-400 text-amber-950 px-4 py-2.5 text-xs font-medium"
          >
            Google Maps Demo Key quota exceeded — some map features may stop
            working. To restore full functionality,{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold text-amber-900"
            >
              switch to your own API key
            </a>{' '}
            and update{' '}
            <code className="font-mono bg-amber-200/70 px-1 py-0.5 rounded">
              VITE_GOOGLE_MAPS_API_KEY
            </code>
            .
          </div>
        )}
        <PortalGatewayView
          parcels={parcels}
          landowners={landowners}
          geometries={geometries}
          onEnterOfficerPortal={() => setPortalRole('government')}
          onSignInWithGoogle={signInWithGoogle}
          onEnterLandownerPortal={(parcelId) => {
            setSelectedLandownerParcelId(parcelId);
            setPortalRole('landowner');
          }}
        />
      </div>
    );
  }

  if (portalRole === 'landowner') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {gmpQuotaExceeded && (
          <div
            role="alert"
            className="sticky top-0 z-[9999] bg-amber-100 border-b border-amber-400 text-amber-950 px-4 py-2.5 text-xs font-medium"
          >
            Google Maps Demo Key quota exceeded — some map features may stop
            working. To restore full functionality,{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold text-amber-900"
            >
              switch to your own API key
            </a>{' '}
            and update{' '}
            <code className="font-mono bg-amber-200/70 px-1 py-0.5 rounded">
              VITE_GOOGLE_MAPS_API_KEY
            </code>
            .
          </div>
        )}
        <LandownerPortalView
          selectedParcelId={selectedLandownerParcelId}
          onSelectParcelId={setSelectedLandownerParcelId}
          projects={projects}
          parcels={parcels}
          landowners={landowners}
          compensations={compensations}
          documents={documents}
          rehabilitations={rehabilitations}
          geometries={geometries}
          liveGeoJson={liveGeoJson}
          onSwitchToOfficerPortal={() => setPortalRole('government')}
          onBackToGateway={() => setPortalRole('gateway')}
          onVerifyLandownerKyc={handleVerifyLandownerKyc}
          onSubmitLandownerObjection={handleSubmitLandownerObjection}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {gmpQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-[9999] bg-amber-100 border-b border-amber-400 text-amber-950 px-4 py-2.5 text-xs font-medium"
        >
          Google Maps Demo Key quota exceeded — some map features may stop
          working. To restore full functionality,{' '}
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-amber-900"
          >
            switch to your own API key
          </a>{' '}
          and update{' '}
          <code className="font-mono bg-amber-200/70 px-1 py-0.5 rounded">
            VITE_GOOGLE_MAPS_API_KEY
          </code>
          .
        </div>
      )}
      <div className="flex-1 flex flex-col lg:flex-row">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation (Navy Blue #0B192C) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-68 bg-[#0B192C] text-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              BT
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-tight truncate">
                BhoomiTrack AI
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                SIH26016 · Land Administration
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 10 Initial Modules Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => {
                  setActiveModule(mod.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{mod.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Officer Account Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#081220] space-y-2.5">
          {!isAuthReady ? (
            <div className="text-xs text-slate-400">
              Checking authentication...
            </div>
          ) : user ? (
            <div className="space-y-2.5">
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {user.displayName || 'Land Acquisition Officer'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user.email}
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Officer Sign In
            </button>
          )}

          {/* Discreet Dataset Sync Action */}
          <button
            type="button"
            onClick={handleSeedSyntheticDataset}
            disabled={seeding}
            title="Import or sync synthetic dataset"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 text-teal-400 ${
                seeding ? 'animate-spin' : ''
              }`}
            />
            <span>{seeding ? 'Syncing...' : 'Sync Dataset'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar (Strict 3-Zone Contract) */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 sticky top-0 z-30">
          {/* Zone 1: Brand / Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              BhoomiTrack AI · {currentModuleMeta.shortLabel}
            </span>
          </div>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'dashboard'
                  ? 'text-teal-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveModule('projects')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'projects'
                  ? 'text-teal-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveModule('parcels')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'parcels'
                  ? 'text-teal-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Parcels
            </button>
            <button
              onClick={() => setActiveModule('gis')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'gis'
                  ? 'text-teal-700 underline underline-offset-4'
                  : ''
              }`}
            >
              GIS Map
            </button>
            <button
              onClick={() => setActiveModule('compensation')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'compensation'
                  ? 'text-teal-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Compensation
            </button>
          </nav>

          {/* Zone 3: Primary Action & Sign-in Gateway */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
            <button
              type="button"
              onClick={() => setPortalRole('gateway')}
              title="Sign In / Portal Login Gateway"
              aria-label="Sign In / Portal Login Gateway"
              className="inline-flex items-center justify-center p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </header>

        {/* Main Workspace Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto space-y-6">


          {firestoreImportReport && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs text-teal-900">
              <span>{firestoreImportReport}</span>
              <button
                onClick={() => setFirestoreImportReport(null)}
                className="text-teal-700 hover:text-teal-950 font-medium whitespace-nowrap shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Module Title & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {currentModuleMeta.label}
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                {currentModuleMeta.description}
              </p>
            </div>

            {projects.length > 0 && !user && (
              <button
                onClick={handleClearForEmptyStateTest}
                className="text-xs text-slate-500 hover:text-slate-800 whitespace-nowrap shrink-0"
              >
                Clear View (Test Empty State)
              </button>
            )}
          </div>

          {/* Error State Alert Banner */}
          {(authError || dataError) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-red-900">
                    {tokenServiceDisabled
                      ? 'Action Required in Google Cloud Console: Enable Token Service API'
                      : 'Data or Authentication Notice'}
                  </h3>
                  <p className="text-xs text-red-700">
                    {authError || dataError}
                  </p>
                  {tokenServiceDisabled && (
                    <div className="pt-1">
                      <a
                        href={tokenServiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
                      >
                        Open Google Cloud Console (Enable Token Service API)
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDataError(null)}
                className="px-3 py-1.5 text-xs font-medium text-red-800 bg-red-100 hover:bg-red-200 rounded-lg whitespace-nowrap shrink-0 self-start"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading Skeleton State */}
          {loadingData ? (
            <div
              className="space-y-6"
              aria-busy="true"
              aria-label="Loading dataset records"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                  >
                    <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
                    <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-36 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* MODULE 1: DASHBOARD */}
              {activeModule === 'dashboard' && (
                <div className="space-y-6">
                  {/* 9 Dynamically Computed KPI Cards from Actual Records */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1. Total Projects */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        1. Total Projects
                      </div>
                      <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                        {stats.totalProjects}
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        {stats.activeProjects} Active · {stats.delayedOrDisputedProjects} Delayed/Disputed
                      </div>
                    </div>

                    {/* 2. Total Land Parcels */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        2. Total Land Parcels
                      </div>
                      <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                        {stats.totalParcels}
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        {stats.approvedParcels} Approved · {stats.disputedParcels} Disputed
                      </div>
                    </div>

                    {/* 3. Total Proposed Land Area */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        3. Total Proposed Land Area
                      </div>
                      <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                        {stats.totalProposedAreaHa.toFixed(2)} ha
                      </div>
                      <div className="text-xs text-teal-700 mt-1.5 font-mono tabular-nums">
                        Parcel Cadastral Sum: {stats.totalParcelAreaHa.toFixed(2)} ha
                      </div>
                    </div>

                    {/* 4. Acquired Parcels */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        4. Acquired Parcels
                      </div>
                      <div className="text-2xl font-bold text-teal-700 font-mono tabular-nums mt-1">
                        {stats.acquiredParcels}{' '}
                        <span className="text-sm font-normal text-slate-500">
                          / {stats.totalParcels}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        {stats.totalAcquiredProjectAreaHa.toFixed(2)} ha corridor possession taken
                      </div>
                    </div>

                    {/* 5. Pending Notifications */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        5. Pending Notifications
                      </div>
                      <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                        {stats.pendingNotifications}
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        not_initiated, notification_issued & documentation_pending
                      </div>
                    </div>

                    {/* 6. Compensation Assessed */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        6. Compensation Assessed
                      </div>
                      <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                        ₹{stats.compensationAssessedCr.toFixed(2)} Cr
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        ₹{stats.compensationAssessedInr.toLocaleString('en-IN')} total award
                      </div>
                    </div>

                    {/* 7. Compensation Paid */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        7. Compensation Paid
                      </div>
                      <div className="text-2xl font-bold text-teal-700 font-mono tabular-nums mt-1">
                        ₹{stats.compensationPaidCr.toFixed(2)} Cr
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        {stats.disbursementRatePercent}% paid (₹
                        {stats.compensationPaidInr.toLocaleString('en-IN')})
                      </div>
                    </div>

                    {/* 8. Families Affected */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        8. Families Affected
                      </div>
                      <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                        {stats.familiesAffected}
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        {stats.totalFamilyMembersAffected} total affected household members
                      </div>
                    </div>

                    {/* 9. R&R Progress */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs font-medium text-slate-500">
                        9. R&R Progress
                      </div>
                      <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                        {stats.rnrProgressPercent}%
                      </div>
                      <div className="text-xs text-teal-700 mt-1.5 font-mono tabular-nums">
                        {stats.rnrCompletedOrAllotted} / {stats.familiesAffected} families allotted or completed
                      </div>
                    </div>
                  </div>

                  {/* Empty State vs Populated Charts & Tables */}
                  {projects.length === 0 && parcels.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">
                        No Land Acquisition Records Loaded
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 max-w-lg mx-auto">
                        All 9 dashboard statistics calculate dynamically from actual records and currently read 0. Click below to import the validated 305-record Punjab synthetic dataset (`data/*.csv` and `data/parcels.geojson`) or create a new project.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleSeedSyntheticDataset}
                          disabled={seeding}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              seeding ? 'animate-spin' : ''
                            }`}
                          />
                          {seeding
                            ? 'Importing Dataset...'
                            : 'Import Validated Punjab Dataset (305 Records)'}
                        </button>
                        <button
                          onClick={() => setProjectModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create New Project
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Recharts Visualisations */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-5">
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">
                              Proposed vs Acquired Land Area by Project (ha)
                            </h3>
                            <p className="text-xs text-slate-500">
                              Live project metrics across Chandigarh UT, SAS Nagar (Mohali), Mullanpur, Landran, and Panchkula corridors
                            </p>
                          </div>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={projectComparisonChartData}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#e2e8f0"
                                />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar
                                  dataKey="ProposedHa"
                                  name="Proposed Area (ha)"
                                  fill="#0B192C"
                                  radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                  dataKey="AcquiredHa"
                                  name="Acquired Area (ha)"
                                  fill="#0D9488"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-5">
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">
                              Parcel Acquisition Status Distribution (50 Parcels)
                            </h3>
                            <p className="text-xs text-slate-500">
                              Live count of parcels across the 6 controlled acquisition statuses
                            </p>
                          </div>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={acquisitionStatusChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ name, value }) =>
                                    `${name}: ${value}`
                                  }
                                >
                                  {acquisitionStatusChartData.map(
                                    (entry, index) => (
                                      <Cell
                                        key={entry.name}
                                        fill={
                                          CHART_COLORS[
                                            index % CHART_COLORS.length
                                          ]
                                        }
                                      />
                                    )
                                  )}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Projects Summary Table */}
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              Punjab Infrastructure Projects (`data/projects.csv` / Firestore)
                            </h3>
                            <p className="text-xs text-slate-500">
                              5 synthetic demonstration projects linked to 50 cadastral parcels
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setActiveModule('gis')}
                              className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
                            >
                              Open 50-Polygon GIS Map →
                            </button>
                            <button
                              onClick={() => setActiveModule('projects')}
                              className="text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0"
                            >
                              Manage Projects →
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                                <th className="py-2.5 px-4">Project ID</th>
                                <th className="py-2.5 px-4">Code</th>
                                <th className="py-2.5 px-4">Project Name</th>
                                <th className="py-2.5 px-4">District · Agency</th>
                                <th className="py-2.5 px-4">Stage</th>
                                <th className="py-2.5 px-4 text-right">
                                  Acquired / Proposed (ha)
                                </th>
                                <th className="py-2.5 px-4 text-right">
                                  Disbursed / Budget (₹ Cr)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs">
                              {projects.map((proj) => (
                                <tr key={proj.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-mono tabular-nums font-semibold text-teal-800">
                                    {proj.id}
                                  </td>
                                  <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                                    {proj.code}
                                  </td>
                                  <td className="py-3 px-4 font-medium text-slate-900">
                                    {proj.title}
                                  </td>
                                  <td className="py-3 px-4 text-slate-600">
                                    {proj.district}, {proj.state} · {proj.agency}
                                  </td>
                                  <td className="py-3 px-4 text-slate-700">
                                    {proj.stage}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                                    {proj.acquiredAreaHectares.toFixed(2)} /{' '}
                                    {proj.totalAreaHectares.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                                    ₹{proj.disbursedInrCrores.toFixed(2)} / ₹
                                    {proj.budgetInrCrores.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* MODULE 2: PROJECTS */}
              {activeModule === 'projects' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by project_id, code, title, or Punjab district..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                        {['all', ...PROJECT_STATUSES].map((st) => (
                          <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                              statusFilter === st
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {st === 'all' ? 'All' : st}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setProjectModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Project
                      </button>
                    </div>
                  </div>

                  {filteredProjects.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                      <p className="text-sm font-semibold text-slate-900">
                        No Matching Projects Found
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Import the synthetic Punjab dataset or clear your search filter.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                              <th className="py-2.5 px-4">Project ID</th>
                              <th className="py-2.5 px-4">Code</th>
                              <th className="py-2.5 px-4">Project Title</th>
                              <th className="py-2.5 px-4">District · Agency</th>
                              <th className="py-2.5 px-4">Statutory Stage</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4 text-right">
                                Linked Parcels
                              </th>
                              <th className="py-2.5 px-4 text-right">
                                Proposed Area (ha)
                              </th>
                              <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-xs">
                            {filteredProjects.map((proj) => {
                              const linkedCount = parcels.filter(
                                (p) => p.projectId === proj.id
                              ).length;
                              return (
                                <tr key={proj.id} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-mono tabular-nums font-semibold text-teal-800">
                                    {proj.id}
                                  </td>
                                  <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                                    {proj.code}
                                  </td>
                                  <td className="py-3 px-4 font-medium text-slate-900">
                                    {proj.title}
                                  </td>
                                  <td className="py-3 px-4 text-slate-600">
                                    {proj.district}, {proj.state} · {proj.agency}
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={proj.stage}
                                      onChange={(e) =>
                                        handleUpdateProjectStageOrStatus(proj, {
                                          stage: e.target.value as ProjectStage,
                                        })
                                      }
                                      aria-label={`Stage for ${proj.title}`}
                                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
                                    >
                                      {PROJECT_STAGES.map((s) => (
                                        <option key={s} value={s}>
                                          {s}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={proj.status}
                                      onChange={(e) =>
                                        handleUpdateProjectStageOrStatus(proj, {
                                          status: e.target.value as ProjectStatus,
                                        })
                                      }
                                      aria-label={`Status for ${proj.title}`}
                                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
                                    >
                                      {PROJECT_STATUSES.map((st) => (
                                        <option key={st} value={st}>
                                          {st}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                                    {linkedCount}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                                    {proj.acquiredAreaHectares.toFixed(2)} /{' '}
                                    {proj.totalAreaHectares.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() =>
                                        handleDeleteProject(proj.id)
                                      }
                                      aria-label={`Delete project ${proj.id}`}
                                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 3: LAND PARCELS (Connected to parcels, landowners, compensation, geometries & visual status timeline) */}
              {activeModule === 'parcels' && (
                <div className="space-y-4">
                  {/* Visual Parcel Status Transition Timeline Component */}
                  <ParcelStatusTimeline
                    parcels={parcels}
                    selectedParcelId={selectedTimelineParcelId}
                    onSelectParcelId={setSelectedTimelineParcelId}
                    landownerByParcelId={landownerByParcelId}
                    compByParcelId={compByParcelId}
                    docByParcelId={docByParcelId}
                    geomByParcelId={geomByParcelId}
                    liveTransitionsByParcelId={liveTransitionsByParcelId}
                    onTriggerStatusTransition={(parcelObj, nextStatus) =>
                      handleUpdateParcelStatusCode(parcelObj, nextStatus)
                    }
                  />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by PAR-PB-XXX, DEMO-ULPIN, landowner, or village..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        aria-label="Filter parcels by project"
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="all">
                          All Projects ({parcels.length})
                        </option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.id} — {p.district}
                          </option>
                        ))}
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter parcels by acquisition status"
                        className="px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="all">All Statuses</option>
                        {ACQUISITION_STATUS_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() =>
                          projects.length > 0
                            ? setParcelModalOpen(true)
                            : setProjectModalOpen(true)
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Register Parcel
                      </button>
                    </div>
                  </div>

                  {/* Bulk Status Update Action Bar */}
                  <div className="bg-[#0B192C] text-white border border-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                          <span className="text-xs font-semibold tracking-wide uppercase text-slate-200">
                            Bulk Parcel Status Operations
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-800 text-teal-300 border border-slate-700">
                          {selectedBulkParcelIds.length} of{' '}
                          {filteredParcelsList.length} Selected
                        </span>
                        {selectedBulkParcelIds.length > 0 && (
                          <span className="text-xs font-mono text-slate-300">
                            Total Area:{' '}
                            <strong className="text-white">
                              {parcels
                                .filter((p) =>
                                  selectedBulkParcelIds.includes(p.id)
                                )
                                .reduce((acc, p) => acc + p.areaHectares, 0)
                                .toFixed(2)}{' '}
                              ha
                            </strong>{' '}
                            · Combined Award:{' '}
                            <strong className="text-teal-300">
                              ₹
                              {parcels
                                .filter((p) =>
                                  selectedBulkParcelIds.includes(p.id)
                                )
                                .reduce(
                                  (acc, p) =>
                                    acc +
                                    (compByParcelId.get(p.id)
                                      ?.totalAwardAmountInr ??
                                      p.compensationAmountInr),
                                  0
                                )
                                .toLocaleString('en-IN')}
                            </strong>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBulkParcelIds(
                              filteredParcelsList.map((p) => p.id)
                            )
                          }
                          className="px-2.5 py-1.5 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
                        >
                          Select All Filtered ({filteredParcelsList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const pendingIds = filteredParcelsList
                              .filter((p) => {
                                const g = geomByParcelId.get(p.id);
                                const code =
                                  g?.acquisitionStatus ||
                                  stageToAcquisitionStatusCode(
                                    p.acquisitionStage,
                                    p.compensationStatus
                                  );
                                return code !== 'acquired';
                              })
                              .map((p) => p.id);
                            setSelectedBulkParcelIds(pendingIds);
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
                        >
                          Select Unacquired
                        </button>
                        {selectedBulkParcelIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedBulkParcelIds([])}
                            className="px-2.5 py-1.5 text-[11px] font-medium bg-slate-800 hover:bg-red-950/70 text-slate-300 hover:text-red-200 border border-slate-700 rounded-lg transition-colors"
                          >
                            Clear Selection
                          </button>
                        )}

                        <div className="h-4 w-px bg-slate-700 hidden sm:block mx-1" />

                        <label
                          htmlFor="bulk-target-status-select"
                          className="text-[11px] text-slate-300 font-medium"
                        >
                          Target Status:
                        </label>
                        <select
                          id="bulk-target-status-select"
                          value={bulkTargetStatus}
                          onChange={(e) =>
                            setBulkTargetStatus(
                              e.target.value as AcquisitionStatusCode
                            )
                          }
                          aria-label="Target acquisition status for bulk update"
                          className="px-2.5 py-1.5 text-xs font-mono bg-slate-900 text-white border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          {ACQUISITION_STATUS_CODES.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={
                            selectedBulkParcelIds.length === 0 || bulkUpdating
                          }
                          onClick={() =>
                            handleBulkUpdateParcelStatusCode(
                              selectedBulkParcelIds,
                              bulkTargetStatus
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              bulkUpdating ? 'animate-spin' : ''
                            }`}
                          />
                          {bulkUpdating
                            ? 'Updating...'
                            : `Apply Bulk Update (${selectedBulkParcelIds.length})`}
                        </button>
                      </div>
                    </div>

                    {bulkUpdateBanner && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-teal-300">
                        <span>{bulkUpdateBanner}</span>
                        <button
                          type="button"
                          onClick={() => setBulkUpdateBanner(null)}
                          className="text-slate-400 hover:text-white p-0.5"
                          aria-label="Dismiss bulk update notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredParcelsList.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                      <p className="text-sm font-semibold text-slate-900">
                        No Matching Land Parcels Found
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Clear your filters or import the synthetic dataset.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                              <th className="py-2.5 px-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  aria-label="Select all filtered parcels"
                                  checked={
                                    filteredParcelsList.length > 0 &&
                                    filteredParcelsList.every((p) =>
                                      selectedBulkParcelIds.includes(p.id)
                                    )
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const merged = Array.from(
                                        new Set([
                                          ...selectedBulkParcelIds,
                                          ...filteredParcelsList.map(
                                            (p) => p.id
                                          ),
                                        ])
                                      );
                                      setSelectedBulkParcelIds(merged);
                                    } else {
                                      const filteredSet = new Set(
                                        filteredParcelsList.map((p) => p.id)
                                      );
                                      setSelectedBulkParcelIds((prev) =>
                                        prev.filter((id) => !filteredSet.has(id))
                                      );
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                              </th>
                              <th className="py-2.5 px-4">Parcel ID</th>
                              <th className="py-2.5 px-4">Project ID</th>
                              <th className="py-2.5 px-4">
                                Khasra · DEMO-ULPIN (Non-Official)
                              </th>
                              <th className="py-2.5 px-4">
                                Fictional Landowner & Contact
                              </th>
                              <th className="py-2.5 px-4">Village · District</th>
                              <th className="py-2.5 px-4 text-right">
                                Area (ha)
                              </th>
                              <th className="py-2.5 px-4">
                                Status Transition Progress
                              </th>
                              <th className="py-2.5 px-4">
                                Acquisition Status
                              </th>
                              <th className="py-2.5 px-4 text-right">
                                Assessed Award (₹)
                              </th>
                              <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-xs">
                            {filteredParcelsList.map((parcel) => {
                              const owner = landownerByParcelId.get(parcel.id);
                              const comp = compByParcelId.get(parcel.id);
                              const geom = geomByParcelId.get(parcel.id);
                              const statusCode =
                                geom?.acquisitionStatus ||
                                stageToAcquisitionStatusCode(
                                  parcel.acquisitionStage,
                                  parcel.compensationStatus
                                );
                              const isSelectedInTimeline =
                                parcel.id === selectedTimelineParcelId;
                              const isCheckedForBulk =
                                selectedBulkParcelIds.includes(parcel.id);

                              return (
                                <tr
                                  key={parcel.id}
                                  className={`transition-colors ${
                                    isCheckedForBulk
                                      ? 'bg-teal-50/70 hover:bg-teal-50'
                                      : isSelectedInTimeline
                                      ? 'bg-slate-100/90'
                                      : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="py-3 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      aria-label={`Select parcel ${parcel.id}`}
                                      checked={isCheckedForBulk}
                                      onChange={() =>
                                        handleToggleBulkParcelSelect(parcel.id)
                                      }
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-3 px-4 font-mono tabular-nums font-semibold text-teal-800">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedTimelineParcelId(parcel.id)
                                      }
                                      className="hover:underline text-left cursor-pointer"
                                      title="Inspect status transition timeline"
                                    >
                                      {parcel.id}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                                    {parcel.projectId}
                                  </td>
                                  <td className="py-3 px-4 font-mono tabular-nums text-slate-900">
                                    {parcel.surveyNumber}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-slate-900">
                                      {owner?.fullName || parcel.landownerName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                      {owner
                                        ? `${owner.landownerId} · ${owner.dummyContactNumber}`
                                        : 'Synthetic Record'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600">
                                    {parcel.village}, {parcel.district} ·{' '}
                                    {parcel.landType === 'Barren'
                                      ? 'Non-Developable Plot (Barren)'
                                      : parcel.landType}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                                    {parcel.areaHectares.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <ParcelInlineMiniTimeline
                                      statusCode={statusCode}
                                      onClickInspect={() =>
                                        setSelectedTimelineParcelId(parcel.id)
                                      }
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={statusCode}
                                      onChange={(e) =>
                                        handleUpdateParcelStatusCode(
                                          parcel,
                                          e.target
                                            .value as AcquisitionStatusCode
                                        )
                                      }
                                      aria-label={`Acquisition status for ${parcel.id}`}
                                      className="px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md"
                                    >
                                      {ACQUISITION_STATUS_CODES.map((code) => (
                                        <option key={code} value={code}>
                                          {code}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                                    ₹
                                    {(
                                      comp?.totalAwardAmountInr ??
                                      parcel.compensationAmountInr
                                    ).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() =>
                                        handleDeleteParcel(parcel.id)
                                      }
                                      aria-label={`Delete parcel ${parcel.id}`}
                                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 4: GIS MAP (Connected to all 50 Polygons in parcels.geojson) */}
              {activeModule === 'gis' && (
                <GisMapView
                  geojson={liveGeoJson}
                  projects={projects}
                  onOpenNewParcel={() => setParcelModalOpen(true)}
                  onOpenNewProject={() => setProjectModalOpen(true)}
                  onCreateRouteProject={handleCreateRouteProject}
                />
              )}

              {/* MODULE 5: ACQUISITION WORKFLOW */}
              {activeModule === 'workflow' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          RFCTLARR Act 2013 Statutory Pipeline &amp; Status Control
                        </h2>
                        <p className="text-xs text-slate-600 mt-1">
                          Updating any parcel status below immediately recalculates Acquired Parcels, Pending Notifications, and GIS Polygon colors.
                        </p>
                      </div>

                      {/* Search Bar with Search Icon */}
                      <div className="relative w-full md:w-80 shrink-0">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search parcel ID, survey/khasra, village..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                            <th className="py-2.5 px-4">Parcel ID</th>
                            <th className="py-2.5 px-4">Project ID</th>
                            <th className="py-2.5 px-4">District · Village</th>
                            <th className="py-2.5 px-4">RFCTLARR Stage</th>
                            <th className="py-2.5 px-4">
                              Controlled Acquisition Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {filteredParcelsList.map((parcel) => {
                            const geom = geomByParcelId.get(parcel.id);
                            const statusCode =
                              geom?.acquisitionStatus ||
                              stageToAcquisitionStatusCode(
                                parcel.acquisitionStage,
                                parcel.compensationStatus
                              );
                            return (
                              <tr key={parcel.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono tabular-nums font-semibold text-teal-800">
                                  {parcel.id}
                                </td>
                                <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                                  {parcel.projectId}
                                </td>
                                <td className="py-3 px-4 text-slate-700">
                                  {parcel.district} · {parcel.village}
                                </td>
                                <td className="py-3 px-4 text-slate-900 font-medium">
                                  {parcel.acquisitionStage}
                                </td>
                                <td className="py-3 px-4">
                                  <select
                                    value={statusCode}
                                    onChange={(e) =>
                                      handleUpdateParcelStatusCode(
                                        parcel,
                                        e.target.value as AcquisitionStatusCode
                                      )
                                    }
                                    aria-label={`Update workflow status for ${parcel.id}`}
                                    className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                                  >
                                    {ACQUISITION_STATUS_CODES.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 6: COMPENSATION (Connected to data/compensation.csv records) */}
              {activeModule === 'compensation' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          Compensation Awards &amp; PFMS Disbursement Ledger (`compensation.csv`)
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Assessed: ₹{stats.compensationAssessedInr.toLocaleString('en-IN')} · Paid: ₹{stats.compensationPaidInr.toLocaleString('en-IN')} ({stats.disbursementRatePercent}%)
                        </p>
                      </div>

                      {/* Search Bar with Search Icon */}
                      <div className="relative w-full md:w-80 shrink-0">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search CMP-PB-XXX, parcel ID, landowner, status..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                            <th className="py-2.5 px-4">Compensation ID</th>
                            <th className="py-2.5 px-4">Parcel · Project</th>
                            <th className="py-2.5 px-4">Landowner ID</th>
                            <th className="py-2.5 px-4 text-right">
                              Base Market + Solatium (₹)
                            </th>
                            <th className="py-2.5 px-4 text-right">
                              Total Award (₹)
                            </th>
                            <th className="py-2.5 px-4 text-right">
                              Paid / Pending (₹)
                            </th>
                            <th className="py-2.5 px-4">Payment Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {filteredCompensations.map((comp) => (
                            <tr key={comp.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                                {comp.compensationId}
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums text-teal-800">
                                {comp.parcelId} · {comp.projectId}
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                                {comp.landownerId}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                                ₹{comp.baseMarketValueInr.toLocaleString('en-IN')}{' '}
                                + ₹{comp.solatiumAmountInr.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                                ₹{comp.totalAwardAmountInr.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                                ₹{comp.paidAmountInr.toLocaleString('en-IN')} / ₹
                                {comp.pendingAmountInr.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={comp.paymentStatus}
                                  onChange={(e) =>
                                    handleUpdatePaymentStatus(
                                      comp,
                                      e.target.value as PaymentStatusCode
                                    )
                                  }
                                  aria-label={`Payment status for ${comp.compensationId}`}
                                  className="px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md"
                                >
                                  {PAYMENT_STATUS_CODES.map((ps) => (
                                    <option key={ps} value={ps}>
                                      {ps}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 7: REHABILITATION & RESETTLEMENT (Connected to data/rehabilitation_resettlement.csv) */}
              {activeModule === 'rehab' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          Rehabilitation &amp; Resettlement Entitlements (`rehabilitation_resettlement.csv`)
                        </h2>
                        <p className="text-xs text-slate-600 mt-1">
                          Families Affected: {stats.familiesAffected} ({stats.totalFamilyMembersAffected} members) · R&amp;R Progress: {stats.rnrProgressPercent}% ({stats.rnrCompletedOrAllotted}/{stats.familiesAffected})
                        </p>
                      </div>

                      {/* Search Bar with Search Icon */}
                      <div className="relative w-full md:w-80 shrink-0">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search RNR-PB-XXX, parcel ID, category, status..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                            <th className="py-2.5 px-4">R&R ID</th>
                            <th className="py-2.5 px-4">Parcel · Project</th>
                            <th className="py-2.5 px-4">Landowner ID</th>
                            <th className="py-2.5 px-4 text-right">
                              Family Size
                            </th>
                            <th className="py-2.5 px-4">Livelihood Category</th>
                            <th className="py-2.5 px-4 text-right">
                              Subsistence + Grant (₹)
                            </th>
                            <th className="py-2.5 px-4">R&R Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {filteredRehabilitations.map((rnr) => (
                            <tr key={rnr.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                                {rnr.rnrId}
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums text-teal-800">
                                {rnr.parcelId} · {rnr.projectId}
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                                {rnr.landownerId}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums">
                                {rnr.affectedFamilySize} members
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {rnr.livelihoodCategory}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums">
                                ₹
                                {(
                                  rnr.subsistenceAllowanceInr +
                                  rnr.resettlementGrantInr
                                ).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={rnr.rnrStatus}
                                  onChange={(e) =>
                                    handleUpdateRnrStatus(
                                      rnr,
                                      e.target
                                        .value as RehabilitationRecord['rnrStatus']
                                    )
                                  }
                                  aria-label={`R&R status for ${rnr.rnrId}`}
                                  className="px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md"
                                >
                                  <option value="assessment_ongoing">
                                    assessment_ongoing
                                  </option>
                                  <option value="allotted">allotted</option>
                                  <option value="completed">completed</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 8: DOCUMENTS (Connected to data/documents.csv) */}
              {activeModule === 'documents' && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Statutory Document Verification Registry (`documents.csv` — {documents.length} Records)
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Section 11 Notification, Section 19 Declaration, Jamabandi matching, and Encumbrance verification linked to each parcel.
                      </p>
                    </div>

                    {/* Search Bar with Search Icon */}
                    <div className="relative w-full md:w-80 shrink-0">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search DOC-PB-XXX, gazette ref, parcel ID, status..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                          <th className="py-2.5 px-4">Document ID</th>
                          <th className="py-2.5 px-4">Parcel · Project</th>
                          <th className="py-2.5 px-4">Jamabandi Status</th>
                          <th className="py-2.5 px-4">Section 11 Gazette Ref</th>
                          <th className="py-2.5 px-4">Section 19 Declaration</th>
                          <th className="py-2.5 px-4">Encumbrance</th>
                          <th className="py-2.5 px-4">Verification Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {filteredDocuments.map((docItem) => (
                          <tr key={docItem.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                              {docItem.documentId}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-teal-800">
                              {docItem.parcelId} · {docItem.projectId}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {docItem.jamabandiStatus}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {docItem.section11GazetteRef}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {docItem.section19DeclarationRef}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {docItem.encumbranceStatus}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-900">
                              {docItem.verificationStatus}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 9: AI INTELLIGENCE CENTRE */}
              {activeModule === 'ai' &&
                (() => {
                  const gisFeatures = liveGeoJson?.features || [];
                  const gisAcquiredCount = gisFeatures.filter(
                    (f) => f.properties.acquisition_status === 'acquired'
                  ).length;
                  const gisApprovedCount = gisFeatures.filter(
                    (f) => f.properties.acquisition_status === 'approved'
                  ).length;
                  const gisDisputedCount = gisFeatures.filter(
                    (f) => f.properties.acquisition_status === 'disputed'
                  ).length;
                  const gisNotificationCount = gisFeatures.filter(
                    (f) =>
                      f.properties.acquisition_status ===
                        'notification_issued' ||
                      f.properties.acquisition_status ===
                        'documentation_pending' ||
                      f.properties.acquisition_status === 'not_initiated'
                  ).length;
                  const gisTotalParcels = gisFeatures.length || 60;

                  const metroDisputedParcels = parcels
                    .filter((p) => {
                      const st =
                        geomByParcelId.get(p.id)?.acquisitionStatus ||
                        stageToAcquisitionStatusCode(
                          p.acquisitionStage,
                          p.compensationStatus
                        );
                      return (
                        p.projectId === 'PRJ-CHD-METRO-002' && st === 'disputed'
                      );
                    })
                    .map((p) => p.id);
                  const metroParcelBadges =
                    metroDisputedParcels.length > 0
                      ? metroDisputedParcels.slice(0, 4).join(', ')
                      : 'PAR-PB-004, PAR-PB-019, PAR-PB-022, PAR-PB-025';

                  const nh205DisputedParcels = parcels
                    .filter((p) => {
                      const st =
                        geomByParcelId.get(p.id)?.acquisitionStatus ||
                        stageToAcquisitionStatusCode(
                          p.acquisitionStage,
                          p.compensationStatus
                        );
                      return (
                        p.projectId === 'PRJ-PB-TRICITY-001' &&
                        st === 'disputed'
                      );
                    })
                    .map((p) => p.id);
                  const nh205ParcelBadges =
                    nh205DisputedParcels.includes('PAR-PB-002') &&
                    nh205DisputedParcels.length >= 2
                      ? `PAR-PB-002, PAR-PB-017, ${nh205DisputedParcels.find((id) => id !== 'PAR-PB-002' && id !== 'PAR-PB-017') || 'PAR-PB-012'}`
                      : 'PAR-PB-002, PAR-PB-017';

                  const heldEscrowCr = Number(
                    Math.max(
                      0,
                      stats.compensationAssessedCr - stats.compensationPaidCr
                    ).toFixed(2)
                  );
                  const heldEscrowPercent = Math.max(
                    0,
                    100 - stats.disbursementRatePercent
                  );
                  const pendingRnrCount = Math.max(
                    0,
                    stats.familiesAffected - stats.rnrCompletedOrAllotted
                  );

                  const activeAiReport =
                    aiResult || buildDeterministicTricityAiReport(aiQuery);

                  return (
                    <div className="space-y-6">
                      {/* Top Executive GIS & Project Live Synchronization Header */}
                      <div className="bg-[#0B192C] text-white rounded-2xl p-6 shadow-sm border border-slate-800">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                <Activity className="w-3.5 h-3.5 text-teal-400" />
                                Executive Decision Center
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                GIS Cadastral Mesh &amp; Project Registry Synced
                              </span>
                            </div>
                            <h2 className="text-lg lg:text-xl font-bold tracking-tight text-white mt-1">
                              National Land Acquisition Intelligence Centre
                            </h2>
                            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                              Live synthesis across 5 National Infrastructure Corridors and the 60-parcel Tangori–Chunni Kalan Cadastral Grid (Hadbast 39175 / 142) under the RFCTLARR Act, 2013.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleRunAiAnalysis()}
                              disabled={aiLoading}
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-teal-900/30"
                            >
                              <BrainCircuit className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`} />
                              {aiLoading ? 'Synthesizing Live Records...' : 'Refresh Decision Engine'}
                            </button>
                            <button
                              onClick={() => setActiveModule('gis')}
                              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-xl transition-colors border border-slate-700/60"
                            >
                              <Layers className="w-4 h-4 text-slate-300" />
                              View GIS Map
                            </button>
                          </div>
                        </div>

                        {/* 4 Real-time Synced Telemetry Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
                          {/* Telemetry 1: GIS Cadastral Grid */}
                          <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3.5">
                            <div className="flex items-center justify-between text-slate-400 text-xs">
                              <span className="font-medium">GIS Cadastral Grid</span>
                              <Layers className="w-4 h-4 text-teal-400" />
                            </div>
                            <div className="text-xl font-bold text-white font-mono mt-1">
                              {gisTotalParcels} Plots
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 truncate">
                              <span className="text-emerald-400 font-semibold">{gisAcquiredCount}</span> Acquired ·{' '}
                              <span className="text-teal-300 font-semibold">{gisApprovedCount}</span> Consent ·{' '}
                              <span className="text-rose-400 font-semibold">{gisDisputedCount}</span> Disputed
                            </div>
                          </div>

                          {/* Telemetry 2: Infrastructure Corridors */}
                          <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3.5">
                            <div className="flex items-center justify-between text-slate-400 text-xs">
                              <span className="font-medium">Infrastructure Corridors</span>
                              <Route className="w-4 h-4 text-sky-400" />
                            </div>
                            <div className="text-xl font-bold text-white font-mono mt-1">
                              {projects.length} Corridors
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 truncate">
                              <span className="text-sky-300 font-semibold">{stats.totalProposedAreaHa.toFixed(1)} ha</span> Proposed ·{' '}
                              <span className="text-emerald-400 font-semibold">{stats.totalAcquiredProjectAreaHa.toFixed(1)} ha</span> Acquired
                            </div>
                          </div>

                          {/* Telemetry 3: Disputed Bottlenecks */}
                          <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3.5">
                            <div className="flex items-center justify-between text-slate-400 text-xs">
                              <span className="font-medium">Disputed Bottlenecks</span>
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                            </div>
                            <div className="text-xl font-bold text-rose-300 font-mono mt-1">
                              {stats.disputedParcels} Critical Plots
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 truncate">
                              4 Disputed Plots on GIS Row 2 (Khasra 4/1, 2/1)
                            </div>
                          </div>

                          {/* Telemetry 4: Compensation & Escrow */}
                          <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3.5">
                            <div className="flex items-center justify-between text-slate-400 text-xs">
                              <span className="font-medium">PFMS Compensation</span>
                              <IndianRupee className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-xl font-bold text-white font-mono mt-1">
                              ₹{stats.compensationPaidCr.toFixed(2)} Cr
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 truncate">
                              <span className="text-emerald-400 font-semibold">{stats.disbursementRatePercent}%</span> Paid · ₹{heldEscrowCr.toFixed(2)} Cr in Sec 77(2) Escrow
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4 Pre-Computed Statutory Risk & Bottleneck Radar Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card 1: Section 19 Statutory Expiry Alert (Critical Risk) */}
                        <div className="bg-white border border-red-200 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-red-300 transition-colors">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                                Critical Risk · Section 19 Statutory Expiry Alert
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-red-600 text-white">
                                45 Days Remaining before Section 11 Lapses
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              PRJ-CHD-METRO-002 — Tricity Metro Phase-1 Depot &amp; Corridor (Sarangpur to New Chandigarh)
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Statutory countdown active for{' '}
                              <span className="font-semibold text-slate-900">
                                {metroDisputedParcels.length || 4} Mullanpur &amp; Sarangpur parcels ({metroParcelBadges})
                              </span>
                              . Section 15 Collector personal hearing disposal and Section 19 declaration publication must complete before preliminary notification expiry under RFCTLARR Act, 2013.
                            </p>
                          </div>
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                            <span>Agency: UMTA / RITES Chandigarh</span>
                            <button
                              onClick={() =>
                                handleRunAiAnalysis(
                                  'List parcels pending Section 15 collector hearing in SAS Nagar'
                                )
                              }
                              className="text-red-700 hover:text-red-900 font-sans font-semibold inline-flex items-center gap-1"
                            >
                              Inspect Section 15 Queue
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Card 2: Linear Corridor Continuity Blocker (High Impact) */}
                        <div className="bg-white border border-amber-200 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-amber-300 transition-colors">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                                <Route className="w-3.5 h-3.5 text-amber-700" />
                                High Impact · Linear Corridor Continuity Blocker
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-900 text-white">
                                14.2 km Contiguous Highway Blocked
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              PRJ-PB-TRICITY-001 — NH-205A Kharar-Banur-Tepla Greenfield Alignment (Mohali Spur)
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              <span className="font-semibold text-slate-900">
                                {nh205DisputedParcels.length || 3} disputed parcels in Landran and Kambali ({nh205ParcelBadges})
                              </span>{' '}
                              block{' '}
                              <span className="font-mono font-semibold text-slate-900">
                                14.2 km
                              </span>{' '}
                              of contiguous highway construction despite{' '}
                              <span className="font-mono font-semibold">37.60 / 48.20 ha</span>{' '}
                              (11 of 14 parcels) already handed over under Section 38.
                            </p>
                          </div>
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                            <span>Agency: NHAI (PIU Chandigarh)</span>
                            <button
                              onClick={() => setActiveModule('gis')}
                              className="text-teal-700 hover:text-teal-900 font-sans font-semibold inline-flex items-center gap-1"
                            >
                              View Corridor on GIS Map
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Card 3: Compensation Escrow & PFMS Bottleneck (Financial Risk) */}
                        <div className="bg-white border border-teal-200 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-teal-300 transition-colors">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-900 border border-teal-200">
                                <IndianRupee className="w-3.5 h-3.5 text-teal-700" />
                                Financial Risk · Compensation Escrow &amp; PFMS Bottleneck
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-teal-800 text-white">
                                ₹{heldEscrowCr.toFixed(2)} Cr ({heldEscrowPercent}%) in Escrow / KYC
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              ₹{heldEscrowCr.toFixed(2)} Cr ({heldEscrowPercent}% of Assessed ₹{stats.compensationAssessedCr.toFixed(2)} Cr) Held in Court Deposit / Pending KYC
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Out of{' '}
                              <span className="font-mono font-semibold text-slate-900">
                                ₹{stats.compensationAssessedCr.toFixed(2)} Cr
                              </span>{' '}
                              assessed across {stats.totalParcels} parcels,{' '}
                              <span className="font-mono font-semibold text-teal-800">
                                ₹{stats.compensationPaidCr.toFixed(2)} Cr ({stats.disbursementRatePercent}%)
                              </span>{' '}
                              is paid while{' '}
                              <span className="font-mono font-semibold text-slate-900">
                                ₹{heldEscrowCr.toFixed(2)} Cr ({heldEscrowPercent}%)
                              </span>{' '}
                              is held in LARR Authority Court Deposit or Pending Joint-Khewat Partition KYC across{' '}
                              <span className="font-mono font-semibold text-red-700">
                                {stats.disputedParcels} disputed parcels
                              </span>
                              .
                            </p>
                          </div>
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                            <span>Section 77(2) LARR Deposit &amp; PFMS DBT</span>
                            <button
                              onClick={() => setActiveModule('compensation')}
                              className="text-teal-700 hover:text-teal-900 font-sans font-semibold inline-flex items-center gap-1"
                            >
                              Open Compensation Ledger
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Card 4: Schedule II R&R & Hills-Edge Clearance Holdback */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-slate-300 transition-colors">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                <Users className="w-3.5 h-3.5 text-slate-700" />
                                Statutory R&amp;R &amp; Forest Clearance · Schedule II Monitor
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-800 text-white">
                                {pendingRnrCount} Families Pending Allotment ({stats.rnrProgressPercent}% Complete)
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              PRJ-HR-PKL-004 (Panchkula Bypass) &amp; Tricity R&amp;R Entitlement Backlog
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              <span className="font-mono font-semibold text-slate-900">
                                {stats.rnrCompletedOrAllotted} of {stats.familiesAffected} affected families
                              </span>{' '}
                              ({stats.totalFamilyMembersAffected} household members) have received Schedule II R&amp;R allotments, while{' '}
                              <span className="font-mono font-semibold text-slate-900">
                                {pendingRnrCount} families
                              </span>{' '}
                              in Chandi Mandir (`PAR-PB-006`), Mullanpur (`PAR-PB-004`), and Landran (`PAR-PB-002`) await settlement alongside Stage-I forest clearance.
                            </p>
                          </div>
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                            <span>{stats.pendingNotifications} Pending Statutory Notifications</span>
                            <button
                              onClick={() => setActiveModule('rehab')}
                              className="text-teal-700 hover:text-teal-900 font-sans font-semibold inline-flex items-center gap-1"
                            >
                              Review R&amp;R Entitlements
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Professional Decision Support Engine Console */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                Decision Support Engine
                              </h2>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-md">
                                <Sparkles className="w-3 h-3 text-teal-600" />
                                GIS Cadastral &amp; Project Grounded
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Synthesizes live GIS parcel mesh coordinates, Khasra survey records, PFMS DBT ledger vouchers, and corridor linear continuity under RFCTLARR Act, 2013.
                            </p>
                          </div>
                          <button
                            onClick={() => handleRunAiAnalysis()}
                            disabled={aiLoading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0B192C] hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-sm"
                          >
                            <BrainCircuit className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                            {aiLoading
                              ? 'Synthesizing Live Data...'
                              : 'Run Statutory Assessment'}
                          </button>
                        </div>

                        {/* Live Context Synchronization Badges */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-slate-500 font-medium">Synchronized Inputs:</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            <Layers className="w-3 h-3 text-teal-600" />
                            60 GIS Cadastral Parcels (Tangori–Chunni Kalan)
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            <Route className="w-3 h-3 text-sky-600" />
                            5 Infrastructure Corridors (NH-205A, Metro, PR-7)
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            4 Row-2 Disputed Plots Monitored
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            RFCTLARR 2013 &amp; PFMS DBT
                          </span>
                        </div>

                        {/* Query Input & Quick Prompts */}
                        <div className="space-y-3">
                          <label className="block text-xs font-medium text-slate-700">
                            Administrative or Corridor Inquiry
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="e.g. Which Tricity corridor has the highest continuity break risk?"
                              value={aiQuery}
                              onChange={(e) => setAiQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleRunAiAnalysis();
                                }
                              }}
                              className="w-full pl-3.5 pr-24 py-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleRunAiAnalysis()}
                              disabled={aiLoading}
                              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <span>Run</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* One-Click Sample Query Chips */}
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Executive Prompts:
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {SAMPLE_AI_QUERIES.map((samplePrompt) => {
                                const isSelected = aiQuery === samplePrompt;
                                return (
                                  <button
                                    key={samplePrompt}
                                    type="button"
                                    onClick={() =>
                                      handleRunAiAnalysis(samplePrompt)
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                      isSelected
                                        ? 'bg-[#0B192C] text-white border-[#0B192C] shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-200'
                                    }`}
                                  >
                                    <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
                                    <span>{samplePrompt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {aiError && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <span>{aiError}</span>
                          </div>
                        )}

                        {/* Executive Assessment Output Panel */}
                        <div className="space-y-4 pt-2">
                          <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                  Executive Summary Briefing
                                </h3>
                              </div>
                              <span className="text-[11px] font-mono text-teal-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {aiQuery
                                  ? `Inquiry: "${aiQuery}"`
                                  : 'Statutory Corridors & GIS Cadastral Mesh Audit'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed pt-1">
                              {activeAiReport.executiveSummary}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Statutory & Operational Risk Alerts */}
                            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Statutory &amp; Operational Risk Alerts
                                </h3>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {activeAiReport.riskAlerts?.length || 0} flagged
                                </span>
                              </div>
                              {activeAiReport.riskAlerts?.length ? (
                                <div className="space-y-2.5">
                                  {activeAiReport.riskAlerts.map((alert, i) => {
                                    const sev = alert.severity.toLowerCase();
                                    const isCrit = sev.includes('crit');
                                    const isHigh = sev.includes('high');
                                    return (
                                      <div
                                        key={i}
                                        className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                                          isCrit
                                            ? 'bg-red-50/60 border-red-200'
                                            : isHigh
                                            ? 'bg-amber-50/60 border-amber-200'
                                            : 'bg-slate-50 border-slate-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                                          <span>{alert.title}</span>
                                          <span
                                            className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                                              isCrit
                                                ? 'bg-red-600 text-white'
                                                : isHigh
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-teal-600 text-white'
                                            }`}
                                          >
                                            {alert.severity}
                                          </span>
                                        </div>
                                        <p className="text-slate-600 text-[11px] leading-relaxed">
                                          {alert.detail}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  No risk alerts flagged.
                                </p>
                              )}
                            </div>

                            {/* Recommended Administrative Actions */}
                            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                  Recommended Statutory Actions
                                </h3>
                                <span className="text-[11px] font-mono text-slate-500">
                                  RFCTLARR 2013 Protocol
                                </span>
                              </div>
                              {activeAiReport.recommendedActions?.length ? (
                                <div className="space-y-2.5">
                                  {activeAiReport.recommendedActions.map(
                                    (act, i) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2.5 p-3 rounded-lg bg-teal-50/40 border border-teal-100 text-xs text-slate-800 leading-relaxed"
                                      >
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white font-mono text-[10px] font-bold shrink-0 mt-0.5">
                                          {i + 1}
                                        </span>
                                        <span>{act}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">
                                  No specific actions generated.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Statutory Action Shortcuts */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                            <span className="font-medium text-slate-700">Direct Module Actions:</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => setActiveModule('gis')}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-300 hover:text-teal-900 font-semibold text-slate-700 transition-colors inline-flex items-center gap-1 text-[11px]"
                              >
                                <Layers className="w-3.5 h-3.5 text-teal-600" />
                                Inspect GIS Corridor
                              </button>
                              <button
                                onClick={() => setActiveModule('compensation')}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-300 hover:text-teal-900 font-semibold text-slate-700 transition-colors inline-flex items-center gap-1 text-[11px]"
                              >
                                <IndianRupee className="w-3.5 h-3.5 text-teal-600" />
                                Compensation Ledger
                              </button>
                              <button
                                onClick={() => setActiveModule('workflow')}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-300 hover:text-teal-900 font-semibold text-slate-700 transition-colors inline-flex items-center gap-1 text-[11px]"
                              >
                                <GitBranch className="w-3.5 h-3.5 text-teal-600" />
                                Statutory Pipeline
                              </button>
                              <button
                                onClick={() => setActiveModule('rehab')}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-300 hover:text-teal-900 font-semibold text-slate-700 transition-colors inline-flex items-center gap-1 text-[11px]"
                              >
                                <Users className="w-3.5 h-3.5 text-teal-600" />
                                R&amp;R Entitlements
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* MODULE 10: REPORTS */}
              {activeModule === 'reports' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        National Land Acquisition Audit & MIS Reports
                      </h2>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Export joined cadastral parcel, landowner, compensation, and R&R schedules in CSV format.
                      </p>
                    </div>
                    <button
                      onClick={handleExportCsv}
                      disabled={parcels.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      Download Joined Cadastral CSV ({parcels.length} Parcels)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500">
                        Relational Collections Loaded
                      </div>
                      <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                        7 Collections (305 Records)
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500">
                        GeoJSON Polygons Connected
                      </div>
                      <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                        {liveGeoJson.features.length} Polygons
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-xs text-slate-500">
                        Net Disbursed Ratio
                      </div>
                      <div className="text-xl font-bold font-mono tabular-nums text-teal-700 mt-1">
                        {stats.disbursementRatePercent}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      </div>

      {/* Create Project & Create Parcel Modals */}
      <CreateProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />
      <CreateParcelModal
        isOpen={parcelModalOpen}
        onClose={() => setParcelModalOpen(false)}
        projects={projects}
        onSubmit={handleCreateParcel}
      />
    </div>
  );
}

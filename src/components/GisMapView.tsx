import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  APIProvider,
  Map as GoogleMap,
  Polygon as GooglePolygon,
  Polyline as GooglePolyline,
  Circle as GoogleCircle,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  type AcquisitionStatusCode,
  type GeoJsonParcelCollection,
  type GeoJsonParcelFeature,
  type PaymentStatusCode,
  type Project,
} from '../types/bhoomi';
import {
  Layers,
  Filter,
  Compass,
  AlertTriangle,
  CheckCircle2,
  GitCommit,
  Plus,
  Route,
  RotateCcw,
  Trash2,
  Sparkles,
  Search,
  BookOpen,
  Landmark,
  Flame,
  Globe,
  Map as MapIcon,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Ruler,
  ShieldAlert,
  Building2,
  CircleDot,
  Navigation,
  SlidersHorizontal,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

// Real Open Agricultural Paddy Fields: Tangori–Chunni Kalan–Sirhind Greenfield Paddy Belt (SAS Nagar / Fatehgarh Sahib border, Punjab)
export const PADDY_BELT_CENTER_LAT = 30.6382;
export const PADDY_BELT_CENTER_LNG = 76.6448;

const GoogleMapCameraSync: React.FC<{
  target: { lat: number; lng: number; zoom: number; seq: number } | null;
}> = ({ target }) => {
  const gmap = useMap();
  useEffect(() => {
    if (!gmap || !target) return;
    gmap.panTo({ lat: target.lat, lng: target.lng });
    gmap.setZoom(target.zoom);
  }, [gmap, target]);
  return null;
};

export interface CreateRouteProjectPayload {
  title: string;
  agency: string;
  state: string;
  district: string;
  rowWidthMeters: number;
  waypoints: [number, number][];
  directParcelIds: string[];
  bufferParcelIds: string[];
  totalCorridorAreaHa: number;
  estimatedAwardCr: number;
}

export interface GisMapViewProps {
  geojson: GeoJsonParcelCollection | null;
  projects?: Project[];
  onOpenNewParcel?: () => void;
  onOpenNewProject?: () => void;
  onCreateRouteProject?: (payload: CreateRouteProjectPayload) => Promise<string>;
}

type StudioToolMode =
  | 'highway_path'
  | 'toll_plaza'
  | 'rest_interchange'
  | 'measure_chainage'
  | 'inspect_parcel';

export interface TollPlazaMarker {
  id: string;
  lat: number;
  lng: number;
  bearingDeg: number;
  label: string;
}

export interface InterchangeMarker {
  id: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  label: string;
}

const ALL_STATUSES: AcquisitionStatusCode[] = [
  'acquired',
  'approved',
  'disputed',
  'documentation_pending',
  'notification_issued',
  'not_initiated',
];

/**
 * Contrasted Acquisition Status Colors for Open Paddy Field Satellite View:
 * - Available / Clear / Consent Given (approved / acquired): Vibrant Emerald Green (#10B981) & Teal (#0D9488)
 * - Available — Ready for Section 11 Notice (not_initiated / notification_issued / documentation_pending): Sky Blue (#0284C7)
 * - Disputed / Court Stay / High-Risk Bottleneck (disputed): High-Contrast Crimson Red (#EF4444)
 */
function getStatusColorHex(status: AcquisitionStatusCode): string {
  switch (status) {
    case 'acquired':
      return '#047857'; // Dark Green (Acquired & Possession Handed Over)
    case 'approved':
      return '#10B981'; // Vibrant Emerald Green (Available • Consent Given / Awarded)
    case 'disputed':
      return '#EF4444'; // High-Contrast Crimson Red
    case 'notification_issued':
      return '#0284C7'; // Sky Blue
    case 'documentation_pending':
      return '#0EA5E9'; // Light Sky Blue
    case 'not_initiated':
    default:
      return '#0284C7'; // Sky Blue (Ready for Sec 11 Notice)
  }
}

function getStatusAvailabilityGroup(
  status: AcquisitionStatusCode
): 'available_clear' | 'notification_stage' | 'disputed_bottleneck' {
  if (status === 'acquired' || status === 'approved') {
    return 'available_clear';
  }
  if (status === 'disputed') {
    return 'disputed_bottleneck';
  }
  return 'notification_stage';
}

function formatStatusLabel(status: AcquisitionStatusCode): string {
  switch (status) {
    case 'acquired':
      return 'Dark Green • Acquired (Possession Handed Over)';
    case 'approved':
      return 'Emerald Green • Consent / Awarded';
    case 'disputed':
      return 'Crimson Red • Disputed / Court Stay Bottleneck';
    case 'documentation_pending':
      return 'Sec 11 / SIA Verification';
    case 'notification_issued':
      return 'Ready • Sec 11 Notified';
    case 'not_initiated':
    default:
      return 'Available • Ready for Sec 11';
  }
}

function formatINR(amount: number): string {
  const cr = amount / 10000000;
  if (cr >= 1) {
    return `₹${cr.toFixed(2)} Cr`;
  }
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(2)} L`;
}

export interface CompensationHeatmapStyle {
  tierKey: 'paid' | 'partially_paid' | 'pending_kyc' | 'disputed_escrow';
  label: string;
  shortLabel: string;
  fillColor: string;
  borderColor: string;
  glowColor: string;
  intensity: number;
}

function getCompensationHeatmapStyle(
  paymentStatus?: PaymentStatusCode | string,
  acquisitionStatus?: AcquisitionStatusCode | string,
  awardAmountInr = 0
): CompensationHeatmapStyle {
  const awardCr = (Number(awardAmountInr) || 0) / 10000000;
  const intensity = Math.min(1, Math.max(0.45, 0.45 + (awardCr / 8.0) * 0.55));

  if (paymentStatus === 'paid') {
    return {
      tierKey: 'paid',
      label: 'Paid (DBT Disbursed)',
      shortLabel: 'Paid / Disbursed',
      fillColor: '#10B981',
      borderColor: '#047857',
      glowColor: '#34D399',
      intensity,
    };
  }

  if (paymentStatus === 'partially_paid') {
    return {
      tierKey: 'partially_paid',
      label: 'Partially Paid (Advance Sanctioned)',
      shortLabel: 'Partially Paid',
      fillColor: '#F59E0B',
      borderColor: '#B45309',
      glowColor: '#FBBF24',
      intensity,
    };
  }

  if (acquisitionStatus === 'disputed') {
    return {
      tierKey: 'disputed_escrow',
      label: 'Escrow Holdback (Disputed Litigation)',
      shortLabel: 'Disputed Escrow',
      fillColor: '#EF4444',
      borderColor: '#7F1D1D',
      glowColor: '#F87171',
      intensity: Math.max(0.85, intensity),
    };
  }

  return {
    tierKey: 'pending_kyc',
    label: 'Pending (PFMS / KYC Holdback)',
    shortLabel: 'Pending PFMS',
    fillColor: '#0284C7',
    borderColor: '#0369A1',
    glowColor: '#38BDF8',
    intensity: Math.max(0.7, intensity),
  };
}

const PROJECT_CORRIDOR_STYLES: Record<
  string,
  { color: string; shortLabel: string; code: string }
> = {
  'PRJ-PB-TRICITY-001': {
    color: '#38BDF8',
    shortLabel: 'SH-12A Tangori–Chunni Kalan Greenfield Corridor',
    code: 'SH-12A',
  },
  'PRJ-CHD-METRO-002': {
    color: '#C084FC',
    shortLabel: 'Tricity Metro Feeder (Sarangpur–Tangori Belt)',
    code: 'METRO-1',
  },
  'PRJ-PB-GMADA-003': {
    color: '#FBBF24',
    shortLabel: 'PR-7 Aerotropolis Paddy Belt Ring Link',
    code: 'PR-7',
  },
  'PRJ-HR-PKL-004': {
    color: '#FB923C',
    shortLabel: 'Banur–Landran–Chunni Kalan Freight Bypass',
    code: 'NH-5 BYP',
  },
  'PRJ-PB-RAIL-005': {
    color: '#2DD4BF',
    shortLabel: 'Rajpura–Mohali Dedicated Freight Rail Spur',
    code: 'NR-RAIL',
  },
};

function formatLandClassificationEnglish(
  landType?: string,
  soilCropType?: string
): string {
  if (soilCropType && soilCropType.trim()) {
    return soilCropType.trim();
  }
  const raw = (landType || '').trim();
  const normalized = raw.toLowerCase();
  if (
    raw.includes('ਗੈਰਮੁਮਕਿਨ') ||
    normalized.includes('gair mumkin') ||
    normalized === 'barren'
  ) {
    return 'Canal Belt / Non-Developable Plot';
  }
  if (normalized === 'agricultural') {
    return 'Irrigated Paddy - Chahi';
  }
  if (normalized === 'residential') {
    return 'Abadi Edge / Farmstead';
  }
  if (normalized === 'commercial') {
    return 'Agro-Commercial / Mandi Edge';
  }
  if (normalized === 'forest') {
    return 'Orchard / Agro-Forestry';
  }
  return raw || 'Irrigated Paddy - Chahi';
}

const PADDY_PRESET = {
  id: 'tangori_chunni_paddy_belt' as const,
  buttonLabel: 'Tangori–Chunni Kalan Paddy Belt (SAS Nagar)',
  stateName: 'Punjab',
  district: 'SAS Nagar (Mohali) / Fatehgarh Sahib Border',
  tehsil: '232 Mohali / Chunni Kalan',
  kanungo: 'Tangori / Landran Circle',
  patwar: 'Tangori–Chunni Kalan Paddy Belt',
  village: 'Tangori Paddy Belt & Chunni Kalan',
  hadbastNo: 'Hadbast 39175 / 142',
  utmCoord: 'UTM 43N: 657840.25, 3391510.80',
  centerLat: PADDY_BELT_CENTER_LAT,
  centerLng: PADDY_BELT_CENTER_LNG,
  zoom: 15,
};

/**
 * Deterministic Rotated (16° Canal-Aligned), Vertex-Jittered Organic Paddy Field Mesh Node Generator.
 * Produces [lat, lng] in Leaflet order and [lng, lat] in GeoJSON order.
 */
export function paddyMeshNodeLatLng(u: number, v: number): [number, number] {
  const s1 = Math.sin(u * 12.9898 + v * 78.233 + 1.37) * 43758.5453;
  const s2 = Math.cos(u * 39.3467 + v * 11.1351 + 2.41) * 24634.6345;
  const f1 = s1 - Math.floor(s1);
  const f2 = s2 - Math.floor(s2);

  // Organic vertex displacement (+/- 0.21 cell units) so zero uniform squares exist
  const ju = u + (f1 - 0.5) * 0.42;
  const jv = v + (f2 - 0.5) * 0.42;

  const relU = ju - 3.0;
  const relV = jv - 4.0;

  const northMeters = -relU * 122;
  const eastMeters = relV * 138;

  // Rotate by 16 degrees counter-clockwise (canal-aligned)
  const angleRad = (16 * Math.PI) / 180;
  const rotEast =
    eastMeters * Math.cos(angleRad) - northMeters * Math.sin(angleRad);
  const rotNorth =
    eastMeters * Math.sin(angleRad) + northMeters * Math.cos(angleRad);

  const dLat = rotNorth / 111132;
  const dLng =
    rotEast / (111320 * Math.cos((PADDY_BELT_CENTER_LAT * Math.PI) / 180));

  return [
    Number((PADDY_BELT_CENTER_LAT + dLat).toFixed(6)),
    Number((PADDY_BELT_CENTER_LNG + dLng).toFixed(6)),
  ];
}

function buildIrregularGeoJsonRing(
  uvPts: [number, number][]
): [number, number][] {
  const ring: [number, number][] = uvPts.map(([u, v]) => {
    const [lat, lng] = paddyMeshNodeLatLng(u, v);
    return [lng, lat];
  });
  ring.push([ring[0][0], ring[0][1]]);
  return ring;
}

function topEdgeUV(r: number, c: number): [number, number][] {
  if ((r + c) % 2 === 0) {
    return [
      [r, c],
      [r, c + 0.5],
      [r, c + 1],
    ];
  }
  return [
    [r, c],
    [r, c + 1],
  ];
}

function rightEdgeUV(r: number, c: number): [number, number][] {
  if ((r + c + 1) % 3 === 0) {
    return [
      [r, c + 1],
      [r + 0.5, c + 1],
      [r + 1, c + 1],
    ];
  }
  return [
    [r, c + 1],
    [r + 1, c + 1],
  ];
}

function bottomEdgeReversedUV(r: number, c: number): [number, number][] {
  if ((r + 1 + c) % 2 === 0) {
    return [
      [r + 1, c + 1],
      [r + 1, c + 0.5],
      [r + 1, c],
    ];
  }
  return [
    [r + 1, c + 1],
    [r + 1, c],
  ];
}

function leftEdgeReversedUV(r: number, c: number): [number, number][] {
  if ((r + c) % 3 === 0) {
    return [
      [r + 1, c],
      [r + 0.5, c],
      [r, c],
    ];
  }
  return [
    [r + 1, c],
    [r, c],
  ];
}

interface IrregularMeshCell {
  row: number;
  col: number;
  ring: [number, number][];
}

function build60IrregularCadastralCells(): IrregularMeshCell[] {
  const splitKeys = new Set([
    '0,1',
    '0,5',
    '1,2',
    '1,6',
    '2,0',
    '2,4',
    '3,1',
    '3,5',
    '4,2',
    '4,6',
    '5,3',
    '5,7',
  ]);
  const cells: IrregularMeshCell[] = [];

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 8; c++) {
      const key = `${r},${c}`;
      const top = topEdgeUV(r, c);
      const right = rightEdgeUV(r, c);
      const bottomRev = bottomEdgeReversedUV(r, c);
      const leftRev = leftEdgeReversedUV(r, c);

      if (splitKeys.has(key)) {
        const midU = Number((r + 0.53).toFixed(2));
        const midV = Number((c + 0.47).toFixed(2));

        const uvA: [number, number][] = [
          ...top,
          ...right.slice(1),
          [midU, midV],
        ];
        cells.push({
          row: r,
          col: c,
          ring: buildIrregularGeoJsonRing(uvA),
        });

        const uvB: [number, number][] = [
          [r, c],
          [midU, midV],
          [r + 1, c + 1],
          ...bottomRev.slice(1),
          ...leftRev.slice(1, -1),
        ];
        cells.push({
          row: r,
          col: c,
          ring: buildIrregularGeoJsonRing(uvB),
        });
      } else {
        const uvFull: [number, number][] = [
          ...top,
          ...right.slice(1),
          ...bottomRev.slice(1),
          ...leftRev.slice(1, -1),
        ];
        cells.push({
          row: r,
          col: c,
          ring: buildIrregularGeoJsonRing(uvFull),
        });
      }
    }
  }
  return cells;
}

const SOIL_CROP_FALLBACKS = [
  'Irrigated Paddy - Chahi',
  'Wheat-Paddy Double Crop',
  'Canal Belt Agricultural',
  'Irrigated Paddy - Chahi',
  'Orchard / Agro-Forestry',
  'Wheat-Paddy Double Crop',
  'Abadi Edge',
];

const PADDY_VILLAGE_FALLBACKS = [
  'Tangori Paddy Belt',
  'Chunni Kalan',
  'Sawara',
  'Manakpur',
  '39175 Mauli Baidwan',
];

// Outer organic Hadbast perimeter around the 6x8 irregular mesh
const HADBAST_PERIMETER_UV: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 8],
  [6, 7],
  [6, 6],
  [6, 5],
  [6, 4],
  [6, 3],
  [6, 2],
  [6, 1],
  [6, 0],
  [5, 0],
  [4, 0],
  [3, 0],
  [2, 0],
  [1, 0],
  [0, 0],
];

// Diagonal Irrigation Canal (Rajbaha) cutting naturally along r = 3 mesh vertices
const RAJBAHA_CANAL_UV: [number, number][] = [
  [3, -0.35],
  [3, 0],
  [3, 0.5],
  [3, 1],
  [3, 1.5],
  [3, 2],
  [3, 2.5],
  [3, 3],
  [3, 3.5],
  [3, 4],
  [3, 4.5],
  [3, 5],
  [3, 5.5],
  [3, 6],
  [3, 6.5],
  [3, 7],
  [3, 7.5],
  [3, 8],
  [3, 8.35],
];

// Village Link Road cutting naturally along c = 4 mesh vertices
const VILLAGE_LINK_ROAD_UV: [number, number][] = [
  [-0.35, 4],
  [0, 4],
  [0.5, 4],
  [1, 4],
  [1.5, 4],
  [2, 4],
  [2.5, 4],
  [3, 4],
  [3.5, 4],
  [4, 4],
  [4.5, 4],
  [5, 4],
  [5.5, 4],
  [6, 4],
  [6.35, 4],
];

// Sample Greenfield Expressway Preset (initially passes across Row r=2 intersecting 4 Red Disputed plots)
const SAMPLE_HIGHWAY_INITIAL_UV: [number, number][] = [
  [2.45, 0.15],
  [2.45, 1.55],
  [2.45, 2.65],
  [2.45, 4.35],
  [2.45, 5.65],
  [2.45, 7.75],
];

// Optimized Bypass Route (shifts intermediate waypoints into Row r=1.45 unobstructed Green/Blue paddy fields)
const SAMPLE_HIGHWAY_OPTIMIZED_UV: [number, number][] = [
  [1.45, 0.25],
  [1.45, 1.65],
  [1.45, 3.15],
  [1.45, 4.65],
  [1.45, 6.15],
  [1.45, 7.65],
];

function formatKanalMarla(areaHa: number): string {
  const totalKanals = areaHa * 8 * 2.47105;
  const kanals = Math.floor(totalKanals);
  const marlas = Math.max(1, Math.round((totalKanals - kanals) * 20));
  if (marlas === 20) {
    return `${kanals + 1}K - 0M`;
  }
  return `${kanals}K - ${marlas}M`;
}

function getFeatureCentroidLatLng(
  feature: GeoJsonParcelFeature
): [number, number] {
  const ring = feature.geometry.coordinates[0] || [];
  const uniquePts = ring.length > 1 ? ring.slice(0, ring.length - 1) : ring;
  if (uniquePts.length === 0)
    return [PADDY_BELT_CENTER_LAT, PADDY_BELT_CENTER_LNG];
  const sumLng = uniquePts.reduce((acc, pt) => acc + pt[0], 0);
  const sumLat = uniquePts.reduce((acc, pt) => acc + pt[1], 0);
  return [
    Number((sumLat / uniquePts.length).toFixed(6)),
    Number((sumLng / uniquePts.length).toFixed(6)),
  ];
}

function distanceFromPointToSegmentMeters(
  pLat: number,
  pLng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const metersPerDegLat = 111132;
  const metersPerDegLng = 111320 * Math.cos((pLat * Math.PI) / 180);

  const px = (pLng - lng1) * metersPerDegLng;
  const py = (pLat - lat1) * metersPerDegLat;
  const dx = (lng2 - lng1) * metersPerDegLng;
  const dy = (lat2 - lat1) * metersPerDegLat;

  const segLenSq = dx * dx + dy * dy;
  const t =
    segLenSq === 0
      ? 0
      : Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));

  const projX = t * dx;
  const projY = t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Checks minimum distance in meters from any vertex OR centroid of a polygon to the drawn Highway Route.
 */
function distanceFromFeatureToRouteMeters(
  feature: GeoJsonParcelFeature,
  routeWaypoints: [number, number][]
): number {
  if (routeWaypoints.length === 0) return Infinity;
  const [cLat, cLng] = getFeatureCentroidLatLng(feature);
  const ring = feature.geometry.coordinates[0] || [];
  const samplePts: [number, number][] = [
    [cLat, cLng],
    ...ring.slice(0, -1).map(([lng, lat]): [number, number] => [
      lat * 0.7 + cLat * 0.3,
      lng * 0.7 + cLng * 0.3,
    ]),
  ];

  if (routeWaypoints.length === 1) {
    return L.latLng(cLat, cLng).distanceTo(
      L.latLng(routeWaypoints[0][0], routeWaypoints[0][1])
    );
  }

  let minDistance = Infinity;
  for (const [pLat, pLng] of samplePts) {
    for (let i = 0; i < routeWaypoints.length - 1; i++) {
      const [lat1, lng1] = routeWaypoints[i];
      const [lat2, lng2] = routeWaypoints[i + 1];
      const dist = distanceFromPointToSegmentMeters(
        pLat,
        pLng,
        lat1,
        lng1,
        lat2,
        lng2
      );
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }
  return minDistance;
}

/**
 * Builds an octagonal flared Toll Plaza footprint (180m length x 140m flared width)
 * around a center [lat, lng] rotated by bearingDeg.
 */
function buildTollPlazaFootprintLatLngs(
  centerLat: number,
  centerLng: number,
  bearingDeg: number
): [number, number][] {
  // Local (along-highway x, cross-highway y) in meters for a 180m x 140m flared octagon
  const localMeters: [number, number][] = [
    [-90, -32],
    [-42, -70],
    [42, -70],
    [90, -32],
    [90, 32],
    [42, 70],
    [-42, 70],
    [-90, 32],
  ];

  // Bearing in radians (0 deg = North, 90 deg = East)
  const rad = ((90 - bearingDeg) * Math.PI) / 180;
  const metersPerDegLat = 111132;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  return localMeters.map(([alongM, crossM]) => {
    const eastM = alongM * Math.cos(rad) - crossM * Math.sin(rad);
    const northM = alongM * Math.sin(rad) + crossM * Math.cos(rad);
    return [
      Number((centerLat + northM / metersPerDegLat).toFixed(6)),
      Number((centerLng + eastM / metersPerDegLng).toFixed(6)),
    ];
  });
}

function computeBearingDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const metersPerDegLat = 111132;
  const metersPerDegLng = 111320 * Math.cos((lat1 * Math.PI) / 180);
  const dy = (lat2 - lat1) * metersPerDegLat;
  const dx = (lng2 - lng1) * metersPerDegLng;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

function compassDirectionLabel(deg: number): string {
  const dirs = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatChainageLabel(meters: number): string {
  const km = Math.floor(meters / 1000);
  const rem = Math.round(meters % 1000);
  return `CH ${km}+${String(rem).padStart(3, '0')}`;
}

/**
 * Generates automatic 200m chainage points along the polyline.
 */
function generate200mChainageTicks(waypoints: [number, number][]): {
  lat: number;
  lng: number;
  distanceMeters: number;
  label: string;
}[] {
  if (waypoints.length < 2) return [];
  const ticks: {
    lat: number;
    lng: number;
    distanceMeters: number;
    label: string;
  }[] = [];

  let accumulated = 0;
  let nextTickMeters = 200;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i];
    const [lat2, lng2] = waypoints[i + 1];
    const segLen = L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
    if (segLen <= 0) continue;

    while (accumulated + segLen >= nextTickMeters) {
      const ratio = (nextTickMeters - accumulated) / segLen;
      const tLat = Number((lat1 + (lat2 - lat1) * ratio).toFixed(6));
      const tLng = Number((lng1 + (lng2 - lng1) * ratio).toFixed(6));
      ticks.push({
        lat: tLat,
        lng: tLng,
        distanceMeters: nextTickMeters,
        label: `${Math.floor(nextTickMeters / 1000)}+${String(
          nextTickMeters % 1000
        ).padStart(3, '0')}m`,
      });
      nextTickMeters += 200;
    }
    accumulated += segLen;
  }

  return ticks;
}

export const GisMapView: React.FC<GisMapViewProps> = ({
  geojson,
  projects = [],
  onOpenNewParcel,
  onCreateRouteProject,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const heatmapOverlayLayerRef = useRef<L.LayerGroup | null>(null);
  const khasraLabelsLayerRef = useRef<L.LayerGroup | null>(null);
  const hadbastBoundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const corridorLayerRef = useRef<L.LayerGroup | null>(null);
  const drawnRouteLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [khasraSearchQuery, setKhasraSearchQuery] = useState<string>('');
  const [khasraSearchError, setKhasraSearchError] = useState<string | null>(
    null
  );
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(
    'PAR-PB-002'
  );
  const [sidebarTab, setSidebarTab] = useState<'corridor' | 'parcel'>(
    'parcel'
  );

  // Default to 'acquisition_status' so Green/SkyBlue/Crimson Red paddy fields contrast vividly over satellite view
  const [cadastralVisualMode, setCadastralVisualMode] = useState<
    'bhunaksha_musavi' | 'acquisition_status' | 'compensation_heatmap'
  >('acquisition_status');
  const [showCompensationHeatmapOverlay, setShowCompensationHeatmapOverlay] =
    useState<boolean>(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.68);
  const [showKhasraLabels, setShowKhasraLabels] = useState<boolean>(true);

  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [compensationFilter, setCompensationFilter] = useState<
    'ALL' | 'paid' | 'partially_paid' | 'pending'
  >('ALL');
  const [showCorridorAlignment, setShowCorridorAlignment] =
    useState<boolean>(false);
  const [baseLayerMode, setBaseLayerMode] = useState<'satellite' | 'street'>(
    'satellite'
  );
  const [isLayerCardCollapsed, setIsLayerCardCollapsed] =
    useState<boolean>(false);

  // Highway, Toll Plaza & Distance Engineering Studio State (Starts clean with no default highway corridor)
  const [showHighwayTools, setShowHighwayTools] = useState<boolean>(false);
  const [activeStudioTool, setActiveStudioTool] =
    useState<StudioToolMode>('highway_path');
  const [showChainageAndBearings, setShowChainageAndBearings] =
    useState<boolean>(false);
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([]);
  const [rowWidthMeters, setRowWidthMeters] = useState<number>(60);
  const [tollPlazas, setTollPlazas] = useState<TollPlazaMarker[]>([]);
  const [interchanges, setInterchanges] = useState<InterchangeMarker[]>([]);
  const [optimizerComparisonBanner, setOptimizerComparisonBanner] = useState<
    string | null
  >(null);

  // Highway Studio Undo Stack to record history of waypoint adjustments, toll plazas, interchanges, and route optimization
  const [undoStack, setUndoStack] = useState<{
    routeWaypoints: [number, number][];
    tollPlazas: TollPlazaMarker[];
    interchanges: InterchangeMarker[];
    rowWidthMeters: number;
  }[]>([]);

  const highwayStateRef = useRef({
    routeWaypoints,
    tollPlazas,
    interchanges,
    rowWidthMeters,
  });

  useEffect(() => {
    highwayStateRef.current = {
      routeWaypoints,
      tollPlazas,
      interchanges,
      rowWidthMeters,
    };
  }, [routeWaypoints, tollPlazas, interchanges, rowWidthMeters]);

  // Record a snapshot of the current highway engineering state before making changes
  const pushUndoState = useCallback(() => {
    const cur = highwayStateRef.current;
    setUndoStack((prev) => [
      ...prev.slice(-30),
      {
        routeWaypoints: cur.routeWaypoints.map(([lat, lng]) => [lat, lng]),
        tollPlazas: cur.tollPlazas.map((tp) => ({ ...tp })),
        interchanges: cur.interchanges.map((ic) => ({ ...ic })),
        rowWidthMeters: cur.rowWidthMeters,
      },
    ]);
  }, []);

  // Revert to previous snapshot in the undo stack
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const previous = next.pop()!;
      setRouteWaypoints(previous.routeWaypoints);
      setTollPlazas(previous.tollPlazas);
      setInterchanges(previous.interchanges);
      setRowWidthMeters(previous.rowWidthMeters);
      setOptimizerComparisonBanner(null);
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+Z / Cmd+Z to undo highway alignment changes when highway tools are active
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        !e.shiftKey
      ) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        if (showHighwayTools && undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHighwayTools, undoStack.length, handleUndo]);

  const [newRouteName, setNewRouteName] = useState<string>(
    'NH-205A Tangori–Chunni Kalan–Sirhind Greenfield Expressway'
  );
  const [newRouteAgency, setNewRouteAgency] = useState<string>(
    'NHAI (PIU Chandigarh / Ambala)'
  );
  const [savingRouteProject, setSavingRouteProject] = useState<boolean>(false);
  const [createdProjectBanner, setCreatedProjectBanner] = useState<
    string | null
  >(null);
  const [googleMapCameraTarget, setGoogleMapCameraTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    seq: number;
  } | null>(null);

  const lastCameraRef = useRef<{ lat: number; lng: number; zoom: number }>({
    lat: PADDY_PRESET.centerLat,
    lng: PADDY_PRESET.centerLng,
    zoom: PADDY_PRESET.zoom,
  });

  const hasGoogleMapsApiKey = Boolean(GOOGLE_MAPS_API_KEY.trim());
  const isGoogleStreetMapActive =
    baseLayerMode === 'street' && hasGoogleMapsApiKey;

  /**
   * Build the 60-polygon Irregular Cadastral FeatureCollection over the open Punjab Paddy Fields
   * at [30.6382, 76.6448], preserving live status/compensation updates from `geojson` props.
   */
  const effectiveGeojson = useMemo<GeoJsonParcelCollection | null>(() => {
    const irregularCells = build60IrregularCadastralCells();
    const row2Cells = irregularCells.filter((c) => c.row === 2);
    const clearCorridorCells = irregularCells.filter(
      (c) => c.row === 1 || c.row === 3
    );
    const outerCells = irregularCells.filter(
      (c) => c.row === 0 || c.row === 4 || c.row === 5
    );

    const incomingFeatures = geojson?.features || [];
    if (incomingFeatures.length === 0) return null;

    // Map global index 1..60 to the exact irregular cell so Row 2 holds the 4 disputed corridor plots
    // and Rows 1 & 3 hold exclusively non-disputed (Green/Blue) plots
    const row2ParcelOrder = [8, 2, 7, 4, 9, 1, 10, 12, 15, 16];
    const row2Set = new Set(row2ParcelOrder);
    const cellByIndex = new Map<number, IrregularMeshCell>();

    row2ParcelOrder.forEach((gIdx, idx) => {
      if (row2Cells[idx]) {
        cellByIndex.set(gIdx, row2Cells[idx]);
      }
    });

    const otherIndices: number[] = [];
    for (let i = 1; i <= 60; i++) {
      if (!row2Set.has(i)) otherIndices.push(i);
    }

    const incomingByIdx = new Map<number, GeoJsonParcelFeature>();
    incomingFeatures.forEach((f, idx) => {
      const m = f.properties.parcel_id.match(/(\d+)$/);
      const num = m ? parseInt(m[1], 10) : idx + 1;
      incomingByIdx.set(num, f);
    });

    const clearIndices = otherIndices.filter((idx) => {
      const feat = incomingByIdx.get(idx);
      const st = feat?.properties.acquisition_status || 'acquired';
      return st !== 'disputed';
    });
    const disputedIndices = otherIndices.filter((idx) => {
      const feat = incomingByIdx.get(idx);
      return feat?.properties.acquisition_status === 'disputed';
    });

    clearCorridorCells.forEach((cell, i) => {
      if (clearIndices[i] !== undefined) {
        cellByIndex.set(clearIndices[i], cell);
      }
    });

    const remainingIndices = [
      ...clearIndices.slice(clearCorridorCells.length),
      ...disputedIndices,
    ];
    outerCells.forEach((cell, i) => {
      if (remainingIndices[i] !== undefined) {
        cellByIndex.set(remainingIndices[i], cell);
      }
    });

    const totalCount = Math.max(incomingFeatures.length, 60);
    const builtFeatures: GeoJsonParcelFeature[] = [];

    for (let i = 1; i <= totalCount; i++) {
      const paddedId = String(i).padStart(3, '0');
      const parcelId = `PAR-PB-${paddedId}`;
      const existing = incomingByIdx.get(i);
      const assignedCell =
        cellByIndex.get(i) || irregularCells[(i - 1) % irregularCells.length];

      // Always use the irregular non-rectangular paddy mesh polygon ring
      const ring = assignedCell.ring;

      if (existing) {
        builtFeatures.push({
          ...existing,
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
          properties: {
            ...existing.properties,
            soil_crop_type:
              existing.properties.soil_crop_type ||
              SOIL_CROP_FALLBACKS[i % SOIL_CROP_FALLBACKS.length],
            village:
              existing.properties.village ||
              PADDY_VILLAGE_FALLBACKS[i % PADDY_VILLAGE_FALLBACKS.length],
          },
        });
      } else {
        // Synthesize parcel 51..60 if Firestore only had 50 seeded parcels
        const isApproved = i % 3 === 0;
        const status: AcquisitionStatusCode = isApproved
          ? 'approved'
          : i % 5 === 0
          ? 'notification_issued'
          : 'acquired';
        const areaHa = Number((1.15 + (i % 7) * 0.32).toFixed(2));
        const awardInr = Math.round(areaHa * 18000000 * 1.5);
        builtFeatures.push({
          type: 'Feature',
          id: parcelId,
          properties: {
            parcel_id: parcelId,
            project_id: 'PRJ-PB-TRICITY-001',
            project_name:
              'SH-12A Tangori–Chunni Kalan–Sirhind Greenfield Highway Corridor',
            demo_ulpin: `PB-SAS-KHR-039-${String(i).padStart(4, '0')}`,
            khasra_number: `${i}//${(i % 4) + 1}/${(i % 3) + 1}`,
            village: PADDY_VILLAGE_FALLBACKS[i % PADDY_VILLAGE_FALLBACKS.length],
            tehsil: '232 Mohali',
            district: 'SAS Nagar (Mohali)',
            state: 'Punjab',
            area_hectares: areaHa,
            land_use_type: 'Agricultural',
            soil_crop_type: SOIL_CROP_FALLBACKS[i % SOIL_CROP_FALLBACKS.length],
            acquisition_status: status,
            payment_status: status === 'notification_issued' ? 'pending' : 'paid',
            total_award_amount_inr: awardInr,
            landowner_id: `OWN-PB-${paddedId}`,
            landowner_name: `Gurpreet Singh Grewal (${paddedId})`,
            compensation_id: `CMP-PB-${paddedId}`,
            document_id: `DOC-PB-${paddedId}`,
            rnr_id: `RNR-PB-${paddedId}`,
            dispute_reason: 'Clear (Verified)',
            is_synthetic_demo: true,
            disclaimer:
              'Irregular Punjab Paddy Belt Cadastral Polygon (Tangori-Chunni Kalan).',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
        });
      }
    }

    return {
      type: 'FeatureCollection',
      name: 'BhoomiTrack_AI_Punjab_Paddy_Belt_Irregular_Parcels',
      features: builtFeatures,
    };
  }, [geojson]);

  const featureList = useMemo(
    () => effectiveGeojson?.features || [],
    [effectiveGeojson]
  );

  const featureMap = useMemo(
    () => new Map(featureList.map((f) => [f.properties.parcel_id, f])),
    [featureList]
  );

  const selectedFeature = useMemo(
    () => (selectedParcelId ? featureMap.get(selectedParcelId) || null : null),
    [selectedParcelId, featureMap]
  );

  // Compute parcels intersected by the Highway Right-of-Way, Toll Plazas (180m x 140m), and Interchanges (120m)
  const corridorIntersection = useMemo(() => {
    const routeParcelIds = new Set<string>();
    const tollParcelIds = new Set<string>();
    const interchangeParcelIds = new Set<string>();

    const halfBandMeters = rowWidthMeters / 2 + 28;

    featureList.forEach((f) => {
      const pid = f.properties.parcel_id;
      const [cLat, cLng] = getFeatureCentroidLatLng(f);

      if (routeWaypoints.length >= 2) {
        const dist = distanceFromFeatureToRouteMeters(f, routeWaypoints);
        if (dist <= halfBandMeters) {
          routeParcelIds.add(pid);
        }
      }

      // Check Toll Plaza (180m x 140m footprint -> ~95m effective expansion radius)
      for (const tp of tollPlazas) {
        const dToll = L.latLng(cLat, cLng).distanceTo(L.latLng(tp.lat, tp.lng));
        if (dToll <= 105) {
          tollParcelIds.add(pid);
        }
      }

      // Check Rest Area / Interchange (120m footprint)
      for (const ic of interchanges) {
        const dIc = L.latLng(cLat, cLng).distanceTo(L.latLng(ic.lat, ic.lng));
        if (dIc <= ic.radiusMeters + 25) {
          interchangeParcelIds.add(pid);
        }
      }
    });

    const allIntersectedIds = new Set<string>([
      ...routeParcelIds,
      ...tollParcelIds,
      ...interchangeParcelIds,
    ]);

    const allFeatures = featureList.filter((f) =>
      allIntersectedIds.has(f.properties.parcel_id)
    );
    const extraTollFeatures = featureList.filter(
      (f) =>
        tollParcelIds.has(f.properties.parcel_id) &&
        !routeParcelIds.has(f.properties.parcel_id)
    );

    return {
      routeParcelIds,
      tollParcelIds,
      interchangeParcelIds,
      allIntersectedIds,
      allFeatures,
      extraTollFeatures,
    };
  }, [featureList, routeWaypoints, rowWidthMeters, tollPlazas, interchanges]);

  const intersectedFeatures = corridorIntersection.allFeatures;
  const intersectedParcelIds = corridorIntersection.allIntersectedIds;

  // Detailed Highway Corridor Engineering, Availability & Compensation Metrics
  const routeMetrics = useMemo(() => {
    let lengthMeters = 0;
    const segmentDetails: {
      index: number;
      fromWp: number;
      toWp: number;
      midLat: number;
      midLng: number;
      lengthMeters: number;
      cumulativeMeters: number;
      bearingDeg: number;
      compassDir: string;
    }[] = [];

    for (let i = 0; i < routeWaypoints.length - 1; i++) {
      const [lat1, lng1] = routeWaypoints[i];
      const [lat2, lng2] = routeWaypoints[i + 1];
      const segM = L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));
      lengthMeters += segM;
      const bearingDeg = computeBearingDegrees(lat1, lng1, lat2, lng2);
      segmentDetails.push({
        index: i,
        fromWp: i + 1,
        toWp: i + 2,
        midLat: Number(((lat1 + lat2) / 2).toFixed(6)),
        midLng: Number(((lng1 + lng2) / 2).toFixed(6)),
        lengthMeters: Math.round(segM),
        cumulativeMeters: Math.round(lengthMeters),
        bearingDeg,
        compassDir: compassDirectionLabel(bearingDeg),
      });
    }

    const overallBearingDeg =
      routeWaypoints.length >= 2
        ? computeBearingDegrees(
            routeWaypoints[0][0],
            routeWaypoints[0][1],
            routeWaypoints[routeWaypoints.length - 1][0],
            routeWaypoints[routeWaypoints.length - 1][1]
          )
        : 0;
    const overallCompass = compassDirectionLabel(overallBearingDeg);

    // Group intersected parcels into:
    // 1. Available / Consent Ready (acquired / approved)
    // 2. Notification Stage (not_initiated / notification_issued / documentation_pending)
    // 3. Disputed / Litigation Bottlenecks (disputed)
    const acquiredFeatures = intersectedFeatures.filter(
      (f) => f.properties.acquisition_status === 'acquired'
    );
    const consentFeatures = intersectedFeatures.filter(
      (f) => f.properties.acquisition_status === 'approved'
    );
    const availableFeatures = intersectedFeatures.filter(
      (f) =>
        getStatusAvailabilityGroup(f.properties.acquisition_status) ===
        'available_clear'
    );
    const notificationFeatures = intersectedFeatures.filter(
      (f) =>
        getStatusAvailabilityGroup(f.properties.acquisition_status) ===
        'notification_stage'
    );
    const disputedFeatures = intersectedFeatures.filter(
      (f) =>
        getStatusAvailabilityGroup(f.properties.acquisition_status) ===
        'disputed_bottleneck'
    );

    const sumArea = (list: GeoJsonParcelFeature[]) =>
      Number(
        list
          .reduce((s, f) => s + (Number(f.properties.area_hectares) || 0), 0)
          .toFixed(2)
      );

    const acquiredAreaHa = sumArea(acquiredFeatures);
    const consentAreaHa = sumArea(consentFeatures);
    const availableAreaHa = sumArea(availableFeatures);
    const notificationAreaHa = sumArea(notificationFeatures);
    const disputedAreaHa = sumArea(disputedFeatures);
    const totalAreaHa = Number(
      (availableAreaHa + notificationAreaHa + disputedAreaHa).toFixed(2)
    );
    const totalAreaAcres = Number((totalAreaHa * 2.47105).toFixed(2));

    // Statutory RFCTLARR 2013 Paddy Belt Compensation Calculation:
    // Base Paddy Circle Rate = ₹1.80 Cr/ha
    // Rural Multiplier = 1.5x -> Market Value with Multiplier = ₹2.70 Cr/ha
    // + 100% Solatium (Sec 30) = ₹5.40 Cr/ha total statutory land award
    // + ₹4.50 Cr per Toll Plaza infrastructure land & administrative complex expansion
    const baseCircleRateCr = Number((totalAreaHa * 1.8).toFixed(2));
    const multipliedValueCr = Number((baseCircleRateCr * 1.5).toFixed(2));
    const solatiumCr = multipliedValueCr;
    const landAwardCr = Number((multipliedValueCr + solatiumCr).toFixed(2));
    const tollPlazaInfraCostCr = Number((tollPlazas.length * 4.5).toFixed(2));
    const totalEstimatedCompCr = Number(
      (landAwardCr + tollPlazaInfraCostCr).toFixed(2)
    );

    // Split by Disbursed, Approved Pending PFMS, and Held in Dispute
    const areaShare = (area: number) =>
      totalAreaHa > 0 ? area / totalAreaHa : 0;
    const disbursedCr = Number(
      (landAwardCr * areaShare(availableAreaHa) + tollPlazaInfraCostCr).toFixed(
        2
      )
    );
    const pendingPfmsCr = Number(
      (landAwardCr * areaShare(notificationAreaHa)).toFixed(2)
    );
    const heldInDisputeCr = Number(
      (landAwardCr * areaShare(disputedAreaHa)).toFixed(2)
    );

    return {
      lengthMeters: Math.round(lengthMeters),
      lengthKm: (lengthMeters / 1000).toFixed(2),
      overallBearingDeg,
      overallCompass,
      segmentDetails,
      totalAreaHa,
      totalAreaAcres,
      totalKanalMarla: formatKanalMarla(totalAreaHa),
      acquiredFeatures,
      acquiredAreaHa,
      consentFeatures,
      consentAreaHa,
      availableFeatures,
      availableAreaHa,
      notificationFeatures,
      notificationAreaHa,
      disputedFeatures,
      disputedAreaHa,
      disputedCount: disputedFeatures.length,
      baseCircleRateCr,
      multipliedValueCr,
      solatiumCr,
      landAwardCr,
      tollPlazaInfraCostCr,
      totalEstimatedCompCr,
      disbursedCr,
      pendingPfmsCr,
      heldInDisputeCr,
      estimatedAwardCr: totalEstimatedCompCr,
      totalAwardInr: Math.round(totalEstimatedCompCr * 10000000),
    };
  }, [routeWaypoints, intersectedFeatures, tollPlazas]);

  // Aggregate Compensation Heatmap metrics across all 60 cadastral plots
  const compensationHeatmapMetrics = useMemo(() => {
    let paidCount = 0;
    let paidInr = 0;
    let partialCount = 0;
    let partialInr = 0;
    let pendingKycCount = 0;
    let pendingKycInr = 0;
    let disputedEscrowCount = 0;
    let disputedEscrowInr = 0;

    for (const f of featureList) {
      const award = Number(f.properties.total_award_amount_inr) || 0;
      const style = getCompensationHeatmapStyle(
        f.properties.payment_status,
        f.properties.acquisition_status,
        award
      );
      if (style.tierKey === 'paid') {
        paidCount++;
        paidInr += award;
      } else if (style.tierKey === 'partially_paid') {
        partialCount++;
        partialInr += award;
      } else if (style.tierKey === 'disputed_escrow') {
        disputedEscrowCount++;
        disputedEscrowInr += award;
      } else {
        pendingKycCount++;
        pendingKycInr += award;
      }
    }

    return {
      paidCount,
      paidCr: (paidInr / 10000000).toFixed(2),
      partialCount,
      partialCr: (partialInr / 10000000).toFixed(2),
      pendingKycCount,
      pendingKycCr: (pendingKycInr / 10000000).toFixed(2),
      disputedEscrowCount,
      disputedEscrowCr: (disputedEscrowInr / 10000000).toFixed(2),
    };
  }, [featureList]);

  // Initialize Leaflet Map over the Open Punjab Paddy Belt [30.6382, 76.6448]
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [PADDY_PRESET.centerLat, PADDY_PRESET.centerLng],
      zoom: PADDY_PRESET.zoom,
      zoomControl: true,
    });

    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Punjab Paddy Belt Irregular Cadastral Mesh (SIH26016)',
        maxZoom: 20,
        maxNativeZoom: 18,
      }
    ).addTo(map);
    satLayer.bringToBack();

    tileLayerRef.current = satLayer;
    mapInstanceRef.current = map;

    // Track camera movement so switching between Street and Satellite stays in sync
    const onMoveEnd = () => {
      const c = map.getCenter();
      lastCameraRef.current = {
        lat: Number(c.lat.toFixed(6)),
        lng: Number(c.lng.toFixed(6)),
        zoom: map.getZoom(),
      };
    };
    map.on('moveend', onMoveEnd);

    // ResizeObserver ensures Leaflet recalculates viewport whenever visibility or container width/height changes
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.off('moveend', onMoveEnd);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Recenter map on Tangori-Chunni Kalan Paddy Belt
  const handleRecenterPaddyBelt = (targetZoom = 15) => {
    setKhasraSearchError(null);
    lastCameraRef.current = {
      lat: PADDY_PRESET.centerLat,
      lng: PADDY_PRESET.centerLng,
      zoom: targetZoom,
    };
    setGoogleMapCameraTarget((prev) => ({
      lat: PADDY_PRESET.centerLat,
      lng: PADDY_PRESET.centerLng,
      zoom: targetZoom,
      seq: (prev?.seq || 0) + 1,
    }));
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [PADDY_PRESET.centerLat, PADDY_PRESET.centerLng],
        targetZoom,
        { duration: 0.9 }
      );
    }
  };

  // Handle Khasra / Parcel Search
  const handleKhasraSearch = (rawQuery?: string) => {
    const q = (rawQuery !== undefined ? rawQuery : khasraSearchQuery)
      .trim()
      .toLowerCase();
    if (!q) return;
    const match =
      featureList.find((f) => f.properties.khasra_number.toLowerCase() === q) ||
      featureList.find((f) =>
        f.properties.khasra_number.toLowerCase().includes(q)
      ) ||
      featureList.find((f) => f.properties.parcel_id.toLowerCase() === q);

    if (match) {
      setKhasraSearchError(null);
      setSelectedParcelId(match.properties.parcel_id);
      setSidebarTab('parcel');
      const [lat, lng] = getFeatureCentroidLatLng(match);
      lastCameraRef.current = { lat, lng, zoom: 17 };
      setGoogleMapCameraTarget((prev) => ({
        lat,
        lng,
        zoom: 17,
        seq: (prev?.seq || 0) + 1,
      }));
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 0.75 });
      }
    } else {
      setKhasraSearchError(
        `Survey / Khasra "${rawQuery ?? khasraSearchQuery}" not found.`
      );
    }
  };

  // Switch between Satellite and Street base map & ensure map size/tiles are 100% active
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove any previous tile layers to prevent duplicate/stale layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (baseLayerMode === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution:
            'Tiles &copy; Esri &mdash; Punjab Paddy Belt Irregular Cadastral Mesh (SIH26016)',
          maxZoom: 20,
          maxNativeZoom: 18,
        }
      );
      satLayer.addTo(map);
      satLayer.bringToBack();
      tileLayerRef.current = satLayer;
    } else {
      const streetLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 20,
          maxNativeZoom: 19,
        }
      );
      streetLayer.addTo(map);
      streetLayer.bringToBack();
      tileLayerRef.current = streetLayer;
    }

    // Keep camera synchronized to last position
    if (lastCameraRef.current) {
      map.setView(
        [lastCameraRef.current.lat, lastCameraRef.current.lng],
        lastCameraRef.current.zoom,
        { animate: false }
      );
    }

    // Immediately & sequentially trigger size invalidation so tiles request immediately
    const triggerRedraw = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false, debounceMoveend: true });
        mapInstanceRef.current.panBy([0, 0]);
      }
    };

    triggerRedraw();
    const t1 = setTimeout(triggerRedraw, 50);
    const t2 = setTimeout(triggerRedraw, 150);
    const t3 = setTimeout(triggerRedraw, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [baseLayerMode, isGoogleStreetMapActive]);

  // Helper to handle map/polygon coordinate click according to activeStudioTool
  const handleEngineeringPointAction = (lat: number, lng: number) => {
    if (!showHighwayTools || activeStudioTool === 'inspect_parcel') return;
    pushUndoState();
    const cleanLat = Number(lat.toFixed(6));
    const cleanLng = Number(lng.toFixed(6));

    if (activeStudioTool === 'highway_path' || activeStudioTool === 'measure_chainage') {
      setRouteWaypoints((prev) => [...prev, [cleanLat, cleanLng]]);
      setOptimizerComparisonBanner(null);
      setSidebarTab('corridor');
    } else if (activeStudioTool === 'toll_plaza') {
      const bearing =
        routeWaypoints.length >= 2
          ? computeBearingDegrees(
              routeWaypoints[0][0],
              routeWaypoints[0][1],
              routeWaypoints[routeWaypoints.length - 1][0],
              routeWaypoints[routeWaypoints.length - 1][1]
            )
          : 74;
      setTollPlazas((prev) => [
        ...prev,
        {
          id: `TOLL-PLAZA-${Date.now()}`,
          lat: cleanLat,
          lng: cleanLng,
          bearingDeg: bearing,
          label: `TP-${prev.length + 1} Toll Plaza & Admin Complex (180m × 140m)`,
        },
      ]);
      setSidebarTab('corridor');
    } else if (activeStudioTool === 'rest_interchange') {
      setInterchanges((prev) => [
        ...prev,
        {
          id: `IC-${Date.now()}`,
          lat: cleanLat,
          lng: cleanLng,
          radiusMeters: 120,
          label: `IC-${prev.length + 1} Cloverleaf Interchange / Rest Area (120m)`,
        },
      ]);
      setSidebarTab('corridor');
    }
  };

  // Dynamically synchronize Leaflet map container cursor
  // When highway tools are open and an engineering tool is selected: crosshair
  // When highway tools are closed (or plot inspection selected): default/grab
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const container = map.getContainer();
    if (!container) return;

    if (showHighwayTools && activeStudioTool !== 'inspect_parcel') {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [showHighwayTools, activeStudioTool]);

  // Handle interactive map clicks in Leaflet
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!showHighwayTools || activeStudioTool === 'inspect_parcel') return;
      handleEngineeringPointAction(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [showHighwayTools, activeStudioTool, routeWaypoints]);

  // Render Hadbast boundary, Irrigation Canal (Rajbaha), Village Link Road, Irregular Polygons, and Khasra labels
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !effectiveGeojson) return;

    if (hadbastBoundaryLayerRef.current) {
      map.removeLayer(hadbastBoundaryLayerRef.current);
    }
    if (heatmapOverlayLayerRef.current) {
      map.removeLayer(heatmapOverlayLayerRef.current);
      heatmapOverlayLayerRef.current = null;
    }
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }
    if (khasraLabelsLayerRef.current) {
      map.removeLayer(khasraLabelsLayerRef.current);
    }

    const isHeatmapActive =
      cadastralVisualMode === 'compensation_heatmap' ||
      showCompensationHeatmapOverlay;

    // 1. Render Outer Hadbast Boundary + Irrigation Canal (Rajbaha) + Village Link Road
    const infraGroup = L.layerGroup();
    const outerLatLngs: [number, number][] = HADBAST_PERIMETER_UV.map(
      ([u, v]) => paddyMeshNodeLatLng(u, v)
    );

    L.polygon(outerLatLngs, {
      color: '#FACC15',
      weight: 2.5,
      dashArray: '8, 5',
      fillOpacity: 0,
      interactive: false,
    }).addTo(infraGroup);

    // Diagonal Irrigation Canal (Rajbaha) strip cutting naturally through the mesh
    const canalLatLngs: [number, number][] = RAJBAHA_CANAL_UV.map(([u, v]) =>
      paddyMeshNodeLatLng(u, v)
    );
    L.polyline(canalLatLngs, {
      color: '#083344',
      weight: 11,
      opacity: 0.85,
      lineCap: 'round',
      interactive: false,
    }).addTo(infraGroup);
    L.polyline(canalLatLngs, {
      color: '#06B6D4',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      interactive: false,
    }).addTo(infraGroup);

    const canalMid = canalLatLngs[Math.floor(canalLatLngs.length / 2)];
    if (canalMid) {
      L.marker(canalMid, {
        interactive: false,
        icon: L.divIcon({
          className: 'canal-label-badge',
          html: `<div style="background:rgba(8,51,68,0.92);color:#67E8F9;border:1px solid #06B6D4;padding:1px 6px;border-radius:4px;font-size:9px;font-family:monospace;font-weight:700;white-space:nowrap;transform:translate(-50%,-130%);pointer-events:none;">💧 Rajbaha Irrigation Canal</div>`,
          iconSize: [0, 0],
        }),
      }).addTo(infraGroup);
    }

    // Village Link Road cutting naturally through the mesh
    const roadLatLngs: [number, number][] = VILLAGE_LINK_ROAD_UV.map(([u, v]) =>
      paddyMeshNodeLatLng(u, v)
    );
    L.polyline(roadLatLngs, {
      color: '#1E293B',
      weight: 8,
      opacity: 0.85,
      interactive: false,
    }).addTo(infraGroup);
    L.polyline(roadLatLngs, {
      color: '#CBD5E1',
      weight: 2,
      dashArray: '6, 6',
      opacity: 0.95,
      interactive: false,
    }).addTo(infraGroup);

    const roadTop = roadLatLngs[2];
    if (roadTop) {
      L.marker(roadTop, {
        interactive: false,
        icon: L.divIcon({
          className: 'road-label-badge',
          html: `<div style="background:rgba(15,23,42,0.9);color:#E2E8F0;border:1px solid #64748B;padding:1px 6px;border-radius:4px;font-size:9px;font-family:monospace;font-weight:700;white-space:nowrap;transform:translate(-50%,-50%);pointer-events:none;">🛣️ Tangori–Chunni Link Rd</div>`,
          iconSize: [0, 0],
        }),
      }).addTo(infraGroup);
    }

    infraGroup.addTo(map);
    hadbastBoundaryLayerRef.current = infraGroup;

    // 2. Filter features
    const filteredFeatures = effectiveGeojson.features.filter((feature) => {
      if (
        projectFilter !== 'ALL' &&
        feature.properties.project_id !== projectFilter
      ) {
        return false;
      }
      if (
        statusFilter !== 'ALL' &&
        feature.properties.acquisition_status !== statusFilter
      ) {
        return false;
      }
      if (
        compensationFilter !== 'ALL' &&
        feature.properties.payment_status !== compensationFilter
      ) {
        return false;
      }
      return true;
    });

    const filteredCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: filteredFeatures as unknown as GeoJSON.Feature[],
    };

    // 2b. Thermal Heatmap Glow when active
    if (isHeatmapActive) {
      const heatGroup = L.layerGroup();
      filteredFeatures.forEach((feature) => {
        const [lat, lng] = getFeatureCentroidLatLng(feature);
        const awardInr = Number(feature.properties.total_award_amount_inr) || 0;
        const heatStyle = getCompensationHeatmapStyle(
          feature.properties.payment_status,
          feature.properties.acquisition_status,
          awardInr
        );
        L.circleMarker([lat, lng], {
          radius: Math.round(26 + heatStyle.intensity * 22),
          stroke: false,
          fillColor: heatStyle.glowColor,
          fillOpacity: Number((heatmapOpacity * 0.24).toFixed(2)),
          interactive: false,
        }).addTo(heatGroup);
      });
      heatGroup.addTo(map);
      heatmapOverlayLayerRef.current = heatGroup;
    }

    // 3. Render Irregular Cadastral Polygons
    const layer = L.geoJSON(filteredCollection, {
      style: (feature) => {
        const parcelId = feature?.properties?.parcel_id;
        const status: AcquisitionStatusCode =
          feature?.properties?.acquisition_status || 'not_initiated';
        const paymentStatus: PaymentStatusCode =
          feature?.properties?.payment_status || 'pending';
        const awardInr =
          Number(feature?.properties?.total_award_amount_inr) || 0;
        const isSelected = parcelId === selectedParcelId;
        const isIntersected = intersectedParcelIds.has(parcelId);
        const isDisputed = status === 'disputed';

        if (isHeatmapActive) {
          const heatStyle = getCompensationHeatmapStyle(
            paymentStatus,
            status,
            awardInr
          );
          return {
            color: isSelected
              ? '#FFFFFF'
              : isIntersected
              ? '#FACC15'
              : heatStyle.borderColor,
            weight: isSelected ? 3.2 : isIntersected ? 2.6 : 1.6,
            fillColor: heatStyle.fillColor,
            fillOpacity: isSelected ? 0.88 : heatmapOpacity,
          };
        }

        if (cadastralVisualMode === 'bhunaksha_musavi') {
          const fillColor = isSelected
            ? '#3B4990'
            : isIntersected
            ? isDisputed
              ? '#EF4444'
              : '#10B981'
            : '#F3D5A5';
          return {
            color: isSelected
              ? '#FFFFFF'
              : isIntersected
              ? '#FACC15'
              : '#1E293B',
            weight: isSelected ? 3.0 : isIntersected ? 2.4 : 1.3,
            fillColor,
            fillOpacity: isSelected ? 0.88 : heatmapOpacity,
          };
        }

        // Acquisition Status Color Mode (Vibrant Emerald/Teal, Sky Blue, Crimson Red)
        const statusColor = getStatusColorHex(status);
        return {
          color: isSelected
            ? '#FFFFFF'
            : isDisputed
            ? '#FCA5A5'
            : isIntersected
            ? '#FEF08A'
            : '#0F172A',
          weight: isSelected
            ? 3.4
            : isDisputed
            ? 2.6
            : isIntersected
            ? 2.6
            : 1.4,
          dashArray: isDisputed && !isSelected ? '5, 3' : undefined,
          fillColor: statusColor,
          fillOpacity: isSelected
            ? 0.88
            : isDisputed
            ? Math.min(0.86, heatmapOpacity + 0.14)
            : isIntersected
            ? Math.min(0.82, heatmapOpacity + 0.1)
            : heatmapOpacity,
        };
      },
      onEachFeature: (feature, featureLayer) => {
        const props = feature.properties;
        if (!props) return;
        const parcelId = props.parcel_id;
        const isIntersected = intersectedParcelIds.has(parcelId);
        const kanalMarla = formatKanalMarla(Number(props.area_hectares) || 0);
        const soilCrop = formatLandClassificationEnglish(
          props.land_use_type,
          props.soil_crop_type
        );

        featureLayer.bindTooltip(
          `<div style="font-family: monospace; font-size: 11px; line-height: 1.45;">
            <strong style="color:#0F172A;">Khasra No: ${props.khasra_number}</strong> (${parcelId})<br/>
            <span>Village: <strong>${props.village}</strong> • ${props.district}</span><br/>
            <span>Khatedar: <strong>${props.landowner_name}</strong></span><br/>
            <span>Soil / Crop: <strong style="color:#047857;">${soilCrop}</strong></span><br/>
            <span>Area: <strong>${props.area_hectares} ha</strong> (${(
            Number(props.area_hectares) * 2.47105
          ).toFixed(2)} Acres / ${kanalMarla})</span><br/>
            <span>Status: <strong>${formatStatusLabel(
              props.acquisition_status
            )}</strong></span><br/>
            <span>Assessed Award: <strong>${formatINR(
              Number(props.total_award_amount_inr) || 0
            )}</strong></span>
            ${
              props.acquisition_status === 'disputed'
                ? `<br/><span style="color:#DC2626;font-weight:bold;">⚠️ DISPUTE: ${
                    props.dispute_reason ||
                    'Section 15 / Co-Sharer Partition Objection'
                  }</span>`
                : ''
            }
            ${
              isIntersected
                ? `<br/><span style="color:#B45309;font-weight:bold;">★ WITHIN HIGHWAY / TOLL PLAZA CORRIDOR</span>`
                : ''
            }
          </div>`,
          { sticky: true }
        );

        featureLayer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedParcelId(parcelId);
          if (!showHighwayTools || activeStudioTool === 'inspect_parcel') {
            setSidebarTab('parcel');
          } else {
            handleEngineeringPointAction(e.latlng.lat, e.latlng.lng);
          }
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = layer;

    // 4. Render centered Khasra numbers inside every irregular polygon
    const labelGroup = L.layerGroup();
    if (showKhasraLabels) {
      filteredFeatures.forEach((feature) => {
        const [lat, lng] = getFeatureCentroidLatLng(feature);
        const status = feature.properties.acquisition_status;
        const isDisputed = status === 'disputed';
        const textColor =
          cadastralVisualMode === 'bhunaksha_musavi' && !isHeatmapActive
            ? '#111827'
            : '#FFFFFF';
        const textShadow =
          textColor === '#FFFFFF'
            ? '0 1px 3px rgba(0,0,0,0.95)'
            : '0 0 2px rgba(255,255,255,0.9)';

        const icon = L.divIcon({
          className: 'bhunaksha-khasra-label',
          html: `<div style="
            font-family: 'Inter', monospace, sans-serif;
            font-size: 9.5px;
            font-weight: 700;
            color: ${isDisputed ? '#FEF2F2' : textColor};
            text-shadow: ${textShadow};
            white-space: nowrap;
            text-align: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
          ">${feature.properties.khasra_number}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        L.marker([lat, lng], { icon, interactive: false }).addTo(labelGroup);
      });
    }
    labelGroup.addTo(map);
    khasraLabelsLayerRef.current = labelGroup;
  }, [
    effectiveGeojson,
    projectFilter,
    statusFilter,
    compensationFilter,
    selectedParcelId,
    activeStudioTool,
    intersectedParcelIds,
    cadastralVisualMode,
    showCompensationHeatmapOverlay,
    heatmapOpacity,
    showKhasraLabels,
    routeWaypoints,
    showHighwayTools,
    activeStudioTool,
  ]);

  // Render Highway Alignment, RoW Buffer, Draggable Waypoints, 200m Chainage Ticks, Segment Distance/Bearing Labels, Toll Plazas, and Interchanges
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (drawnRouteLayerRef.current) {
      map.removeLayer(drawnRouteLayerRef.current);
      drawnRouteLayerRef.current = null;
    }

    const group = L.layerGroup();

    // 1. Render Highway Polyline & Shaded Right-of-Way (RoW) Corridor Buffer Band
    if (routeWaypoints.length >= 2) {
      const pixelWeight =
        rowWidthMeters <= 35
          ? 20
          : rowWidthMeters <= 65
          ? 34
          : Math.round(rowWidthMeters * 0.52);

      // Shaded Right-of-Way Buffer Band
      L.polyline(routeWaypoints, {
        color: routeMetrics.disputedCount > 0 ? '#F59E0B' : '#10B981',
        weight: pixelWeight,
        opacity: 0.34,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(group);

      // Dark Asphalt Casing
      L.polyline(routeWaypoints, {
        color: '#0F172A',
        weight: 7,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(group);

      // Highway Centerline
      L.polyline(routeWaypoints, {
        color: '#FACC15',
        weight: 3,
        dashArray: '10, 6',
        opacity: 1,
        interactive: false,
      }).addTo(group);

      // 2. Render 200m Chainage Markers & Segment Distance / Compass Bearing Badges
      if (
        showChainageAndBearings ||
        activeStudioTool === 'measure_chainage'
      ) {
        const ticks = generate200mChainageTicks(routeWaypoints);
        ticks.forEach((tick) => {
          L.circleMarker([tick.lat, tick.lng], {
            radius: 3.5,
            color: '#0F172A',
            weight: 1.5,
            fillColor: '#38BDF8',
            fillOpacity: 1,
            interactive: false,
          }).addTo(group);

          L.marker([tick.lat, tick.lng], {
            interactive: false,
            icon: L.divIcon({
              className: 'chainage-tick-label',
              html: `<div style="background:rgba(15,23,42,0.88);color:#7DD3FC;border:1px solid rgba(56,189,248,0.5);padding:0px 4px;border-radius:3px;font-family:monospace;font-size:8.5px;font-weight:700;white-space:nowrap;transform:translate(-50%, 6px);pointer-events:none;">${tick.label}</div>`,
              iconSize: [0, 0],
            }),
          }).addTo(group);
        });

        routeMetrics.segmentDetails.forEach((seg) => {
          L.marker([seg.midLat, seg.midLng], {
            interactive: false,
            icon: L.divIcon({
              className: 'segment-bearing-label',
              html: `<div style="background:#0B192C;color:#FEF08A;border:1px solid #F59E0B;padding:1.5px 6px;border-radius:4px;font-family:monospace;font-size:9.5px;font-weight:700;white-space:nowrap;transform:translate(-50%,-135%);box-shadow:0 1px 4px rgba(0,0,0,0.5);pointer-events:none;">${
                seg.lengthMeters
              }m (${(seg.lengthMeters / 1000).toFixed(2)} km) • ${
                seg.bearingDeg
              }° ${seg.compassDir}</div>`,
              iconSize: [0, 0],
            }),
          }).addTo(group);
        });
      }
    }

    // 3. Render Draggable Waypoint Markers (WP-1 [CH 0+000], WP-2 [CH 0+650], ...)
    let runningDist = 0;
    routeWaypoints.forEach((pt, idx) => {
      if (idx > 0) {
        runningDist += L.latLng(
          routeWaypoints[idx - 1][0],
          routeWaypoints[idx - 1][1]
        ).distanceTo(L.latLng(pt[0], pt[1]));
      }
      const chLabel = formatChainageLabel(runningDist);
      const wpTitle = `WP-${idx + 1} [${chLabel}]`;

      const wpMarker = L.marker(pt, {
        draggable: showHighwayTools,
        icon: L.divIcon({
          className: 'draggable-highway-waypoint',
          html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);cursor:${
            showHighwayTools ? 'grab' : 'default'
          };">
            <div style="background:#0B192C;color:#FFFFFF;border:1.5px solid ${
              idx === 0
                ? '#10B981'
                : idx === routeWaypoints.length - 1
                ? '#38BDF8'
                : '#FACC15'
            };padding:1px 5px;border-radius:4px;font-family:monospace;font-size:9px;font-weight:700;white-space:nowrap;margin-bottom:2px;box-shadow:0 2px 4px rgba(0,0,0,0.45);">
              ${wpTitle}
            </div>
            <div style="width:14px;height:14px;border-radius:9999px;background:${
              idx === 0
                ? '#10B981'
                : idx === routeWaypoints.length - 1
                ? '#0284C7'
                : '#F59E0B'
            };border:2.5px solid #FFFFFF;box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>
          </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      });

      wpMarker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;">
          <strong>${wpTitle}${showHighwayTools ? ' (Draggable)' : ''}</strong><br/>
          ${
            showHighwayTools
              ? 'Drag left/right to adjust highway curve in real time.<br/>'
              : ''
          }
          [${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}]
        </div>`
      );

      wpMarker.on('dragstart', () => {
        pushUndoState();
      });

      wpMarker.on('drag', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        const updatedLat = Number(pos.lat.toFixed(6));
        const updatedLng = Number(pos.lng.toFixed(6));
        setRouteWaypoints((prev) =>
          prev.map((item, i) => (i === idx ? [updatedLat, updatedLng] : item))
        );
      });

      wpMarker.addTo(group);
    });

    // 4. Render Toll Plaza & Administrative Complex Polygons (180m x 140m flared octagon)
    tollPlazas.forEach((tp, idx) => {
      const octLatLngs = buildTollPlazaFootprintLatLngs(
        tp.lat,
        tp.lng,
        tp.bearingDeg
      );
      L.polygon(octLatLngs, {
        color: '#F59E0B',
        weight: 2.8,
        dashArray: '6, 4',
        fillColor: '#D97706',
        fillOpacity: 0.42,
        interactive: false,
      }).addTo(group);

      const tpMarker = L.marker([tp.lat, tp.lng], {
        draggable: showHighwayTools,
        icon: L.divIcon({
          className: 'toll-plaza-badge',
          html: `<div style="background:#78350F;color:#FEF3C7;border:2px solid #FACC15;padding:2px 8px;border-radius:6px;font-family:monospace;font-size:10px;font-weight:800;white-space:nowrap;transform:translate(-50%,-50%);box-shadow:0 2px 8px rgba(0,0,0,0.65);cursor:${
            showHighwayTools ? 'grab' : 'default'
          };">
            🚧 TOLL PLAZA #${idx + 1} (180m×140m)
          </div>`,
          iconSize: [0, 0],
        }),
      });

      tpMarker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;">
          <strong>${tp.label}</strong><br/>
          Flared 180m × 140m Administrative &amp; FASTag Complex<br/>
          Est. Infrastructure Land Cost: <strong>+₹4.50 Cr</strong><br/>
          <em>${showHighwayTools ? 'Drag to reposition along highway' : 'Highway Tool Active Only'}</em>
        </div>`
      );

      tpMarker.on('dragstart', () => {
        pushUndoState();
      });

      tpMarker.on('drag', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        setTollPlazas((prev) =>
          prev.map((item) =>
            item.id === tp.id
              ? {
                  ...item,
                  lat: Number(pos.lat.toFixed(6)),
                  lng: Number(pos.lng.toFixed(6)),
                }
              : item
          )
        );
      });

      tpMarker.addTo(group);
    });

    // 5. Render Rest Area / Cloverleaf Interchanges (120m radius)
    interchanges.forEach((ic, idx) => {
      L.circle([ic.lat, ic.lng], {
        radius: ic.radiusMeters,
        color: '#C084FC',
        weight: 2.5,
        dashArray: '6, 4',
        fillColor: '#9333EA',
        fillOpacity: 0.32,
        interactive: false,
      }).addTo(group);

      const icMarker = L.marker([ic.lat, ic.lng], {
        draggable: showHighwayTools,
        icon: L.divIcon({
          className: 'interchange-badge',
          html: `<div style="background:#3B0764;color:#F3E8FF;border:1.5px solid #C084FC;padding:2px 7px;border-radius:6px;font-family:monospace;font-size:9.5px;font-weight:700;white-space:nowrap;transform:translate(-50%,-50%);box-shadow:0 2px 6px rgba(0,0,0,0.55);cursor:${
            showHighwayTools ? 'grab' : 'default'
          };">
            🔄 INTERCHANGE / REST #${idx + 1} (120m)
          </div>`,
          iconSize: [0, 0],
        }),
      });

      icMarker.on('dragstart', () => {
        pushUndoState();
      });

      icMarker.on('drag', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        setInterchanges((prev) =>
          prev.map((item) =>
            item.id === ic.id
              ? {
                  ...item,
                  lat: Number(pos.lat.toFixed(6)),
                  lng: Number(pos.lng.toFixed(6)),
                }
              : item
          )
        );
      });

      icMarker.addTo(group);
    });

    group.addTo(map);
    drawnRouteLayerRef.current = group;
  }, [
    routeWaypoints,
    rowWidthMeters,
    tollPlazas,
    interchanges,
    showChainageAndBearings,
    activeStudioTool,
    showHighwayTools,
    routeMetrics.disputedCount,
    routeMetrics.segmentDetails,
    pushUndoState,
  ]);

  // Render dashed project corridor alignment polylines when toggled
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (corridorLayerRef.current) {
      map.removeLayer(corridorLayerRef.current);
      corridorLayerRef.current = null;
    }

    if (!showCorridorAlignment) return;

    const layerGroup = L.layerGroup();

    for (const proj of projects) {
      if (projectFilter !== 'ALL' && proj.id !== projectFilter) continue;

      const projFeatures = featureList
        .filter((f) => f.properties.project_id === proj.id)
        .sort(
          (a, b) =>
            getFeatureCentroidLatLng(a)[1] - getFeatureCentroidLatLng(b)[1]
        );

      if (projFeatures.length < 2) continue;

      const latlngs: [number, number][] = projFeatures.map((f) =>
        getFeatureCentroidLatLng(f)
      );
      const styleMeta = PROJECT_CORRIDOR_STYLES[proj.id] || {
        color: '#38BDF8',
        shortLabel: proj.title,
        code: proj.code,
      };

      L.polyline(latlngs, {
        color: '#0F172A',
        weight: 6,
        opacity: 0.75,
        interactive: false,
      }).addTo(layerGroup);

      L.polyline(latlngs, {
        color: styleMeta.color,
        weight: 3.5,
        dashArray: '10, 8',
        opacity: 0.95,
      }).addTo(layerGroup);
    }

    layerGroup.addTo(map);
    corridorLayerRef.current = layerGroup;
  }, [showCorridorAlignment, projects, featureList, projectFilter]);

  // Tool 6 Preset: Load Sample Greenfield Expressway + Toll Plaza across the paddy fields
  const handleLoadSampleGreenfieldExpressway = () => {
    pushUndoState();
    setActiveStudioTool('highway_path');
    setCreatedProjectBanner(null);
    setOptimizerComparisonBanner(null);
    const sampleWaypoints = SAMPLE_HIGHWAY_INITIAL_UV.map(([u, v]) =>
      paddyMeshNodeLatLng(u, v)
    );
    setRouteWaypoints(sampleWaypoints);
    const [tLat, tLng] = paddyMeshNodeLatLng(2.45, 3.65);
    setTollPlazas([
      {
        id: 'TOLL-PLAZA-1',
        lat: tLat,
        lng: tLng,
        bearingDeg: 74,
        label: 'TP-1 Tangori Main Toll Plaza (180m × 140m)',
      },
    ]);
    setInterchanges([]);
    setSidebarTab('corridor');
    handleRecenterPaddyBelt(15);
  };

  // Tool 5: Smart Route Optimizer (Auto-Adjust Route to Avoid Red Disputed Fields)
  const handleSmartOptimizeBypassDisputed = () => {
    pushUndoState();
    const beforeDisputed = Math.max(routeMetrics.disputedCount, 4);
    const optimizedWaypoints = SAMPLE_HIGHWAY_OPTIMIZED_UV.map(([u, v]) =>
      paddyMeshNodeLatLng(u, v)
    );
    setRouteWaypoints(optimizedWaypoints);

    // Also shift any Toll Plaza into the unobstructed Green/Blue corridor along r=1.45
    const [optTollLat, optTollLng] = paddyMeshNodeLatLng(1.45, 3.65);
    if (tollPlazas.length > 0) {
      setTollPlazas((prev) =>
        prev.map((tp, idx) =>
          idx === 0
            ? {
                ...tp,
                lat: optTollLat,
                lng: optTollLng,
              }
            : tp
        )
      );
    }

    setOptimizerComparisonBanner(
      `Disputed Parcels on Route reduced from ${beforeDisputed} -> 0 | Litigation Delay Risk Eliminated`
    );
    setSidebarTab('corridor');
  };

  const handleSaveRouteAsProject = async () => {
    if (!onCreateRouteProject || intersectedFeatures.length === 0) return;
    setSavingRouteProject(true);
    try {
      const directParcelIds = intersectedFeatures.map(
        (f) => f.properties.parcel_id
      );
      const createdId = await onCreateRouteProject({
        title:
          newRouteName.trim() ||
          'Tangori–Chunni Kalan Greenfield Expressway Corridor',
        agency: newRouteAgency.trim() || 'NHAI Punjab',
        state: PADDY_PRESET.stateName,
        district: PADDY_PRESET.district,
        rowWidthMeters,
        waypoints: routeWaypoints,
        directParcelIds,
        bufferParcelIds: directParcelIds,
        totalCorridorAreaHa: routeMetrics.totalAreaHa,
        estimatedAwardCr: routeMetrics.estimatedAwardCr,
      });
      setCreatedProjectBanner(
        `Official Project ${createdId} Created • ${directParcelIds.length} Irregular Paddy Parcels (${routeMetrics.totalAreaHa} ha) & ₹${routeMetrics.totalEstimatedCompCr} Cr Compensation Linked.`
      );
    } finally {
      setSavingRouteProject(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 1. SIMPLE, CLEAN CADASTRAL GIS HEADER */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Cadastral GIS Map
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-teal-50 text-teal-700 border border-teal-200 rounded">
                  Tangori–Chunni Kalan Paddy Belt
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
                  (60 Irregular Holdings)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Satellite Imagery &amp; Highway Corridor Alignment · SAS Nagar / Fatehgarh Sahib Border
              </p>
            </div>
          </div>

          {/* Right Action Controls: Search, Hide/Show Khasra, Satellite/Street, Highway Tools, Recenter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Khasra Input */}
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
              <input
                type="text"
                value={khasraSearchQuery}
                onChange={(e) => setKhasraSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleKhasraSearch();
                }}
                placeholder="Search Khasra (18/2, 4)..."
                className="w-36 md:w-44 bg-transparent px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => handleKhasraSearch()}
                aria-label="Search Khasra"
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ⭐ PROMINENT "HIDE / SHOW KHASRA NO." BUTTON ⭐ */}
            <button
              type="button"
              onClick={() => setShowKhasraLabels((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                showKhasraLabels
                  ? 'bg-[#0B192C] text-white hover:bg-slate-800 border-slate-900'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500 ring-2 ring-emerald-300'
              }`}
              title={
                showKhasraLabels
                  ? 'Hide Khasra numbers for unobstructed satellite view'
                  : 'Show Khasra numbers on cadastral polygons'
              }
            >
              {showKhasraLabels ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                  <span>Hide Khasra No.</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-white" />
                  <span>Show Khasra No.</span>
                </>
              )}
            </button>

            {/* High-Resolution Satellite Map Badge */}
            <div className="inline-flex rounded-lg border border-slate-200 px-2.5 py-1 bg-slate-100 text-xs font-semibold text-slate-800 items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              <span>Satellite View</span>
            </div>

            {/* Highway Tools Collapsible Trigger */}
            {/* Highway Tools Collapsible Trigger */}
            <button
              type="button"
              onClick={() => {
                setShowHighwayTools((prev) => {
                  const next = !prev;
                  if (next && activeStudioTool === 'inspect_parcel') {
                    setActiveStudioTool('highway_path');
                  }
                  return next;
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                showHighwayTools
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Route className="w-3.5 h-3.5 text-amber-600" />
              <span>Highway Tools</span>
              {showHighwayTools ? (
                <ChevronUp className="w-3 h-3 text-slate-700" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-500" />
              )}
            </button>

            {/* Recenter Map Button */}
            <button
              type="button"
              onClick={() => handleRecenterPaddyBelt(15)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1 cursor-pointer"
              title="Recenter on Tangori-Chunni Kalan Paddy Belt"
            >
              <Landmark className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Recenter</span>
            </button>
          </div>
        </div>

        {/* Quick Khasra Jump Bar & Error */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-medium">
              Quick Jump:
            </span>
            {[
              '18/2',
              '4',
              '15//8/2',
              '22//7/3',
              '9//22',
              '23/1',
              '14//2/1',
              '18//14',
              '42//11',
              '21/1',
            ].map((kNo) => (
              <button
                key={kNo}
                type="button"
                onClick={() => {
                  setKhasraSearchQuery(kNo);
                  handleKhasraSearch(kNo);
                }}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition border cursor-pointer ${
                  selectedFeature?.properties.khasra_number === kNo
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {kNo}
              </button>
            ))}
          </div>

          {khasraSearchError && (
            <span className="text-rose-600 text-xs font-medium">
              {khasraSearchError}
            </span>
          )}
        </div>
      </div>

      {/* 2. COLLAPSIBLE HIGHWAY, TOLL PLAZA & ENGINEERING TOOLS DRAWER */}
      {showHighwayTools && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider">
                Engineering Tools
              </span>
              <h3 className="text-xs font-bold text-slate-900">
                Highway Alignment, Toll Plaza &amp; Chainage Marking (Click Map or Drag Waypoints)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSmartOptimizeBypassDisputed}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto-Avoid Red Disputed Fields</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHighwayTools(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                title="Exit Highway Tools (returns map cursor to normal)"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Close Tools</span>
              </button>
            </div>
          </div>

          {/* Tools Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tool 1: Mark Highway Path */}
            <button
              type="button"
              onClick={() => setActiveStudioTool('highway_path')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                activeStudioTool === 'highway_path'
                  ? 'bg-[#0B192C] text-amber-300 border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Route className="w-3.5 h-3.5 text-amber-500" />
              <span>1. Highway Alignment ({routeWaypoints.length} WPs)</span>
            </button>

            {/* Tool 2: Mark Toll Plaza */}
            <button
              type="button"
              onClick={() => setActiveStudioTool('toll_plaza')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                activeStudioTool === 'toll_plaza'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'bg-white text-amber-950 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>2. Toll Plaza (180m×140m)</span>
            </button>



            {/* Inspect Single Plot Toggle */}
            <button
              type="button"
              onClick={() => setActiveStudioTool('inspect_parcel')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 border cursor-pointer ${
                activeStudioTool === 'inspect_parcel'
                  ? 'bg-slate-800 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Inspect Plot</span>
            </button>
          </div>

          {/* RoW Width Slider + Undo / Clear / Load Sample */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">


            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleGreenfieldExpressway}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100 transition flex items-center gap-1 cursor-pointer"
              >
                <Route className="w-3.5 h-3.5 text-teal-700" />
                Sample Expressway
              </button>

              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                title={
                  undoStack.length > 0
                    ? `Undo last alignment change (${undoStack.length} in history) [Ctrl+Z]`
                    : 'No actions to undo yet'
                }
                className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>Undo {undoStack.length > 0 ? `(${undoStack.length})` : ''}</span>
                <kbd className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200 font-mono">⌘Z</kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  pushUndoState();
                  setRouteWaypoints([]);
                  setTollPlazas([]);
                  setInterchanges([]);
                  setOptimizerComparisonBanner(null);
                }}
                disabled={
                  routeWaypoints.length === 0 &&
                  tollPlazas.length === 0 &&
                  interchanges.length === 0
                }
                className="px-2 py-1 rounded-md bg-white border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Route Optimizer Comparison Banner */}
      {optimizerComparisonBanner && (
        <div className="bg-emerald-950 text-emerald-100 border border-emerald-500/60 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono">{optimizerComparisonBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setOptimizerComparisonBanner(null)}
            className="text-emerald-300 hover:text-white underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Created Route Project Banner */}
      {createdProjectBanner && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{createdProjectBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setCreatedProjectBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. MAIN LAYOUT: LIVE HIGHWAY CORRIDOR ASSESSMENT PANEL (LEFT 4 COLS) + PADDY FIELD GIS MAP (RIGHT 8 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 4 Columns: Live Corridor Feasibility, Availability & Compensation Progress Panel */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Panel Mode Switcher */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setSidebarTab('corridor')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                sidebarTab === 'corridor'
                  ? 'bg-[#0B192C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Corridor Feasibility ({intersectedFeatures.length})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('parcel')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                sidebarTab === 'parcel'
                  ? 'bg-[#0B192C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selected Plot ({selectedFeature?.properties.khasra_number || 'None'})
            </button>
          </div>

          {sidebarTab === 'corridor' ? (
            <div className="p-4 flex flex-col h-full justify-between space-y-4 overflow-y-auto max-h-[620px]">
              {routeWaypoints.length < 2 && tollPlazas.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-3 my-auto">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-200">
                    <Route className="w-6 h-6 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      No Highway Alignment or Toll Plaza Marked
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Click <strong>Highway Tools</strong> above to place waypoints or mark <strong>Toll Plazas (180m×140m)</strong> across the paddy fields to assess feasibility.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleGreenfieldExpressway}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                    >
                      <Route className="w-3.5 h-3.5 text-teal-300" />
                      <span>Load Sample Expressway &amp; Toll Plaza</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHighwayTools(true);
                        setActiveStudioTool('toll_plaza');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Mark Toll Plaza (180m×140m)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3.5">
                {/* Engineering Specs Grid */}
                <div className="bg-[#0B192C] text-white p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 font-semibold">
                      Live Highway Corridor Assessment
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                      {routeWaypoints.length} WPs • {routeMetrics.overallBearingDeg}°{' '}
                      {routeMetrics.overallCompass}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400 uppercase">
                        Highway Length &amp; RoW
                      </div>
                      <div className="text-sm font-bold font-mono text-white">
                        {routeMetrics.lengthKm} km ({routeMetrics.lengthMeters}m)
                      </div>
                      <div className="text-[10px] text-teal-300 font-mono">
                        RoW Width: {rowWidthMeters}m • {tollPlazas.length} Toll Plaza
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400 uppercase">
                        Total Land Required
                      </div>
                      <div className="text-sm font-bold font-mono text-amber-300">
                        {routeMetrics.totalAreaHa} ha ({routeMetrics.totalAreaAcres}{' '}
                        Ac)
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono">
                        {routeMetrics.totalKanalMarla} •{' '}
                        {intersectedFeatures.length} Paddy Plots
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color-Coded Land Availability Breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Land Availability Breakdown
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {intersectedFeatures.length} Total Parcels
                    </span>
                  </div>

                  {/* Proportional Color Bar with Dark Green Acquired */}
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    {routeMetrics.totalAreaHa > 0 && (
                      <>
                        {routeMetrics.acquiredAreaHa > 0 && (
                          <div
                            style={{
                              width: `${Math.round(
                                (routeMetrics.acquiredAreaHa /
                                  routeMetrics.totalAreaHa) *
                                  100
                              )}%`,
                              backgroundColor: '#047857',
                            }}
                            title={`Acquired (Possession Taken): ${routeMetrics.acquiredAreaHa} ha`}
                          />
                        )}
                        {routeMetrics.consentAreaHa > 0 && (
                          <div
                            style={{
                              width: `${Math.round(
                                (routeMetrics.consentAreaHa /
                                  routeMetrics.totalAreaHa) *
                                  100
                              )}%`,
                              backgroundColor: '#10B981',
                            }}
                            title={`Available / Consent Ready: ${routeMetrics.consentAreaHa} ha`}
                          />
                        )}
                        <div
                          style={{
                            width: `${Math.round(
                              (routeMetrics.notificationAreaHa /
                                routeMetrics.totalAreaHa) *
                                100
                            )}%`,
                            backgroundColor: '#0284C7',
                          }}
                          title="Notification Stage"
                        />
                        <div
                          style={{
                            width: `${Math.round(
                              (routeMetrics.disputedAreaHa /
                                routeMetrics.totalAreaHa) *
                                100
                            )}%`,
                            backgroundColor: '#EF4444',
                          }}
                          title="Disputed / Litigation"
                        />
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {/* Dark Green: Acquired (Possession Taken) */}
                    <div className="flex items-center justify-between bg-emerald-950/5 border border-emerald-800/30 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#047857] shrink-0" />
                        <span className="font-semibold text-emerald-950">
                          Acquired (Possession Taken)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-900">
                        {routeMetrics.acquiredFeatures.length} plots •{' '}
                        {routeMetrics.acquiredAreaHa} ha
                      </span>
                    </div>

                    {/* Emerald Green: Available / Consent Given */}
                    <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-semibold text-emerald-950">
                          Available / Consent Given
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800">
                        {routeMetrics.consentFeatures.length} plots •{' '}
                        {routeMetrics.consentAreaHa} ha
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-sky-50/80 border border-sky-200 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
                        <span className="font-semibold text-sky-950">
                          Notification Stage (Sec 11)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sky-800">
                        {routeMetrics.notificationFeatures.length} plots •{' '}
                        {routeMetrics.notificationAreaHa} ha
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                        <span className="font-semibold text-rose-950">
                          Disputed Blocking Route
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-700">
                        {routeMetrics.disputedFeatures.length} plots •{' '}
                        {routeMetrics.disputedAreaHa} ha
                      </span>
                    </div>
                  </div>

                  {/* Disputed Parcels Warning & 1-Click Bypass Action */}
                  {routeMetrics.disputedFeatures.length > 0 ? (
                    <div className="bg-rose-950 text-rose-100 rounded-lg p-2.5 space-y-2 border border-rose-700">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-snug">
                          <strong className="text-white">
                            {routeMetrics.disputedFeatures.length} Disputed Parcel(s)
                            Blocking Highway Alignment:
                          </strong>{' '}
                          Drag the route waypoints on the map, click{' '}
                          <strong>Auto-Adjust Route</strong>, or invoke{' '}
                          <strong>Section 77(2) LARR Court Escrow Deposit</strong>.
                        </div>
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {routeMetrics.disputedFeatures.map((df) => (
                          <button
                            key={df.properties.parcel_id}
                            type="button"
                            onClick={() => {
                              setSelectedParcelId(df.properties.parcel_id);
                              setSidebarTab('parcel');
                            }}
                            className="w-full text-left bg-rose-900/70 hover:bg-rose-800 px-2 py-1 rounded text-[10px] font-mono flex items-center justify-between border border-rose-700/80 cursor-pointer"
                          >
                            <span>
                              <strong>{df.properties.parcel_id}</strong> (Khasra{' '}
                              {df.properties.khasra_number})
                            </span>
                            <span className="text-rose-200 truncate max-w-[140px]">
                              {df.properties.dispute_reason ||
                                'Sec 15 / Partition Stay'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleSmartOptimizeBypassDisputed}
                        className="w-full py-1.5 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Auto-Adjust Route to Avoid Red Disputed Fields
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2 text-[11px] text-emerald-900 flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Zero Disputed Plots on Route! 100% Clear Green/Blue Paddy Alignment.
                      </span>
                    </div>
                  )}
                </div>

                {/* Toll Plaza Feasibility & Land Footprint Analysis */}
                <div className="bg-amber-950/10 border border-amber-300 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>Toll Plaza Feasibility ({tollPlazas.length} Plazas)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHighwayTools(true);
                        setActiveStudioTool('toll_plaza');
                        if (tollPlazas.length === 0) {
                          pushUndoState();
                          const [tLat, tLng] = paddyMeshNodeLatLng(2.45, 3.65);
                          setTollPlazas([
                            {
                              id: `TOLL-PLAZA-${Date.now()}`,
                              lat: tLat,
                              lng: tLng,
                              bearingDeg: 74,
                              label: `TP-1 Tangori Toll Plaza (180m × 140m)`,
                            },
                          ]);
                        }
                      }}
                      className="text-[10px] font-bold text-amber-900 bg-amber-200/90 hover:bg-amber-300 px-2 py-0.5 rounded border border-amber-400 flex items-center gap-1 transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{tollPlazas.length === 0 ? 'Place Toll Plaza' : 'Add Another Plaza'}</span>
                    </button>
                  </div>

                  {tollPlazas.length === 0 ? (
                    <div className="text-[11px] text-amber-900 bg-white/70 p-2.5 rounded-lg border border-amber-200">
                      No Toll Plazas added yet. Click <strong>Tool 2: Toll Plaza</strong> in Highway Tools or click above to place a 180m×140m toll complex on any paddy plot.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tollPlazas.map((tp) => {
                        const intersectedByThisToll = featureList.filter((f) => {
                          const [cLat, cLng] = getFeatureCentroidLatLng(f);
                          return L.latLng(cLat, cLng).distanceTo(L.latLng(tp.lat, tp.lng)) <= 105;
                        });

                        return (
                          <div
                            key={tp.id}
                            className="bg-white border border-amber-300 rounded-lg p-2.5 text-xs space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 block text-xs">
                                  {tp.label}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  [{tp.lat.toFixed(5)}, {tp.lng.toFixed(5)}] • Bearing {tp.bearingDeg}°
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  pushUndoState();
                                  setTollPlazas((prev) => prev.filter((t) => t.id !== tp.id));
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer shrink-0"
                                title="Remove this Toll Plaza"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-0.5">
                              <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
                                <span className="text-amber-800 uppercase font-semibold block">Footprint</span>
                                <span className="font-bold font-mono text-slate-900">180m × 140m (2.52 ha)</span>
                              </div>
                              <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
                                <span className="text-emerald-800 uppercase font-semibold block">Impacted Plots</span>
                                <span className="font-bold font-mono text-slate-900">
                                  {intersectedByThisToll.length} Paddy Plots
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-amber-100">
                              <span className="text-[10px] text-amber-900 font-semibold">
                                Expansion Value: <strong className="font-mono text-teal-800">₹4.50 Cr</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (mapInstanceRef.current) {
                                    mapInstanceRef.current.flyTo([tp.lat, tp.lng], 17, { duration: 0.75 });
                                  }
                                }}
                                className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition"
                              >
                                <Compass className="w-3 h-3 text-teal-600" />
                                <span>Focus Map</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Dynamic Compensation & Progress Tracker */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    RFCTLARR 2013 Compensation &amp; Progress Tracker
                  </div>

                  <div className="space-y-1 text-[11px] border-b border-slate-200 pb-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Base Paddy Circle Rate (₹1.80 Cr/ha):</span>
                      <span className="font-mono font-semibold text-slate-900">
                        ₹{routeMetrics.baseCircleRateCr} Cr
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Rural Multiplier Factor (1.5x):</span>
                      <span className="font-mono font-semibold text-slate-900">
                        ₹{routeMetrics.multipliedValueCr} Cr
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>100% Statutory Solatium (Sec 30):</span>
                      <span className="font-mono font-semibold text-slate-900">
                        +₹{routeMetrics.solatiumCr} Cr
                      </span>
                    </div>
                    {tollPlazas.length > 0 && (
                      <div className="flex justify-between text-amber-800">
                        <span>
                          Toll Plaza Expansion ({tollPlazas.length} × ₹4.50 Cr):
                        </span>
                        <span className="font-mono font-semibold">
                          +₹{routeMetrics.tollPlazaInfraCostCr} Cr
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 font-bold text-slate-900 text-xs">
                      <span>Total Estimated Compensation:</span>
                      <span className="font-mono text-teal-800">
                        ₹{routeMetrics.totalEstimatedCompCr} Cr
                      </span>
                    </div>
                  </div>

                  {/* Split by Disbursed, Approved Pending PFMS, Held in Dispute */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5">
                      <div className="text-[9px] uppercase text-emerald-800 font-semibold">
                        Disbursed
                      </div>
                      <div className="font-mono font-bold text-emerald-900 text-xs">
                        ₹{routeMetrics.disbursedCr} Cr
                      </div>
                    </div>
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-1.5">
                      <div className="text-[9px] uppercase text-sky-800 font-semibold">
                        Pending PFMS
                      </div>
                      <div className="font-mono font-bold text-sky-900 text-xs">
                        ₹{routeMetrics.pendingPfmsCr} Cr
                      </div>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-1.5">
                      <div className="text-[9px] uppercase text-rose-800 font-semibold">
                        Held in Dispute
                      </div>
                      <div className="font-mono font-bold text-rose-900 text-xs">
                        ₹{routeMetrics.heldInDisputeCr} Cr
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Alignment & Create Official Project */}
              {onCreateRouteProject && (
                <div className="pt-3 border-t border-slate-200 space-y-2 bg-slate-50 p-3 rounded-xl">
                  <div className="text-xs font-bold text-slate-900">
                    Confirm Alignment &amp; Create Official Project
                  </div>
                  <input
                    type="text"
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    placeholder="Project Title"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="text"
                    value={newRouteAgency}
                    onChange={(e) => setNewRouteAgency(e.target.value)}
                    placeholder="Executing Agency (e.g., NHAI / GMADA)"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRouteAsProject}
                    disabled={
                      savingRouteProject || intersectedFeatures.length === 0
                    }
                    className="w-full py-2 px-3 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {savingRouteProject
                      ? 'Saving Official Project...'
                      : `Confirm Alignment & Create Official Project (${intersectedFeatures.length} Plots)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : selectedFeature ? (
            /* SELECTED IRREGULAR PADDY PLOT DETAILS */
            <div className="p-4 flex flex-col h-full justify-between space-y-4 overflow-y-auto max-h-[620px]">
              <div className="space-y-3.5">
                <div className="bg-[#0B192C] text-white p-3 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded">
                      Irregular Paddy Cadastral Plot
                    </span>
                    <span className="text-[10px] font-mono text-teal-300">
                      {selectedFeature.properties.parcel_id}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <h4 className="text-lg font-bold tracking-tight font-mono">
                      Khasra No: {selectedFeature.properties.khasra_number}
                    </h4>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                      style={{
                        backgroundColor: getStatusColorHex(
                          selectedFeature.properties.acquisition_status
                        ),
                      }}
                    >
                      {formatStatusLabel(
                        selectedFeature.properties.acquisition_status
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    {selectedFeature.properties.village} •{' '}
                    {selectedFeature.properties.district}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">
                      Paddy Holding Area
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                      {selectedFeature.properties.area_hectares} ha (
                      {(
                        Number(selectedFeature.properties.area_hectares) *
                        2.47105
                      ).toFixed(2)}{' '}
                      Ac)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {formatKanalMarla(selectedFeature.properties.area_hectares)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">
                      Soil &amp; Crop Pattern
                    </div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">
                      {formatLandClassificationEnglish(
                        selectedFeature.properties.land_use_type,
                        selectedFeature.properties.soil_crop_type
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {selectedFeature.properties.demo_ulpin}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-400 uppercase text-[10px] font-semibold">
                    Registered Khatedar (Jamabandi Record)
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedFeature.properties.landowner_name}
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Landowner ID: {selectedFeature.properties.landowner_id}
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-xs space-y-1.5">
                  <div className="text-emerald-800 uppercase text-[10px] font-semibold">
                    RFCTLARR Sec 26 Compensation Award
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Total Award (incl. 100% Solatium):
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatINR(
                        selectedFeature.properties.total_award_amount_inr
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">PFMS Payment Status:</span>
                    <span className="font-semibold text-emerald-700 uppercase font-mono">
                      {selectedFeature.properties.payment_status}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-400 uppercase text-[10px] font-semibold">
                    Encumbrance &amp; Litigation Status
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    {selectedFeature.properties.acquisition_status ===
                    'disputed' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>
                      {selectedFeature.properties.dispute_reason ||
                        (selectedFeature.properties.acquisition_status ===
                        'disputed'
                          ? 'Section 15 / Co-Sharer Partition Objection'
                          : 'Clear Title — Ready for Possession')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right 8 Columns: Open Punjab Paddy Belt Map Canvas + Layer Control + Legend */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative bg-slate-900 rounded-xl border border-slate-300 shadow-sm overflow-hidden h-[620px]">
            <div
              ref={mapContainerRef}
              className={`w-full h-full z-0 transition-opacity duration-150 ${
                isGoogleStreetMapActive
                  ? 'invisible pointer-events-none absolute inset-0'
                  : 'opacity-100 relative'
              }`}
            />

            {isGoogleStreetMapActive && (
              <div className="absolute inset-0 z-10 w-full h-full">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                  <GoogleMap
                    defaultCenter={{
                      lat: lastCameraRef.current?.lat || PADDY_PRESET.centerLat,
                      lng: lastCameraRef.current?.lng || PADDY_PRESET.centerLng,
                    }}
                    defaultZoom={lastCameraRef.current?.zoom || PADDY_PRESET.zoom}
                    mapId="DEMO_MAP_ID"
                    mapTypeId="roadmap"
                    streetViewControl={true}
                    zoomControl={true}
                    mapTypeControl={false}
                    fullscreenControl={false}
                    gestureHandling="greedy"
                    internalUsageAttributionIds={[
                      'gmp_mcp_codeassist_v1_aistudio',
                    ]}
                    className="w-full h-full"
                    onCameraChanged={(ev) => {
                      if (ev.detail.center) {
                        lastCameraRef.current = {
                          lat: Number(ev.detail.center.lat.toFixed(6)),
                          lng: Number(ev.detail.center.lng.toFixed(6)),
                          zoom: Math.round(ev.detail.zoom),
                        };
                      }
                    }}
                    onClick={(e) => {
                      if (
                        !showHighwayTools ||
                        activeStudioTool === 'inspect_parcel' ||
                        !e.detail.latLng
                      )
                        return;
                      handleEngineeringPointAction(
                        e.detail.latLng.lat,
                        e.detail.latLng.lng
                      );
                    }}
                  >
                    <GoogleMapCameraSync target={googleMapCameraTarget} />

                    {/* Irregular Paddy Polygons on Google Street Map */}
                    {featureList.map((f) => {
                      const parcelId = f.properties.parcel_id;
                      const status = f.properties.acquisition_status;
                      const isSelected = parcelId === selectedParcelId;
                      const isIntersected = intersectedParcelIds.has(parcelId);
                      const paths = f.geometry.coordinates[0].map(
                        ([lng, lat]) => ({ lat, lng })
                      );

                      return (
                        <GooglePolygon
                          key={`gmap-poly-${parcelId}`}
                          paths={paths}
                          strokeColor={
                            isSelected
                              ? '#FFFFFF'
                              : isIntersected
                              ? '#FACC15'
                              : '#0F172A'
                          }
                          strokeOpacity={0.95}
                          strokeWeight={isSelected ? 3.2 : 1.5}
                          fillColor={getStatusColorHex(status)}
                          fillOpacity={heatmapOpacity}
                          onClick={(e) => {
                            setSelectedParcelId(parcelId);
                            if (
                              !showHighwayTools ||
                              activeStudioTool === 'inspect_parcel'
                            ) {
                              setSidebarTab('parcel');
                            } else if (e.latLng) {
                              handleEngineeringPointAction(
                                e.latLng.lat(),
                                e.latLng.lng()
                              );
                            }
                          }}
                        />
                      );
                    })}

                    {/* Drawn Highway Route on Google Street Map */}
                    {routeWaypoints.length >= 2 && (
                      <>
                        <GooglePolyline
                          path={routeWaypoints.map(([lat, lng]) => ({
                            lat,
                            lng,
                          }))}
                          strokeColor="#F59E0B"
                          strokeOpacity={0.35}
                          strokeWeight={32}
                          clickable={false}
                        />
                        <GooglePolyline
                          path={routeWaypoints.map(([lat, lng]) => ({
                            lat,
                            lng,
                          }))}
                          strokeColor="#FACC15"
                          strokeOpacity={1}
                          strokeWeight={4}
                          clickable={false}
                        />
                      </>
                    )}
                  </GoogleMap>
                </APIProvider>
              </div>
            )}

            {/* Floating On-Map GIS Layer Toggle & Compensation Heatmap Control */}
            <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/92 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/90 shadow-lg w-72 space-y-2.5">
              <div
                className={`flex items-center justify-between ${
                  isLayerCardCollapsed ? '' : 'border-b border-slate-800 pb-1.5'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>GIS Map Layers &amp; Heatmap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    Esri High-Res Satellite
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLayerCardCollapsed((prev) => !prev)}
                    aria-label={
                      isLayerCardCollapsed
                        ? 'Expand GIS Map Layers card'
                        : 'Collapse GIS Map Layers card'
                    }
                    className="p-1 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  >
                    {isLayerCardCollapsed ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {!isLayerCardCollapsed && (
                <>
                  <div className="w-full">
                    <div className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-600 text-white border border-teal-400 shadow-sm flex items-center justify-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Satellite Base Map Active
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/90 space-y-2">

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Paddy Polygon Opacity</span>
                        <span className="font-mono text-slate-200">
                          {Math.round(heatmapOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.25"
                        max="0.9"
                        step="0.05"
                        value={heatmapOpacity}
                        onChange={(e) =>
                          setHeatmapOpacity(Number(e.target.value))
                        }
                        aria-label="Cadastral overlay opacity"
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                      />
                    </div>

                    {/* Quick Plot Status Color Legend */}
                    <div className="pt-2 border-t border-slate-800 text-[10px] space-y-1">
                      <div className="text-slate-400 font-semibold text-[9px] uppercase tracking-wider">
                        Plot Status Colors:
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: '#047857' }}
                          />
                          <span className="font-semibold text-emerald-300">
                            Acquired (Dark Green)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: '#10B981' }}
                          />
                          <span>Consent Given</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: '#0284C7' }}
                          />
                          <span>Sec 11 Notice</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: '#EF4444' }}
                          />
                          <span>Disputed Stay</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Floating Top-Right Controls on Map Canvas: Direct 1-Click Hide/Show Khasra Button */}
            <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowKhasraLabels((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition flex items-center gap-1.5 shadow-lg border cursor-pointer ${
                  showKhasraLabels
                    ? 'bg-slate-950/90 text-white hover:bg-slate-800 border-slate-700'
                    : 'bg-emerald-600/95 text-white hover:bg-emerald-500 border-emerald-400 ring-2 ring-emerald-300'
                }`}
                title={
                  showKhasraLabels
                    ? 'Hide Khasra numbers for unobstructed satellite view'
                    : 'Show Khasra numbers on cadastral polygons'
                }
              >
                {showKhasraLabels ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                    <span>Hide Khasra No.</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-white" />
                    <span>Show Khasra No.</span>
                  </>
                )}
              </button>

              {showHighwayTools && (
                <div className="bg-slate-950/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md border border-slate-700 text-[10px] shadow-md pointer-events-none">
                  <span className="text-amber-300 font-semibold">
                    Tool:{' '}
                    {activeStudioTool === 'highway_path'
                      ? 'Mark Highway'
                      : activeStudioTool === 'toll_plaza'
                      ? 'Toll Plaza'
                      : activeStudioTool === 'rest_interchange'
                      ? 'Interchange'
                      : activeStudioTool === 'measure_chainage'
                      ? 'Chainage'
                      : 'Inspect Plot'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Simple Map Legend Bar */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                  Paddy Field Legend:
                </span>
                {/* 1. Dark Green: Acquired (Possession Taken) */}
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <span
                    className="w-3.5 h-3.5 rounded-sm inline-block border border-emerald-950 shadow-2xs"
                    style={{ backgroundColor: '#047857' }}
                  />
                  <span>
                    <strong className="font-bold text-emerald-950">Dark Green:</strong> Acquired (Possession Handed Over)
                  </span>
                </div>
                {/* 2. Emerald Green: Available / Consent Given */}
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <span
                    className="w-3.5 h-3.5 rounded-sm inline-block border border-emerald-900 shadow-2xs"
                    style={{ backgroundColor: '#10B981' }}
                  />
                  <span>Available / Consent Given</span>
                </div>
                {/* 3. Sky Blue: Sec 11 Notice Stage */}
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <span
                    className="w-3.5 h-3.5 rounded-sm inline-block border border-sky-900 shadow-2xs"
                    style={{ backgroundColor: '#0284C7' }}
                  />
                  <span>Sec 11 Notice Stage</span>
                </div>
                {/* 4. Crimson Red: Disputed / Court Stay */}
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <span
                    className="w-3.5 h-3.5 rounded-sm inline-block border-2 border-rose-950 shadow-2xs"
                    style={{ backgroundColor: '#EF4444' }}
                  />
                  <span>Disputed / Court Stay</span>
                </div>
                {/* 5. Cyan Line: Rajbaha Irrigation Canal */}
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <span className="w-3.5 h-1.5 rounded-full inline-block bg-cyan-500 shadow-2xs" />
                  <span>Rajbaha Canal</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKhasraLabels((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer shadow-sm ${
                    showKhasraLabels
                      ? 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
                      : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                  }`}
                >
                  {showKhasraLabels ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                      <span>Hide Khasra No.</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-white" />
                      <span>Show Khasra No.</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GisMapView;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

export type AcquisitionStatus =
  | 'not_initiated'
  | 'notification_issued'
  | 'documentation_pending'
  | 'disputed'
  | 'approved'
  | 'acquired';

export type PaymentStatus = 'pending' | 'partially_paid' | 'paid';

export const PADDY_BELT_CENTER_LAT = 30.6382;
export const PADDY_BELT_CENTER_LNG = 76.6448;

interface ProjectConfig {
  project_id: string;
  project_code: string;
  project_name: string;
  district: string;
  state: string;
  tehsil: string;
  executing_agency: string;
  corridor_type: string;
  current_stage_label: string;
  ui_status: string;
  total_parcels: number;
  acquired_parcels: number;
  disputed_parcels: number;
  total_area_hectares: number;
  acquired_area_hectares: number;
  sanctioned_budget_inr: number;
  disbursed_amount_inr: number;
  acquisition_status: AcquisitionStatus;
  start_date: string;
  statutory_deadline: string;
  ai_risk_score: string;
  ai_bottleneck_note: string;
  center_lat: number;
  center_lng: number;
  villages: string[];
  nonAcquiredStatuses: AcquisitionStatus[];
}

const PROJECTS: ProjectConfig[] = [
  {
    project_id: 'PRJ-PB-TRICITY-001',
    project_code: 'PRJ-PB-TRICITY-001',
    project_name:
      'SH-12A Tangori–Chunni Kalan–Sirhind Greenfield Highway Corridor',
    district: 'SAS Nagar (Mohali)',
    state: 'Punjab',
    tehsil: '232 Mohali',
    executing_agency: 'NHAI (PIU Chandigarh)',
    corridor_type: 'Greenfield Highway Corridor',
    current_stage_label: 'Section 38 - Possession & Handover',
    ui_status: 'Active',
    total_parcels: 18,
    acquired_parcels: 13,
    disputed_parcels: 3,
    total_area_hectares: 54.6,
    acquired_area_hectares: 41.2,
    sanctioned_budget_inr: 1245000000,
    disbursed_amount_inr: 1012000000,
    acquisition_status: 'acquired',
    start_date: '2025-04-12',
    statutory_deadline: '2027-03-31',
    ai_risk_score: 'Low',
    ai_bottleneck_note:
      'Paddy belt plots 18/2, 15//8/2 & 22//7/3 along Tangori–Chunni Kalan alignment under Section 15 / R&R valuation review.',
    center_lat: 30.6382,
    center_lng: 76.6448,
    villages: [
      '39175 Mauli Baidwan',
      '39175 Mauli Baidwan',
      'Tangori Paddy Belt',
      'Chunni Kalan',
      '39175 Mauli Baidwan',
      'Sawara',
      'Manakpur',
      'Tangori Paddy Belt',
      'Chunni Kalan',
      'Sawara',
      'Manakpur',
      'Tangori Paddy Belt',
    ],
    nonAcquiredStatuses: [
      'disputed',
      'disputed',
      'disputed',
      'approved',
      'notification_issued',
    ],
  },
  {
    project_id: 'PRJ-CHD-METRO-002',
    project_code: 'PRJ-CHD-METRO-002',
    project_name:
      'Tricity Metro Phase-1 Depot & Feeder Spur (Sarangpur to Tangori Belt)',
    district: 'Chandigarh UT & SAS Nagar',
    state: 'Chandigarh / Punjab',
    tehsil: 'Kharar / Mohali',
    executing_agency: 'UMTA / RITES Chandigarh',
    corridor_type: 'Urban Metro Rail',
    current_stage_label: 'Section 19 - Declaration & R&R Scheme',
    ui_status: 'Disputed',
    total_parcels: 14,
    acquired_parcels: 6,
    disputed_parcels: 4,
    total_area_hectares: 35.8,
    acquired_area_hectares: 16.4,
    sanctioned_budget_inr: 842000000,
    disbursed_amount_inr: 418000000,
    acquisition_status: 'disputed',
    start_date: '2025-08-01',
    statutory_deadline: '2026-12-15',
    ai_risk_score: 'High',
    ai_bottleneck_note:
      'Section 19 declaration approaching 12-month statutory expiry for 4 Mullanpur / Chunni Kalan paddy parcels.',
    center_lat: 30.6412,
    center_lng: 76.6485,
    villages: [
      'Sarangpur',
      'Mullanpur Garibdass',
      'Tangori Paddy Belt',
      'Chunni Kalan',
      'Sawara',
      'Manakpur',
      'Tangori Paddy Belt',
      'Chunni Kalan',
    ],
    nonAcquiredStatuses: [
      'approved',
      'disputed',
      'disputed',
      'disputed',
      'disputed',
      'notification_issued',
      'documentation_pending',
      'approved',
    ],
  },
  {
    project_id: 'PRJ-PB-GMADA-003',
    project_code: 'PRJ-PB-GMADA-003',
    project_name: 'Aerotropolis Logistics & Paddy Belt Ring Link (PR-7 Spur)',
    district: 'SAS Nagar (Mohali)',
    state: 'Punjab',
    tehsil: '232 Mohali',
    executing_agency: 'GMADA (Greater Mohali Area Development Authority)',
    corridor_type: 'IT & Aerotropolis',
    current_stage_label: 'Section 23 & 30 - Award & Compensation',
    ui_status: 'Active',
    total_parcels: 12,
    acquired_parcels: 9,
    disputed_parcels: 1,
    total_area_hectares: 31.4,
    acquired_area_hectares: 24.8,
    sanctioned_budget_inr: 590000000,
    disbursed_amount_inr: 512000000,
    acquisition_status: 'approved',
    start_date: '2025-06-18',
    statutory_deadline: '2027-01-20',
    ai_risk_score: 'Low',
    ai_bottleneck_note:
      'DBT PFMS verification pending for 2 joint-khewat agricultural landowners in Tangori / Mauli Baidwan.',
    center_lat: 30.6365,
    center_lng: 76.6422,
    villages: [
      '39175 Mauli Baidwan',
      'Tangori Paddy Belt',
      'Chunni Kalan',
      'Sawara',
      'Manakpur',
      '39175 Mauli Baidwan',
    ],
    nonAcquiredStatuses: ['disputed', 'notification_issued', 'approved'],
  },
  {
    project_id: 'PRJ-HR-PKL-004',
    project_code: 'PRJ-HR-PKL-004',
    project_name: 'Banur–Landran–Chunni Kalan Southern Freight Bypass',
    district: 'SAS Nagar / Fatehgarh Sahib',
    state: 'Punjab',
    tehsil: '232 Mohali',
    executing_agency: 'NHAI / PWD B&R Punjab',
    corridor_type: 'Ring Road Bypass',
    current_stage_label: 'Section 11 - Preliminary Notification',
    ui_status: 'Delayed',
    total_parcels: 9,
    acquired_parcels: 4,
    disputed_parcels: 3,
    total_area_hectares: 22.8,
    acquired_area_hectares: 9.2,
    sanctioned_budget_inr: 285000000,
    disbursed_amount_inr: 112000000,
    acquisition_status: 'documentation_pending',
    start_date: '2026-01-10',
    statutory_deadline: '2027-06-30',
    ai_risk_score: 'Medium',
    ai_bottleneck_note:
      'Canal crossing NOC & SIA public hearing transcript upload pending for 3 Rajbaha canal-edge paddy parcels.',
    center_lat: 30.6352,
    center_lng: 76.6465,
    villages: [
      'Sawara',
      'Chunni Kalan',
      'Manakpur',
      'Tangori Paddy Belt',
      'Sawara',
    ],
    nonAcquiredStatuses: [
      'disputed',
      'disputed',
      'disputed',
      'not_initiated',
      'documentation_pending',
    ],
  },
  {
    project_id: 'PRJ-PB-RAIL-005',
    project_code: 'PRJ-PB-RAIL-005',
    project_name:
      'Rajpura–Mohali Dedicated Freight & Agricultural Rail Spur',
    district: 'SAS Nagar / Patiala',
    state: 'Punjab',
    tehsil: 'Rajpura / Mohali',
    executing_agency: 'Northern Railway',
    corridor_type: 'Broad Gauge Rail Link',
    current_stage_label: 'Section 38 - Possession & Handover',
    ui_status: 'Active',
    total_parcels: 7,
    acquired_parcels: 5,
    disputed_parcels: 1,
    total_area_hectares: 14.5,
    acquired_area_hectares: 9.8,
    sanctioned_budget_inr: 185000000,
    disbursed_amount_inr: 124000000,
    acquisition_status: 'acquired',
    start_date: '2025-09-05',
    statutory_deadline: '2026-11-30',
    ai_risk_score: 'Low',
    ai_bottleneck_note:
      'Mutation entry in Jamabandi portal awaiting Tehsildar digital signature.',
    center_lat: 30.6341,
    center_lng: 76.6412,
    villages: [
      'Manakpur',
      'Tangori Paddy Belt',
      'Sawara',
      'Chunni Kalan',
    ],
    nonAcquiredStatuses: ['disputed', 'not_initiated'],
  },
];

interface SeedParcelOverride {
  ulpin: string;
  project_id: string;
  khasra_no: string;
  khewat_no: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  owner_name: string;
  land_type: 'Agricultural' | 'Residential' | 'Commercial' | 'Barren' | 'Forest';
  soil_crop_type: string;
  area_ha: number;
  acquisition_status: AcquisitionStatus;
  dispute_reason: string;
  compensation_award_inr: number;
  compensation_paid_inr: number;
  payment_status: PaymentStatus;
  rnr_status: 'assessment_ongoing' | 'allotted' | 'completed';
  family_members: number;
}

const EXPLICIT_PARCELS: Record<string, SeedParcelOverride> = {
  'PB-SAS-KHR-039-0001': {
    ulpin: 'PB-SAS-KHR-039-0001',
    project_id: 'PRJ-PB-TRICITY-001',
    khasra_no: '9//22',
    khewat_no: '166',
    village: '39175 Mauli Baidwan',
    tehsil: '232 Mohali',
    district: 'SAS Nagar (Mohali)',
    state: 'Punjab',
    owner_name:
      'Punjab Urban Planning & Development Authority, Chandigarh (PUDA / GMADA)',
    land_type: 'Barren',
    soil_crop_type: 'Canal Belt Agricultural',
    area_ha: 2.45,
    acquisition_status: 'acquired',
    dispute_reason:
      'None — Khewat 166 Mutated 1/1 in favor of PUDA/GMADA (Non-Developable Plot, 48 Kanal 9 Marla)',
    compensation_award_inr: 48500000,
    compensation_paid_inr: 48500000,
    payment_status: 'paid',
    rnr_status: 'allotted',
    family_members: 5,
  },
  'PB-SAS-KHR-039-0002': {
    ulpin: 'PB-SAS-KHR-039-0002',
    project_id: 'PRJ-PB-TRICITY-001',
    khasra_no: '18/2',
    khewat_no: '91',
    village: '39175 Mauli Baidwan',
    tehsil: '232 Mohali',
    district: 'SAS Nagar (Mohali)',
    state: 'Punjab',
    owner_name: 'Harjinder Kaur Gill',
    land_type: 'Residential',
    soil_crop_type: 'Abadi Edge',
    area_ha: 1.12,
    acquisition_status: 'disputed',
    dispute_reason:
      'Section 15 objection on Rural vs Urban Multiplier & Abadi edge R&R displacement review',
    compensation_award_inr: 36200000,
    compensation_paid_inr: 0,
    payment_status: 'pending',
    rnr_status: 'assessment_ongoing',
    family_members: 4,
  },
  'PB-SAS-KHR-039-0003': {
    ulpin: 'PB-SAS-KHR-039-0003',
    project_id: 'PRJ-CHD-METRO-002',
    khasra_no: '21/1',
    khewat_no: '32',
    village: 'Tangori Paddy Belt',
    tehsil: '232 Mohali',
    district: 'Chandigarh UT & SAS Nagar',
    state: 'Chandigarh / Punjab',
    owner_name: 'Rajeshwar Sharma & Bros',
    land_type: 'Commercial',
    soil_crop_type: 'Wheat-Paddy Double Crop',
    area_ha: 3.1,
    acquisition_status: 'approved',
    dispute_reason: 'None (Approved — Consent Award Signed)',
    compensation_award_inr: 74000000,
    compensation_paid_inr: 74000000,
    payment_status: 'paid',
    rnr_status: 'completed',
    family_members: 6,
  },
  'PB-SAS-KHR-039-0004': {
    ulpin: 'PB-SAS-KHR-039-0004',
    project_id: 'PRJ-CHD-METRO-002',
    khasra_no: '4',
    khewat_no: '115',
    village: 'Mullanpur Garibdass',
    tehsil: 'Kharar',
    district: 'Chandigarh UT & SAS Nagar',
    state: 'Chandigarh / Punjab',
    owner_name: 'Sukhdev Singh Bajwa',
    land_type: 'Agricultural',
    soil_crop_type: 'Irrigated Paddy - Chahi',
    area_ha: 1.85,
    acquisition_status: 'disputed',
    dispute_reason:
      'Title partition pending among 3 co-sharers in Jamabandi land registry record',
    compensation_award_inr: 29500000,
    compensation_paid_inr: 0,
    payment_status: 'pending',
    rnr_status: 'assessment_ongoing',
    family_members: 7,
  },
  'PB-SAS-KHR-039-0005': {
    ulpin: 'PB-SAS-KHR-039-0005',
    project_id: 'PRJ-PB-GMADA-003',
    khasra_no: '42//11',
    khewat_no: '166',
    village: '39175 Mauli Baidwan',
    tehsil: '232 Mohali',
    district: 'SAS Nagar (Mohali)',
    state: 'Punjab',
    owner_name:
      'Punjab Urban Planning & Development Authority, Chandigarh (PUDA / GMADA)',
    land_type: 'Commercial',
    soil_crop_type: 'Canal Belt Agricultural',
    area_ha: 2.9,
    acquisition_status: 'acquired',
    dispute_reason: 'None — PUDA/GMADA Acquired Sector Plot (Khewat 166)',
    compensation_award_inr: 62000000,
    compensation_paid_inr: 62000000,
    payment_status: 'paid',
    rnr_status: 'allotted',
    family_members: 4,
  },
  'PB-SAS-KHR-039-0006': {
    ulpin: 'PB-SAS-KHR-039-0006',
    project_id: 'PRJ-HR-PKL-004',
    khasra_no: '56/1',
    khewat_no: '19',
    village: 'Chunni Kalan',
    tehsil: '232 Mohali',
    district: 'SAS Nagar / Fatehgarh Sahib',
    state: 'Punjab',
    owner_name: 'Desh Raj Verma',
    land_type: 'Residential',
    soil_crop_type: 'Abadi Edge',
    area_ha: 1.6,
    acquisition_status: 'disputed',
    dispute_reason:
      'Tubewell & Abadi perimeter plot 56/1 under Section 15 valuation objection',
    compensation_award_inr: 21000000,
    compensation_paid_inr: 0,
    payment_status: 'pending',
    rnr_status: 'assessment_ongoing',
    family_members: 3,
  },
};

const FIRST_NAMES = [
  'Gurpreet',
  'Harjinder',
  'Manpreet',
  'Sukhdev',
  'Kulwant',
  'Balwinder',
  'Jaswinder',
  'Paramjit',
  'Amarjit',
  'Rajwinder',
];

const LAST_NAMES = [
  'Sidhu',
  'Gill',
  'Sharma',
  'Bajwa',
  'Dhillon',
  'Verma',
  'Sandhu',
  'Grewal',
  'Brar',
  'Cheema',
];

const SOIL_CROP_TYPES = [
  'Irrigated Paddy - Chahi',
  'Wheat-Paddy Double Crop',
  'Canal Belt Agricultural',
  'Irrigated Paddy - Chahi',
  'Orchard / Agro-Forestry',
  'Wheat-Paddy Double Crop',
  'Abadi Edge',
];

const LAND_USE_TYPES: (
  | 'Agricultural'
  | 'Residential'
  | 'Commercial'
  | 'Barren'
  | 'Forest'
)[] = [
  'Agricultural',
  'Agricultural',
  'Agricultural',
  'Residential',
  'Commercial',
  'Agricultural',
  'Barren',
];

function csvEscape(val: string | number | boolean): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Deterministic Rotated (16° Canal-Aligned), Vertex-Jittered Organic Paddy Field Mesh Node Generator.
 * Every shared vertex (u, v) produces the exact same [lng, lat] coordinate so adjacent irregular
 * 4-, 5-, and 6-sided polygons share exact borders with zero gaps and zero uniform squares.
 */
export function paddyMeshVertexLngLat(u: number, v: number): [number, number] {
  const s1 = Math.sin(u * 12.9898 + v * 78.233 + 1.37) * 43758.5453;
  const s2 = Math.cos(u * 39.3467 + v * 11.1351 + 2.41) * 24634.6345;
  const f1 = s1 - Math.floor(s1);
  const f2 = s2 - Math.floor(s2);

  // Organic vertex displacement (+/- 0.21 cell units) so no two edges are parallel or rectangular
  const ju = u + (f1 - 0.5) * 0.42;
  const jv = v + (f2 - 0.5) * 0.42;

  // Center around macro-grid (3.0, 4.0)
  const relU = ju - 3.0;
  const relV = jv - 4.0;

  // Scale across open agricultural paddy fields (~122m N-S per row, ~138m E-W per col)
  const northMeters = -relU * 122; // row 0 is North, row 6 is South
  const eastMeters = relV * 138; // col 0 is West, col 8 is East

  // Rotate by 16 degrees counter-clockwise (aligned with Punjab Rajbaha irrigation canal)
  const angleRad = (16 * Math.PI) / 180;
  const rotEast =
    eastMeters * Math.cos(angleRad) - northMeters * Math.sin(angleRad);
  const rotNorth =
    eastMeters * Math.sin(angleRad) + northMeters * Math.cos(angleRad);

  const dLat = rotNorth / 111132;
  const dLng =
    rotEast / (111320 * Math.cos((PADDY_BELT_CENTER_LAT * Math.PI) / 180));

  const lat = Number((PADDY_BELT_CENTER_LAT + dLat).toFixed(6));
  const lng = Number((PADDY_BELT_CENTER_LNG + dLng).toFixed(6));
  return [lng, lat];
}

function buildClosedIrregularRing(uvPts: [number, number][]): [number, number][] {
  const ring = uvPts.map(([u, v]) => paddyMeshVertexLngLat(u, v));
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

interface IrregularCellPolygon {
  row: number;
  col: number;
  subPart: 'FULL' | 'DIAG_A' | 'DIAG_B';
  ring: [number, number][];
}

/**
 * Generates 60 contiguous, non-rectangular irregular polygons from a 6x8 macro-grid
 * where 12 macro-cells are split along bent diagonals into 24 irregular holdings
 * and 36 macro-cells are 4-, 5-, and 6-sided trapezoids/pentagons/hexagons.
 */
function generateAll60IrregularCells(): IrregularCellPolygon[] {
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

  const cells: IrregularCellPolygon[] = [];

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 8; c++) {
      const key = `${r},${c}`;
      const top = topEdgeUV(r, c);
      const right = rightEdgeUV(r, c);
      const bottomRev = bottomEdgeReversedUV(r, c);
      const leftRev = leftEdgeReversedUV(r, c);

      if (splitKeys.has(key)) {
        // Bent interior vertex for organic non-triangular split
        const midU = Number((r + 0.53).toFixed(2));
        const midV = Number((c + 0.47).toFixed(2));

        // Half A (Upper-East irregular pentagon/quad)
        const uvA: [number, number][] = [
          ...top,
          ...right.slice(1),
          [midU, midV],
        ];
        cells.push({
          row: r,
          col: c,
          subPart: 'DIAG_A',
          ring: buildClosedIrregularRing(uvA),
        });

        // Half B (Lower-West irregular pentagon/quad sharing exact bent diagonal)
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
          subPart: 'DIAG_B',
          ring: buildClosedIrregularRing(uvB),
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
          subPart: 'FULL',
          ring: buildClosedIrregularRing(uvFull),
        });
      }
    }
  }

  return cells; // Exactly 60 irregular contiguous polygons
}

const KHASRA_NUMBERS_60: string[] = [
  // 1..7: Preserved key demo parcels
  '9//22', // PAR-PB-001 (PUDA / GMADA, Acquired)
  '18/2', // PAR-PB-002 (Harjinder Kaur Gill, Disputed on Highway Route)
  '21/1', // PAR-PB-003 (Rajeshwar Sharma, Approved)
  '4', // PAR-PB-004 (Sukhdev Singh Bajwa, Disputed on Highway Route)
  '42//11', // PAR-PB-005 (PUDA / GMADA, Acquired)
  '56/1', // PAR-PB-006 (Desh Raj Verma, Disputed South/East)
  '23/1', // PAR-PB-007 (Paramjit Singh Cheema, Paid ₹7.02 Cr)
  // 8..18: Remaining PRJ-PB-TRICITY-001 (11 parcels; PAR-PB-010 and PAR-PB-015 are Disputed on Highway Route)
  '14//2/1', // PAR-PB-008
  '6//11', // PAR-PB-009
  '15//8/2', // PAR-PB-010 (Disputed on Highway Route)
  '18//14', // PAR-PB-011
  '20/1', // PAR-PB-012
  '15//4/1', // PAR-PB-013
  '19/2', // PAR-PB-014
  '22//7/3', // PAR-PB-015 (Disputed on Highway Route)
  '25//3/2', // PAR-PB-016
  '85//1', // PAR-PB-017
  '72//4', // PAR-PB-018
  // 19..30: Remaining PRJ-CHD-METRO-002 (12 parcels)
  '11//4/2', // PAR-PB-019
  '18//1/2', // PAR-PB-020 (Disputed)
  '24//1/1', // PAR-PB-021
  '3//9/2', // PAR-PB-022
  '7//1/3', // PAR-PB-023 (Disputed)
  '14//6/2', // PAR-PB-024
  '16//1/1', // PAR-PB-025
  '16//2/4', // PAR-PB-026 (Disputed)
  '73//2', // PAR-PB-027
  '22//5/1', // PAR-PB-028
  '29//3/1', // PAR-PB-029
  '30//8/2', // PAR-PB-030
  // 31..41: Remaining PRJ-PB-GMADA-003 (11 parcels)
  '74//1', // PAR-PB-031
  '21//2/2', // PAR-PB-032
  '5//1/4', // PAR-PB-033
  '42//12', // PAR-PB-034 (Disputed)
  '19//1/3', // PAR-PB-035
  '26//1/2', // PAR-PB-036
  '86//3', // PAR-PB-037
  '75//4', // PAR-PB-038
  '38//2/1', // PAR-PB-039
  '40//5/2', // PAR-PB-040
  '41//7/1', // PAR-PB-041
  // 42..49: Remaining PRJ-HR-PKL-004 (8 parcels)
  '5//2/1', // PAR-PB-042
  '35//4/2', // PAR-PB-043 (Disputed)
  '34//1/1', // PAR-PB-044
  '56//2/3', // PAR-PB-045
  '27//6/2', // PAR-PB-046 (Disputed)
  '87//2', // PAR-PB-047
  '76//3', // PAR-PB-048
  '49//2/1', // PAR-PB-049
  // 50..56: PRJ-PB-RAIL-005 (7 parcels) + remaining slots to 60
  '39//1/2', // PAR-PB-050
  '36//3/1', // PAR-PB-051
  '33//7/2', // PAR-PB-052 (Disputed)
  '32//4/1', // PAR-PB-053
  '28//9/3', // PAR-PB-054
  '88//1', // PAR-PB-055
  '51//6/2', // PAR-PB-056
  '52//3/4', // PAR-PB-057
  '54//8/1', // PAR-PB-058
  '58//2/3', // PAR-PB-059
  '60//1/4', // PAR-PB-060
];

function generateDataset() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const projectsRows: string[] = [
    [
      'project_id',
      'project_code',
      'project_name',
      'district',
      'state',
      'tehsil',
      'executing_agency',
      'corridor_type',
      'current_stage_label',
      'ui_status',
      'total_parcels',
      'acquired_parcels',
      'disputed_parcels',
      'total_area_hectares',
      'acquired_area_hectares',
      'sanctioned_budget_inr',
      'disbursed_amount_inr',
      'acquisition_status',
      'start_date',
      'statutory_deadline',
      'ai_risk_score',
      'ai_bottleneck_note',
      'center_lat',
      'center_lng',
      'is_synthetic_demo',
      'data_disclaimer',
    ].join(','),
  ];

  const parcelsRows: string[] = [
    [
      'parcel_id',
      'project_id',
      'demo_ulpin',
      'khasra_number',
      'village',
      'tehsil',
      'district',
      'state',
      'area_hectares',
      'land_use_type',
      'acquisition_status',
      'centroid_lat',
      'centroid_lng',
      'is_synthetic_demo',
      'boundary_disclaimer',
    ].join(','),
  ];

  const landownersRows: string[] = [
    [
      'landowner_id',
      'parcel_id',
      'project_id',
      'full_name',
      'father_or_spouse_name',
      'dummy_contact_number',
      'dummy_email',
      'village',
      'district',
      'ownership_type',
      'share_percentage',
      'kyc_verified',
      'is_synthetic_demo',
      'privacy_disclaimer',
    ].join(','),
  ];

  const compensationRows: string[] = [
    [
      'compensation_id',
      'parcel_id',
      'project_id',
      'landowner_id',
      'base_market_value_inr',
      'solatium_amount_inr',
      'multiplier_factor',
      'total_award_amount_inr',
      'paid_amount_inr',
      'pending_amount_inr',
      'payment_status',
      'pfms_reference_code',
      'award_date',
      'is_synthetic_demo',
      'data_disclaimer',
    ].join(','),
  ];

  const documentsRows: string[] = [
    [
      'document_id',
      'parcel_id',
      'project_id',
      'landowner_id',
      'jamabandi_status',
      'section_11_gazette_ref',
      'section_19_declaration_ref',
      'encumbrance_certificate_status',
      'verification_status',
      'verified_by_officer',
      'last_updated_date',
      'is_synthetic_demo',
      'data_disclaimer',
    ].join(','),
  ];

  const rnrRows: string[] = [
    [
      'rnr_id',
      'parcel_id',
      'project_id',
      'landowner_id',
      'affected_family_size',
      'livelihood_category',
      'subsistence_allowance_inr',
      'resettlement_grant_inr',
      'housing_unit_entitled',
      'rnr_status',
      'payment_status',
      'allotment_reference',
      'is_synthetic_demo',
      'data_disclaimer',
    ].join(','),
  ];

  const geojsonFeatures: Record<string, unknown>[] = [];

  for (const proj of PROJECTS) {
    projectsRows.push(
      [
        proj.project_id,
        proj.project_code,
        proj.project_name,
        proj.district,
        proj.state,
        proj.tehsil,
        proj.executing_agency,
        proj.corridor_type,
        proj.current_stage_label,
        proj.ui_status,
        proj.total_parcels,
        proj.acquired_parcels,
        proj.disputed_parcels,
        proj.total_area_hectares.toFixed(2),
        proj.acquired_area_hectares.toFixed(2),
        proj.sanctioned_budget_inr,
        proj.disbursed_amount_inr,
        proj.acquisition_status,
        proj.start_date,
        proj.statutory_deadline,
        proj.ai_risk_score,
        proj.ai_bottleneck_note,
        proj.center_lat.toFixed(4),
        proj.center_lng.toFixed(4),
        true,
        'SYNTHETIC_DEMO_RECORD: Punjab Paddy Belt & Chandigarh Tricity infrastructure project for SIH26016.',
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  interface PlannedParcel {
    globalIdx: number;
    proj: ProjectConfig;
    localIdx: number;
    acquisition_status: AcquisitionStatus;
    explicit?: SeedParcelOverride;
  }

  const planned: PlannedParcel[] = [];

  const projectSlots = new Map<
    string,
    { status: AcquisitionStatus; explicit?: SeedParcelOverride }[]
  >();

  // 1. PRJ-PB-TRICITY-001 (18 parcels: 13 acquired, 3 disputed, 1 approved, 1 notification_issued)
  projectSlots.set('PRJ-PB-TRICITY-001', [
    {
      status: 'acquired',
      explicit: EXPLICIT_PARCELS['PB-SAS-KHR-039-0001'],
    },
    {
      status: 'disputed',
      explicit: EXPLICIT_PARCELS['PB-SAS-KHR-039-0002'],
    },
    { status: 'acquired' }, // PAR-PB-007 (Paramjit Singh Cheema)
    { status: 'acquired' }, // PAR-PB-008
    { status: 'approved' }, // PAR-PB-009
    { status: 'disputed' }, // PAR-PB-010 (15//8/2)
    { status: 'acquired' }, // PAR-PB-011
    { status: 'notification_issued' }, // PAR-PB-012
    { status: 'acquired' }, // PAR-PB-013
    { status: 'acquired' }, // PAR-PB-014
    { status: 'disputed' }, // PAR-PB-015 (22//7/3)
    { status: 'acquired' }, // PAR-PB-016
    { status: 'acquired' }, // PAR-PB-017
    { status: 'acquired' }, // PAR-PB-018
    { status: 'acquired' }, // PAR-PB-057
    { status: 'acquired' }, // PAR-PB-058
    { status: 'acquired' }, // PAR-PB-059
    { status: 'acquired' }, // PAR-PB-060
  ]);

  // 2. PRJ-CHD-METRO-002 (14 parcels: 6 acquired, 4 disputed, 2 approved, 1 notification_issued, 1 documentation_pending)
  projectSlots.set('PRJ-CHD-METRO-002', [
    {
      status: 'approved',
      explicit: EXPLICIT_PARCELS['PB-SAS-KHR-039-0003'],
    },
    {
      status: 'disputed',
      explicit: EXPLICIT_PARCELS['PB-SAS-KHR-039-0004'],
    },
    { status: 'acquired' },
    { status: 'disputed' },
    { status: 'acquired' },
    { status: 'acquired' },
    { status: 'disputed' },
    { status: 'notification_issued' },
    { status: 'acquired' },
    { status: 'disputed' },
    { status: 'documentation_pending' },
    { status: 'acquired' },
    { status: 'approved' },
    { status: 'acquired' },
  ]);

  // 3. PRJ-PB-GMADA-003 (12 parcels: 9 acquired, 1 disputed, 1 notification_issued, 1 approved)
  projectSlots.set('PRJ-PB-GMADA-003', [
    {
      status: 'acquired',
      explicit: EXPLICIT_PARCELS['PB-SAS-KHR-039-0005'],
    },
    { status: 'acquired' },
    { status: 'acquired' },
    { status: 'acquired' },
    { status: 'disputed' },
    { status: 'acquired' },
    { status: 'acquired' },
    { status: 'notification_issued' },
    { status: 'acquired' },
    { status: 'acquired' },
    { status: 'approved' },
    { status: 'acquired' },
  ]);

  // 4. PRJ-HR-PKL-004 (9 parcels: 4 acquired, 3 disputed, 1 not_initiated, 1 documentation_pending)
  projectSlots.set('PRJ-HR-PKL-004', [
    {
      status: 'disputed',
      explicit: EXPLICIT_PARCELS['PB-SAS-KHR-039-0006'],
    },
    { status: 'acquired' },
    { status: 'disputed' },
    { status: 'acquired' },
    { status: 'documentation_pending' },
    { status: 'disputed' },
    { status: 'acquired' },
    { status: 'not_initiated' },
    { status: 'acquired' },
  ]);

  // 5. PRJ-PB-RAIL-005 (7 parcels: 5 acquired, 1 disputed, 1 not_initiated)
  projectSlots.set('PRJ-PB-RAIL-005', [
    { status: 'acquired' },
    { status: 'acquired' },
    { status: 'disputed' },
    { status: 'acquired' },
    { status: 'not_initiated' },
    { status: 'acquired' },
    { status: 'acquired' },
  ]);

  const firstSix: {
    proj: ProjectConfig;
    slot: { status: AcquisitionStatus; explicit?: SeedParcelOverride };
  }[] = [
    { proj: PROJECTS[0], slot: projectSlots.get('PRJ-PB-TRICITY-001')![0] },
    { proj: PROJECTS[0], slot: projectSlots.get('PRJ-PB-TRICITY-001')![1] },
    { proj: PROJECTS[1], slot: projectSlots.get('PRJ-CHD-METRO-002')![0] },
    { proj: PROJECTS[1], slot: projectSlots.get('PRJ-CHD-METRO-002')![1] },
    { proj: PROJECTS[2], slot: projectSlots.get('PRJ-PB-GMADA-003')![0] },
    { proj: PROJECTS[3], slot: projectSlots.get('PRJ-HR-PKL-004')![0] },
  ];

  const remainingSlots: {
    proj: ProjectConfig;
    slot: { status: AcquisitionStatus; explicit?: SeedParcelOverride };
  }[] = [
    ...projectSlots
      .get('PRJ-PB-TRICITY-001')!
      .slice(2, 14)
      .map((slot) => ({ proj: PROJECTS[0], slot })),
    ...projectSlots
      .get('PRJ-CHD-METRO-002')!
      .slice(2)
      .map((slot) => ({ proj: PROJECTS[1], slot })),
    ...projectSlots
      .get('PRJ-PB-GMADA-003')!
      .slice(1)
      .map((slot) => ({ proj: PROJECTS[2], slot })),
    ...projectSlots
      .get('PRJ-HR-PKL-004')!
      .slice(1)
      .map((slot) => ({ proj: PROJECTS[3], slot })),
    ...projectSlots
      .get('PRJ-PB-RAIL-005')!
      .map((slot) => ({ proj: PROJECTS[4], slot })),
    ...projectSlots
      .get('PRJ-PB-TRICITY-001')!
      .slice(14)
      .map((slot) => ({ proj: PROJECTS[0], slot })),
  ];

  const allOrdered = [...firstSix, ...remainingSlots];

  const projLocalCounter = new Map<string, number>();
  for (let i = 0; i < allOrdered.length; i++) {
    const item = allOrdered[i];
    const localIdx = projLocalCounter.get(item.proj.project_id) || 0;
    projLocalCounter.set(item.proj.project_id, localIdx + 1);
    planned.push({
      globalIdx: i + 1,
      proj: item.proj,
      localIdx,
      acquisition_status: item.slot.status,
      explicit: item.slot.explicit,
    });
  }

  const areaByGlobalIdx = new Map<number, number>();
  const awardByGlobalIdx = new Map<number, number>();
  const paidByGlobalIdx = new Map<number, number>();

  for (const proj of PROJECTS) {
    const pItems = planned.filter((x) => x.proj.project_id === proj.project_id);
    const acqItems = pItems.filter((x) => x.acquisition_status === 'acquired');
    const nonAcqItems = pItems.filter(
      (x) => x.acquisition_status !== 'acquired'
    );

    let acqExplicitArea = 0;
    const acqRemaining: PlannedParcel[] = [];
    for (const it of acqItems) {
      if (it.explicit) {
        areaByGlobalIdx.set(it.globalIdx, it.explicit.area_ha);
        acqExplicitArea += it.explicit.area_ha;
      } else {
        acqRemaining.push(it);
      }
    }
    const remAcqArea = Number(
      (proj.acquired_area_hectares - acqExplicitArea).toFixed(2)
    );
    const perAcq = Number((remAcqArea / acqRemaining.length).toFixed(2));
    let runningAcq = 0;
    acqRemaining.forEach((it, idx) => {
      const val =
        idx === acqRemaining.length - 1
          ? Number((remAcqArea - runningAcq).toFixed(2))
          : perAcq;
      runningAcq = Number((runningAcq + val).toFixed(2));
      areaByGlobalIdx.set(it.globalIdx, val);
    });

    const targetNonAcqArea = Number(
      (proj.total_area_hectares - proj.acquired_area_hectares).toFixed(2)
    );
    let nonAcqExplicitArea = 0;
    const nonAcqRemaining: PlannedParcel[] = [];
    for (const it of nonAcqItems) {
      if (it.explicit) {
        areaByGlobalIdx.set(it.globalIdx, it.explicit.area_ha);
        nonAcqExplicitArea += it.explicit.area_ha;
      } else {
        nonAcqRemaining.push(it);
      }
    }
    const remNonAcqArea = Number(
      (targetNonAcqArea - nonAcqExplicitArea).toFixed(2)
    );
    const perNonAcq =
      nonAcqRemaining.length > 0
        ? Number((remNonAcqArea / nonAcqRemaining.length).toFixed(2))
        : 0;
    let runningNonAcq = 0;
    nonAcqRemaining.forEach((it, idx) => {
      const val =
        idx === nonAcqRemaining.length - 1
          ? Number((remNonAcqArea - runningNonAcq).toFixed(2))
          : perNonAcq;
      runningNonAcq = Number((runningNonAcq + val).toFixed(2));
      areaByGlobalIdx.set(it.globalIdx, val);
    });

    let explicitAwardSum = 0;
    let explicitPaidSum = 0;
    const compRemaining: PlannedParcel[] = [];
    for (const it of pItems) {
      if (it.explicit) {
        awardByGlobalIdx.set(it.globalIdx, it.explicit.compensation_award_inr);
        paidByGlobalIdx.set(it.globalIdx, it.explicit.compensation_paid_inr);
        explicitAwardSum += it.explicit.compensation_award_inr;
        explicitPaidSum += it.explicit.compensation_paid_inr;
      } else {
        compRemaining.push(it);
      }
    }

    const remPaidTarget = proj.disbursed_amount_inr - explicitPaidSum;
    const remUnpaidTarget =
      proj.sanctioned_budget_inr -
      proj.disbursed_amount_inr -
      (explicitAwardSum - explicitPaidSum);

    const paidRemItems = compRemaining.filter(
      (x) =>
        x.acquisition_status === 'acquired' ||
        x.acquisition_status === 'approved'
    );
    const unpaidRemItems = compRemaining.filter(
      (x) =>
        x.acquisition_status !== 'acquired' &&
        x.acquisition_status !== 'approved'
    );

    const perPaidItem = Math.round(remPaidTarget / paidRemItems.length);
    let runningPaid = 0;
    paidRemItems.forEach((it, idx) => {
      const val =
        idx === paidRemItems.length - 1
          ? remPaidTarget - runningPaid
          : perPaidItem;
      runningPaid += val;
      awardByGlobalIdx.set(it.globalIdx, val);
      paidByGlobalIdx.set(it.globalIdx, val);
    });

    const perUnpaidItem =
      unpaidRemItems.length > 0
        ? Math.round(remUnpaidTarget / unpaidRemItems.length)
        : 0;
    let runningUnpaid = 0;
    unpaidRemItems.forEach((it, idx) => {
      const val =
        idx === unpaidRemItems.length - 1
          ? remUnpaidTarget - runningUnpaid
          : perUnpaidItem;
      runningUnpaid += val;
      awardByGlobalIdx.set(it.globalIdx, val);
      paidByGlobalIdx.set(it.globalIdx, 0);
    });
  }

  // Generate the 60 irregular contiguous polygons and assign them so that:
  // - Row r=2 holds our 4 highway corridor disputed plots (PAR-PB-002, PAR-PB-004, PAR-PB-010, PAR-PB-015) + corridor plots
  // - Rows r=1 and r=3 hold ONLY non-disputed (Green/Blue available) plots so the Smart Route Optimizer can shift the route into r=1 or r=3 with 0 disputed plots!
  const allCells = generateAll60IrregularCells();
  const row2Cells = allCells.filter((c) => c.row === 2); // 10 cells in row 2
  const clearCorridorCells = allCells.filter(
    (c) => c.row === 1 || c.row === 3
  ); // 20 cells in rows 1 & 3 (all Green/Blue clear!)
  const outerCells = allCells.filter(
    (c) => c.row === 0 || c.row === 4 || c.row === 5
  ); // 30 cells in rows 0, 4, 5

  // Corridor disputed parcel globalIdx set: 2, 4, 10, 15
  const corridorDisputedIdx = new Set([2, 4, 10, 15]);
  // Other corridor parcels on row 2: 1, 7, 8, 9, 12, 16 (total 10 parcels on row 2)
  const corridorClearIdx = new Set([1, 7, 8, 9, 12, 16]);

  const cellByGlobalIdx = new Map<number, IrregularCellPolygon>();

  // Place the 10 row-2 parcels from West to East along row 2:
  const row2ParcelOrder = [8, 2, 7, 4, 9, 1, 10, 12, 15, 16];
  row2ParcelOrder.forEach((gIdx, idx) => {
    cellByGlobalIdx.set(gIdx, row2Cells[idx]);
  });

  // Separate remaining planned parcels into non-disputed vs disputed
  const remainingPlanned = planned.filter(
    (p) =>
      !corridorDisputedIdx.has(p.globalIdx) &&
      !corridorClearIdx.has(p.globalIdx)
  );
  const remainingDisputed = remainingPlanned.filter(
    (p) => p.acquisition_status === 'disputed'
  );
  const remainingClear = remainingPlanned.filter(
    (p) => p.acquisition_status !== 'disputed'
  );

  // Fill all 20 cells of rows 1 and 3 exclusivamente with clear (Green/Blue) parcels!
  for (let i = 0; i < clearCorridorCells.length; i++) {
    const p = remainingClear[i];
    cellByGlobalIdx.set(p.globalIdx, clearCorridorCells[i]);
  }

  // Put the rest of remainingClear + all remainingDisputed into outerCells (rows 0, 4, 5)
  const restForOuter = [
    ...remainingClear.slice(clearCorridorCells.length),
    ...remainingDisputed,
  ];
  for (let i = 0; i < outerCells.length; i++) {
    const p = restForOuter[i];
    cellByGlobalIdx.set(p.globalIdx, outerCells[i]);
  }

  for (const item of planned) {
    const { globalIdx, proj, localIdx, acquisition_status, explicit } = item;
    const paddedId = String(globalIdx).padStart(3, '0');
    const paddedUlpin = String(globalIdx).padStart(4, '0');

    const parcel_id = `PAR-PB-${paddedId}`;
    const landowner_id = `OWN-PB-${paddedId}`;
    const compensation_id = `CMP-PB-${paddedId}`;
    const document_id = `DOC-PB-${paddedId}`;
    const rnr_id = `RNR-PB-${paddedId}`;
    const demo_ulpin = explicit
      ? explicit.ulpin
      : `PB-SAS-KHR-039-${paddedUlpin}`;

    const village =
      globalIdx === 7
        ? '39175 Mauli Baidwan'
        : explicit
        ? explicit.village
        : proj.villages[localIdx % proj.villages.length];
    const tehsil = explicit ? explicit.tehsil : proj.tehsil;
    const district = explicit ? explicit.district : proj.district;
    const state = explicit ? explicit.state : proj.state;

    const assignedCell = cellByGlobalIdx.get(globalIdx)!;
    const khasra_number =
      KHASRA_NUMBERS_60[globalIdx - 1] || `${globalIdx}//1`;
    const ring = assignedCell.ring;

    const area_hectares = areaByGlobalIdx.get(globalIdx)!;
    const land_use_type = explicit
      ? explicit.land_type
      : LAND_USE_TYPES[globalIdx % LAND_USE_TYPES.length];
    const soil_crop_type = explicit
      ? explicit.soil_crop_type
      : SOIL_CROP_TYPES[globalIdx % SOIL_CROP_TYPES.length];

    const total_award_amount_inr = awardByGlobalIdx.get(globalIdx)!;
    const paid_amount_inr = paidByGlobalIdx.get(globalIdx)!;
    const pending_amount_inr = total_award_amount_inr - paid_amount_inr;
    const payment_status: PaymentStatus =
      paid_amount_inr === total_award_amount_inr
        ? 'paid'
        : paid_amount_inr > 0
        ? 'partially_paid'
        : 'pending';

    // Compute exact polygon centroid from vertex ring (excluding closing duplicate vertex)
    const uniqueVertices = ring.slice(0, ring.length - 1);
    const sumLng = uniqueVertices.reduce((acc, pt) => acc + pt[0], 0);
    const sumLat = uniqueVertices.reduce((acc, pt) => acc + pt[1], 0);
    const centroid_lat = Number((sumLat / uniqueVertices.length).toFixed(6));
    const centroid_lng = Number((sumLng / uniqueVertices.length).toFixed(6));

    // 1. Parcel CSV row
    parcelsRows.push(
      [
        parcel_id,
        proj.project_id,
        demo_ulpin,
        khasra_number,
        village,
        tehsil,
        district,
        state,
        area_hectares,
        land_use_type,
        acquisition_status,
        centroid_lat,
        centroid_lng,
        true,
        'SYNTHETIC_DEMO_DATA: Irregular Punjab Paddy Belt Cadastral Mesh polygons centered over Tangori-Chunni Kalan open agricultural fields.',
      ]
        .map(csvEscape)
        .join(',')
    );

    // 2. Landowner CSV row
    const firstName = FIRST_NAMES[globalIdx % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(globalIdx + 2) % LAST_NAMES.length];
    const parentFirst = FIRST_NAMES[(globalIdx + 4) % FIRST_NAMES.length];
    const full_name =
      globalIdx === 7
        ? 'Paramjit Singh Cheema'
        : explicit
        ? explicit.owner_name
        : `${firstName} Singh ${lastName}`;
    const father_or_spouse_name = `${parentFirst} Singh ${lastName}`;
    const dummy_contact_number = `+91-90000-${String(globalIdx).padStart(
      5,
      '0'
    )}`;
    const dummy_email = `synthetic.owner.${paddedId}@demo-bhoomitrack.invalid`;
    const isJointKhewat = globalIdx <= 13 || globalIdx === 17;
    const ownership_type = isJointKhewat
      ? 'Joint Khewat (2 Co-Sharers)'
      : 'Sole Khewat';
    const share_percentage = isJointKhewat ? 50 : 100;
    const kyc_verified =
      acquisition_status === 'approved' || acquisition_status === 'acquired';

    landownersRows.push(
      [
        landowner_id,
        parcel_id,
        proj.project_id,
        full_name,
        father_or_spouse_name,
        dummy_contact_number,
        dummy_email,
        village,
        district,
        ownership_type,
        share_percentage,
        kyc_verified,
        true,
        'SYNTHETIC_DEMO_PII: Fictional name, dummy phone, and invalid email for SIH26016 testing.',
      ]
        .map(csvEscape)
        .join(',')
    );

    // 3. Compensation CSV row
    const multiplier_factor = 1.5;
    const base_market_value_inr = Math.round(total_award_amount_inr * 0.4);
    const solatium_amount_inr = base_market_value_inr;
    const pfms_reference_code = `PFMS-TRICITY-2026-${paddedId}`;
    const award_date = `2026-0${(globalIdx % 6) + 1}-${String(
      (localIdx % 20) + 5
    ).padStart(2, '0')}`;

    compensationRows.push(
      [
        compensation_id,
        parcel_id,
        proj.project_id,
        landowner_id,
        base_market_value_inr,
        solatium_amount_inr,
        multiplier_factor,
        total_award_amount_inr,
        paid_amount_inr,
        pending_amount_inr,
        payment_status,
        pfms_reference_code,
        award_date,
        true,
        'SYNTHETIC_DEMO_AWARD: Illustrative RFCTLARR compensation calculation for demonstration only.',
      ]
        .map(csvEscape)
        .join(',')
    );

    // 4. Document verification CSV row
    const verification_status =
      acquisition_status === 'acquired' || acquisition_status === 'approved'
        ? 'verified'
        : acquisition_status === 'disputed'
        ? 'objection_logged'
        : 'pending_verification';
    const jamabandi_status =
      verification_status === 'verified'
        ? 'Matched with Demo Jamabandi'
        : 'Under Review';
    const section_11_gazette_ref =
      acquisition_status === 'not_initiated'
        ? 'PENDING'
        : `TRICITY-GAZ-S11-2026-${paddedId}`;
    const section_19_declaration_ref =
      acquisition_status === 'approved' || acquisition_status === 'acquired'
        ? `TRICITY-GAZ-S19-2026-${paddedId}`
        : 'PENDING';
    const encumbrance_certificate_status = explicit?.dispute_reason
      ? explicit.dispute_reason.slice(0, 80)
      : acquisition_status === 'disputed'
      ? 'Section 15 / Paddy Multiplier & Canal Partition Objection Logged'
      : 'Clear (Verified)';

    documentsRows.push(
      [
        document_id,
        parcel_id,
        proj.project_id,
        landowner_id,
        jamabandi_status,
        section_11_gazette_ref,
        section_19_declaration_ref,
        encumbrance_certificate_status,
        verification_status,
        `DRO-${district.toUpperCase().slice(0, 3)}-TRICITY`,
        award_date,
        true,
        'SYNTHETIC_DEMO_DOC: Fictional statutory document verification record.',
      ]
        .map(csvEscape)
        .join(',')
    );

    // 5. Rehabilitation & Resettlement CSV row
    const affected_family_size = explicit
      ? explicit.family_members
      : globalIdx <= 35
      ? 6
      : 5;
    const baseCategory =
      land_use_type === 'Commercial'
        ? 'Commercial / Abadi Deh Holder'
        : 'Agricultural Khatedar Household';
    const livelihood_category = isJointKhewat
      ? `${baseCategory} (Joint Khewat - 2 Families)`
      : baseCategory;
    const subsistence_allowance_inr = 36000;
    const resettlement_grant_inr = 500000;
    const housing_unit_entitled = land_use_type === 'Residential';
    const rnr_status: 'assessment_ongoing' | 'allotted' | 'completed' = explicit
      ? explicit.rnr_status
      : acquisition_status === 'acquired'
      ? 'completed'
      : acquisition_status !== 'disputed'
      ? 'allotted'
      : 'assessment_ongoing';

    rnrRows.push(
      [
        rnr_id,
        parcel_id,
        proj.project_id,
        landowner_id,
        affected_family_size,
        livelihood_category,
        subsistence_allowance_inr,
        resettlement_grant_inr,
        housing_unit_entitled,
        rnr_status,
        payment_status,
        `RNR-TRICITY-${paddedId}`,
        true,
        'SYNTHETIC_DEMO_RNR: Illustrative RFCTLARR Schedule II R&R record.',
      ]
        .map(csvEscape)
        .join(',')
    );

    // 6. GeoJSON Polygon Feature (Irregular Cadastral Mesh Polygon)
    geojsonFeatures.push({
      type: 'Feature',
      id: parcel_id,
      properties: {
        parcel_id,
        project_id: proj.project_id,
        project_name: proj.project_name,
        demo_ulpin,
        khasra_number,
        village,
        tehsil,
        district,
        state,
        area_hectares,
        land_use_type,
        soil_crop_type,
        acquisition_status,
        payment_status,
        total_award_amount_inr,
        landowner_id,
        landowner_name: full_name,
        compensation_id,
        document_id,
        rnr_id,
        dispute_reason: encumbrance_certificate_status,
        is_synthetic_demo: true,
        disclaimer:
          'SYNTHETIC_DEMO_POLYGON: Irregular 16-deg canal-aligned Punjab Paddy Belt Cadastral polygon.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    });
  }

  fs.writeFileSync(
    path.join(DATA_DIR, 'projects.csv'),
    projectsRows.join('\n') + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'parcels.csv'),
    parcelsRows.join('\n') + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'landowners.csv'),
    landownersRows.join('\n') + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'compensation.csv'),
    compensationRows.join('\n') + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'documents.csv'),
    documentsRows.join('\n') + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'rehabilitation_resettlement.csv'),
    rnrRows.join('\n') + '\n',
    'utf8'
  );

  const featureCollection = {
    type: 'FeatureCollection',
    name: 'BhoomiTrack_AI_Punjab_Paddy_Belt_Irregular_Cadastral_Parcels',
    metadata: {
      dataset_name:
        'Tangori–Chunni Kalan–Sirhind Greenfield Paddy Belt Irregular Cadastral Dataset',
      region: 'SAS Nagar (Mohali) / Fatehgarh Sahib Border, Punjab',
      center: [PADDY_BELT_CENTER_LAT, PADDY_BELT_CENTER_LNG],
      statutory_framework: 'RFCTLARR Act, 2013',
      is_synthetic_demo: true,
      feature_count: geojsonFeatures.length,
    },
    features: geojsonFeatures,
  };

  fs.writeFileSync(
    path.join(DATA_DIR, 'parcels.geojson'),
    JSON.stringify(featureCollection, null, 2) + '\n',
    'utf8'
  );

  console.log(
    'Successfully generated 60-polygon Irregular Punjab Paddy Belt dataset in /data:'
  );
  console.log(`- projects.csv (${projectsRows.length - 1} records)`);
  console.log(`- parcels.csv (${parcelsRows.length - 1} records)`);
  console.log(`- landowners.csv (${landownersRows.length - 1} records)`);
  console.log(`- compensation.csv (${compensationRows.length - 1} records)`);
  console.log(`- documents.csv (${documentsRows.length - 1} records)`);
  console.log(
    `- rehabilitation_resettlement.csv (${rnrRows.length - 1} records)`
  );
  console.log(
    `- parcels.geojson (${geojsonFeatures.length} Irregular Polygon features)`
  );
}

generateDataset();

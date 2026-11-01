import type { Timestamp } from 'firebase/firestore';

export type ModuleId =
  | 'dashboard'
  | 'projects'
  | 'parcels'
  | 'gis'
  | 'workflow'
  | 'compensation'
  | 'rehab'
  | 'documents'
  | 'ai'
  | 'reports';

export type AcquisitionStatusCode =
  | 'not_initiated'
  | 'notification_issued'
  | 'documentation_pending'
  | 'disputed'
  | 'approved'
  | 'acquired';

export type PaymentStatusCode = 'pending' | 'partially_paid' | 'paid';

export type ProjectStage =
  | 'Section 4 SIA'
  | 'Section 11 Notification'
  | 'Section 19 Declaration'
  | 'Section 23 Award'
  | 'Possession Taken';

export type ProjectStatus = 'Active' | 'Delayed' | 'Disputed' | 'Completed';

export type LandType = 'Agricultural' | 'Residential' | 'Commercial' | 'Barren' | 'Forest';

export type ParcelAcquisitionStage =
  | 'Survey Pending'
  | 'SIA Underway'
  | 'Notification Issued'
  | 'Award Declared'
  | 'Compensation Paid'
  | 'Possession Handover';

export type CompensationStatus = 'Pending Assessment' | 'Approved' | 'Disbursed' | 'Litigation';

export type RehabStatus = 'Not Applicable' | 'Eligible' | 'Allotted' | 'Completed';

export interface Project {
  id: string;
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
  ownerId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LandParcel {
  id: string;
  surveyNumber: string;
  projectId: string;
  projectTitle: string;
  village: string;
  district: string;
  landownerName: string;
  areaHectares: number;
  landType: LandType;
  acquisitionStage: ParcelAcquisitionStage;
  compensationStatus: CompensationStatus;
  compensationAmountInr: number;
  rehabStatus: RehabStatus;
  latitude: number;
  longitude: number;
  ownerId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface LandownerRecord {
  id: string;
  landownerId: string;
  parcelId: string;
  projectId: string;
  fullName: string;
  fatherOrSpouseName: string;
  dummyContactNumber: string;
  dummyEmail: string;
  village: string;
  district: string;
  ownershipType: string;
  sharePercentage: number;
  kycVerified: boolean;
  isSyntheticDemo: boolean;
  ownerId: string;
}

export interface CompensationRecord {
  id: string;
  compensationId: string;
  parcelId: string;
  projectId: string;
  landownerId: string;
  baseMarketValueInr: number;
  solatiumAmountInr: number;
  multiplierFactor: number;
  totalAwardAmountInr: number;
  paidAmountInr: number;
  pendingAmountInr: number;
  paymentStatus: PaymentStatusCode;
  pfmsReferenceCode: string;
  awardDate: string;
  isSyntheticDemo: boolean;
  ownerId: string;
}

export interface DocumentRecord {
  id: string;
  documentId: string;
  parcelId: string;
  projectId: string;
  landownerId: string;
  jamabandiStatus: string;
  section11GazetteRef: string;
  section19DeclarationRef: string;
  encumbranceStatus: string;
  verificationStatus: 'verified' | 'objection_logged' | 'pending_verification';
  verifiedByOfficer: string;
  isSyntheticDemo: boolean;
  ownerId: string;
}

export interface RehabilitationRecord {
  id: string;
  rnrId: string;
  parcelId: string;
  projectId: string;
  landownerId: string;
  affectedFamilySize: number;
  livelihoodCategory: string;
  subsistenceAllowanceInr: number;
  resettlementGrantInr: number;
  housingUnitEntitled: boolean;
  rnrStatus: 'assessment_ongoing' | 'allotted' | 'completed';
  paymentStatus: PaymentStatusCode;
  allotmentReference: string;
  isSyntheticDemo: boolean;
  ownerId: string;
}

export interface ParcelGeometryRecord {
  id: string;
  parcelId: string;
  projectId: string;
  demoUlpin: string;
  acquisitionStatus: AcquisitionStatusCode;
  paymentStatus: PaymentStatusCode;
  village: string;
  district: string;
  bboxLatMin: number;
  bboxLatMax: number;
  bboxLngMin: number;
  bboxLngMax: number;
  isSyntheticDemo: boolean;
  ownerId: string;
}

export interface GeoJsonParcelFeature {
  type: 'Feature';
  id: string;
  properties: {
    parcel_id: string;
    project_id: string;
    project_name: string;
    demo_ulpin: string;
    khasra_number: string;
    village: string;
    tehsil: string;
    district: string;
    state: string;
    area_hectares: number;
    land_use_type: string;
    soil_crop_type?: string;
    acquisition_status: AcquisitionStatusCode;
    payment_status: PaymentStatusCode;
    total_award_amount_inr: number;
    landowner_id: string;
    landowner_name: string;
    compensation_id: string;
    document_id: string;
    rnr_id: string;
    dispute_reason?: string;
    is_synthetic_demo: boolean;
    disclaimer: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface GeoJsonParcelCollection {
  type: 'FeatureCollection';
  name: string;
  metadata?: Record<string, unknown>;
  features: GeoJsonParcelFeature[];
}

export const ACQUISITION_STATUS_CODES: AcquisitionStatusCode[] = [
  'not_initiated',
  'notification_issued',
  'documentation_pending',
  'disputed',
  'approved',
  'acquired',
];

export const PAYMENT_STATUS_CODES: PaymentStatusCode[] = [
  'pending',
  'partially_paid',
  'paid',
];

export const PROJECT_STAGES: ProjectStage[] = [
  'Section 4 SIA',
  'Section 11 Notification',
  'Section 19 Declaration',
  'Section 23 Award',
  'Possession Taken',
];

export const PROJECT_STATUSES: ProjectStatus[] = ['Active', 'Delayed', 'Disputed', 'Completed'];

export const LAND_TYPES: LandType[] = [
  'Agricultural',
  'Residential',
  'Commercial',
  'Barren',
  'Forest',
];

export const PARCEL_STAGES: ParcelAcquisitionStage[] = [
  'Survey Pending',
  'SIA Underway',
  'Notification Issued',
  'Award Declared',
  'Compensation Paid',
  'Possession Handover',
];

export const COMPENSATION_STATUSES: CompensationStatus[] = [
  'Pending Assessment',
  'Approved',
  'Disbursed',
  'Litigation',
];

export const REHAB_STATUSES: RehabStatus[] = [
  'Not Applicable',
  'Eligible',
  'Allotted',
  'Completed',
];

export function stageToAcquisitionStatusCode(
  stage: ParcelAcquisitionStage,
  compStatus: CompensationStatus
): AcquisitionStatusCode {
  if (compStatus === 'Litigation') return 'disputed';
  switch (stage) {
    case 'Survey Pending':
      return 'not_initiated';
    case 'SIA Underway':
      return 'documentation_pending';
    case 'Notification Issued':
      return 'notification_issued';
    case 'Award Declared':
    case 'Compensation Paid':
      return 'approved';
    case 'Possession Handover':
      return 'acquired';
    default:
      return 'notification_issued';
  }
}

export function acquisitionStatusCodeToStage(
  code: AcquisitionStatusCode
): {
  acquisitionStage: ParcelAcquisitionStage;
  compensationStatus?: CompensationStatus;
} {
  switch (code) {
    case 'not_initiated':
      return { acquisitionStage: 'Survey Pending' };
    case 'notification_issued':
      return { acquisitionStage: 'Notification Issued' };
    case 'documentation_pending':
      return { acquisitionStage: 'SIA Underway' };
    case 'disputed':
      return {
        acquisitionStage: 'Notification Issued',
        compensationStatus: 'Litigation',
      };
    case 'approved':
      return { acquisitionStage: 'Award Declared' };
    case 'acquired':
      return {
        acquisitionStage: 'Possession Handover',
        compensationStatus: 'Disbursed',
      };
  }
}

// Validation constants synchronized with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  CODE_PATTERN: /^[A-Za-z0-9_\-]+$/,
  PROJECT: {
    TITLE_MIN: 3,
    TITLE_MAX: 150,
    CODE_MIN: 2,
    CODE_MAX: 40,
    STATE_MIN: 2,
    STATE_MAX: 80,
    DISTRICT_MIN: 2,
    DISTRICT_MAX: 80,
    AGENCY_MIN: 2,
    AGENCY_MAX: 100,
    AREA_MAX: 10000000,
    BUDGET_MAX: 10000000,
  },
  PARCEL: {
    SURVEY_MIN: 1,
    SURVEY_MAX: 60,
    VILLAGE_MIN: 2,
    VILLAGE_MAX: 100,
    DISTRICT_MIN: 2,
    DISTRICT_MAX: 80,
    OWNER_NAME_MIN: 2,
    OWNER_NAME_MAX: 120,
    AREA_MAX: 100000,
    COMPENSATION_MAX: 100000000000,
  },
};

export function sanitizeProjectInput(raw: {
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
  ownerId: string;
}) {
  const title = raw.title.trim().slice(0, BLUEPRINT_CONSTRAINTS.PROJECT.TITLE_MAX);
  const code = raw.code
    .trim()
    .replace(/[^A-Za-z0-9_\-]/g, '-')
    .slice(0, BLUEPRINT_CONSTRAINTS.PROJECT.CODE_MAX);
  const state = raw.state.trim().slice(0, BLUEPRINT_CONSTRAINTS.PROJECT.STATE_MAX);
  const district = raw.district.trim().slice(0, BLUEPRINT_CONSTRAINTS.PROJECT.DISTRICT_MAX);
  const agency = raw.agency.trim().slice(0, BLUEPRINT_CONSTRAINTS.PROJECT.AGENCY_MAX);

  if (title.length < BLUEPRINT_CONSTRAINTS.PROJECT.TITLE_MIN) {
    throw new Error('Project title must be at least 3 characters.');
  }
  if (code.length < BLUEPRINT_CONSTRAINTS.PROJECT.CODE_MIN || !BLUEPRINT_CONSTRAINTS.CODE_PATTERN.test(code)) {
    throw new Error('Project code must be 2-40 alphanumeric, hyphen, or underscore characters.');
  }
  if (state.length < BLUEPRINT_CONSTRAINTS.PROJECT.STATE_MIN) {
    throw new Error('State name must be at least 2 characters.');
  }
  if (district.length < BLUEPRINT_CONSTRAINTS.PROJECT.DISTRICT_MIN) {
    throw new Error('District name must be at least 2 characters.');
  }
  if (agency.length < BLUEPRINT_CONSTRAINTS.PROJECT.AGENCY_MIN) {
    throw new Error('Executing agency must be at least 2 characters.');
  }

  const totalAreaHectares = Math.max(
    0,
    Math.min(Number(raw.totalAreaHectares) || 0, BLUEPRINT_CONSTRAINTS.PROJECT.AREA_MAX)
  );
  const acquiredAreaHectares = Math.max(
    0,
    Math.min(Number(raw.acquiredAreaHectares) || 0, totalAreaHectares)
  );
  const budgetInrCrores = Math.max(
    0,
    Math.min(Number(raw.budgetInrCrores) || 0, BLUEPRINT_CONSTRAINTS.PROJECT.BUDGET_MAX)
  );
  const disbursedInrCrores = Math.max(
    0,
    Math.min(Number(raw.disbursedInrCrores) || 0, budgetInrCrores)
  );

  return {
    title,
    code,
    state,
    district,
    agency,
    totalAreaHectares,
    acquiredAreaHectares,
    budgetInrCrores,
    disbursedInrCrores,
    stage: PROJECT_STAGES.includes(raw.stage) ? raw.stage : 'Section 4 SIA',
    status: PROJECT_STATUSES.includes(raw.status) ? raw.status : 'Active',
    ownerId: raw.ownerId,
  };
}

export function sanitizeParcelInput(raw: {
  surveyNumber: string;
  projectId: string;
  projectTitle: string;
  village: string;
  district: string;
  landownerName: string;
  areaHectares: number;
  landType: LandType;
  acquisitionStage: ParcelAcquisitionStage;
  compensationStatus: CompensationStatus;
  compensationAmountInr: number;
  rehabStatus: RehabStatus;
  latitude: number;
  longitude: number;
  ownerId: string;
}) {
  const surveyNumber = raw.surveyNumber.trim().slice(0, BLUEPRINT_CONSTRAINTS.PARCEL.SURVEY_MAX);
  const projectTitle = raw.projectTitle.trim().slice(0, BLUEPRINT_CONSTRAINTS.PROJECT.TITLE_MAX);
  const village = raw.village.trim().slice(0, BLUEPRINT_CONSTRAINTS.PARCEL.VILLAGE_MAX);
  const district = raw.district.trim().slice(0, BLUEPRINT_CONSTRAINTS.PARCEL.DISTRICT_MAX);
  const landownerName = raw.landownerName.trim().slice(0, BLUEPRINT_CONSTRAINTS.PARCEL.OWNER_NAME_MAX);

  if (surveyNumber.length < BLUEPRINT_CONSTRAINTS.PARCEL.SURVEY_MIN) {
    throw new Error('Survey / Khasra number is required.');
  }
  if (!BLUEPRINT_CONSTRAINTS.ID_PATTERN.test(raw.projectId)) {
    throw new Error('Valid parent project selection is required.');
  }
  if (village.length < BLUEPRINT_CONSTRAINTS.PARCEL.VILLAGE_MIN) {
    throw new Error('Village name must be at least 2 characters.');
  }
  if (district.length < BLUEPRINT_CONSTRAINTS.PARCEL.DISTRICT_MIN) {
    throw new Error('District name must be at least 2 characters.');
  }
  if (landownerName.length < BLUEPRINT_CONSTRAINTS.PARCEL.OWNER_NAME_MIN) {
    throw new Error('Landowner name must be at least 2 characters.');
  }

  const areaHectares = Math.max(
    0.01,
    Math.min(Number(raw.areaHectares) || 0.1, BLUEPRINT_CONSTRAINTS.PARCEL.AREA_MAX)
  );
  const compensationAmountInr = Math.max(
    0,
    Math.min(Number(raw.compensationAmountInr) || 0, BLUEPRINT_CONSTRAINTS.PARCEL.COMPENSATION_MAX)
  );
  const latitude = Math.max(-90, Math.min(90, Number(raw.latitude) || 30.7046));
  const longitude = Math.max(-180, Math.min(180, Number(raw.longitude) || 76.7179));

  return {
    surveyNumber,
    projectId: raw.projectId,
    projectTitle,
    village,
    district,
    landownerName,
    areaHectares,
    landType: LAND_TYPES.includes(raw.landType) ? raw.landType : 'Agricultural',
    acquisitionStage: PARCEL_STAGES.includes(raw.acquisitionStage)
      ? raw.acquisitionStage
      : 'Survey Pending',
    compensationStatus: COMPENSATION_STATUSES.includes(raw.compensationStatus)
      ? raw.compensationStatus
      : 'Pending Assessment',
    compensationAmountInr,
    rehabStatus: REHAB_STATUSES.includes(raw.rehabStatus) ? raw.rehabStatus : 'Not Applicable',
    latitude,
    longitude,
    ownerId: raw.ownerId,
  };
}

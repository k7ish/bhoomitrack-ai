import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Home,
  Landmark,
  Layers,
  Lock,
  LogIn,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  stageToAcquisitionStatusCode,
  type AcquisitionStatusCode,
  type CompensationRecord,
  type DocumentRecord,
  type GeoJsonParcelCollection,
  type LandownerRecord,
  type LandParcel,
  type ParcelGeometryRecord,
  type Project,
  type RehabilitationRecord,
} from '../types/bhoomi';

export type PortalRole = 'gateway' | 'government' | 'landowner';

type LanguageMode = 'en' | 'pa' | 'hi';

const DEMO_LANDOWNER_PROFILES = [
  {
    parcelId: 'PAR-PB-004',
    khasra: '4',
    name: 'Sukhdev Singh Bajwa',
    meta: 'PAR-PB-004 · Khasra 4 · Sec 15 Hearing · Mullanpur Garibdass',
  },
] as const;

const KHEWAT_BY_PARCEL: Record<string, string> = {
  'PAR-PB-001': '166',
  'PAR-PB-002': '91',
  'PAR-PB-003': '32',
  'PAR-PB-004': '115',
  'PAR-PB-005': '166',
  'PAR-PB-006': '19',
  'PAR-PB-007': '84',
};

function formatCurrencyInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatCroreShort(amount: number): string {
  const cr = amount / 10000000;
  if (cr >= 1) {
    return `₹${cr.toFixed(2)} Cr`;
  }
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(2)} L`;
}

function formatKanalMarlaExact(areaHa: number): string {
  // 1 Hectare = 19 Kanal 15 Marla (395 Marlas)
  const totalMarlas = Math.round(areaHa * 395);
  const kanals = Math.floor(totalMarlas / 20);
  const marlas = totalMarlas % 20;
  return `${kanals} Kanal ${marlas} Marla`;
}

function formatLandClassificationLabel(landType: string): string {
  switch (landType) {
    case 'Agricultural':
      return 'Agricultural Chahi';
    case 'Residential':
      return 'Residential Abadi';
    case 'Commercial':
      return 'Commercial Corridor';
    case 'Barren':
      return 'Non-Developable / Institutional (Khewat 166)';
    case 'Forest':
      return 'Forest / Protected Zone';
    default:
      return landType;
  }
}

export interface PortalGatewayViewProps {
  parcels: LandParcel[];
  landowners: LandownerRecord[];
  geometries: ParcelGeometryRecord[];
  onEnterOfficerPortal: () => void;
  onSignInWithGoogle: () => void;
  onEnterLandownerPortal: (parcelId: string) => void;
}

export const PortalGatewayView: React.FC<PortalGatewayViewProps> = ({
  parcels,
  landowners,
  geometries,
  onEnterOfficerPortal,
  onSignInWithGoogle,
  onEnterLandownerPortal,
}) => {
  const [activeTab, setActiveTab] = useState<'officer' | 'landowner'>(
    'officer'
  );

  // Officer Login form state
  const [officerEmail, setOfficerEmail] = useState(
    'cala.sasnagar@punjab.gov.in'
  );
  const [officerPassword, setOfficerPassword] = useState('••••••••••••');

  // Landowner Lookup state (Sukhdev Singh Bajwa)
  const [lookupInput, setLookupInput] = useState('PAR-PB-004');
  const [lookupError, setLookupError] = useState<string | null>(null);

  const resolveParcelFromLookup = (raw: string): string | null => {
    const q = raw.trim().toLowerCase();
    if (!q) return null;

    // Direct match for Sukhdev's credentials (PAR-PB-004, Khasra 4, Khewat 115, Sukhdev)
    const sukhdevParcel =
      parcels.find((p) => p.id === 'PAR-PB-004') ||
      parcels.find((p) => p.landownerName.toLowerCase().includes('sukhdev')) ||
      parcels.find((p) => p.surveyNumber === '4');

    if (
      q === 'par-pb-004' ||
      q === '4' ||
      q.includes('sukhdev') ||
      q.includes('bajwa') ||
      q === '115'
    ) {
      return sukhdevParcel ? sukhdevParcel.id : 'PAR-PB-004';
    }

    const byParcelId = parcels.find((p) => p.id.toLowerCase() === q);
    if (byParcelId && (byParcelId.id === 'PAR-PB-004' || byParcelId.landownerName.toLowerCase().includes('sukhdev'))) {
      return byParcelId.id;
    }

    const byKhasra = parcels.find((p) => p.surveyNumber.toLowerCase() === q);
    if (byKhasra && (byKhasra.id === 'PAR-PB-004' || byKhasra.landownerName.toLowerCase().includes('sukhdev'))) {
      return byKhasra.id;
    }

    // Default to Sukhdev's record for landowner portal
    return sukhdevParcel ? sukhdevParcel.id : 'PAR-PB-004';
  };

  const handleLandownerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedId = resolveParcelFromLookup(lookupInput);
    if (!matchedId) {
      setLookupError(
        `Record not found for "${lookupInput}". Only Sukhdev Singh Bajwa's record (PAR-PB-004 / Khasra 4) is accessible in this portal.`
      );
      return;
    }
    setLookupError(null);
    onEnterLandownerPortal(matchedId);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Minimalist Dual-Color Official Header (Navy #0B192C + White) */}
      <header className="bg-[#0B192C] text-white border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white text-[#0B192C] flex items-center justify-center font-bold text-sm">
              BT
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">
                BhoomiTrack
              </h1>
              <p className="text-xs text-slate-300">
                Land Acquisition &amp; Revenue Administration Portal · SAS Nagar
                (Mohali)
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-xs text-slate-300 font-mono">
            RFCTLARR Act, 2013
          </div>
        </div>
      </header>

      {/* Simple Centered Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-[#0B192C]">Portal Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your portal role to access land acquisition records.
            </p>

            {/* Clean 2-Tab Role Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 mt-4 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('officer')}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'officer'
                    ? 'bg-[#0B192C] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Government Officer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('landowner')}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'landowner'
                    ? 'bg-[#0B192C] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Landowner Portal
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6">
            {activeTab === 'officer' ? (
              /* TAB 1: GOVERNMENT OFFICER LOGIN */
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onEnterOfficerPortal();
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Email or Officer ID
                    </label>
                    <input
                      type="text"
                      value={officerEmail}
                      onChange={(e) => setOfficerEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0B192C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={officerPassword}
                      onChange={(e) => setOfficerPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0B192C]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Sign In to Officer Workspace
                  </button>
                </form>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-white px-2 text-slate-400">
                      Quick Access
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onEnterOfficerPortal}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0B192C] border border-slate-300 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Instant Demo Officer Access (SDM / CALA Mohali)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSignInWithGoogle();
                      onEnterOfficerPortal();
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign in with Google
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: PUBLIC LANDOWNER (KHATEDAR) LOGIN */
              <div className="space-y-4">
                <form onSubmit={handleLandownerSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Parcel ID, Khasra No., ULPIN, or Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={lookupInput}
                        onChange={(e) => {
                          setLookupInput(e.target.value);
                          setLookupError(null);
                        }}
                        placeholder="e.g., PAR-PB-004, Khasra 4, or Sukhdev"
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0B192C]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white font-semibold text-xs transition shrink-0 cursor-pointer"
                      >
                        Open Record
                      </button>
                    </div>
                    {lookupError && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {lookupError}
                      </p>
                    )}
                  </div>
                </form>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Active Khatedar (Landowner) Record:
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-xs font-bold text-[#0B192C]">
                            Sukhdev Singh Bajwa
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5 truncate">
                          PAR-PB-004 · Khasra 4 · Khewat 115
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Mullanpur Garibdass · Sec 15 Hearing Active
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEnterLandownerPortal('PAR-PB-004')}
                        className="px-3.5 py-2 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white font-semibold text-xs transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        Access Record →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 px-6 text-center text-xs text-slate-500">
        Department of Revenue, Rehabilitation &amp; Disaster Management ·
        District SAS Nagar (Mohali)
      </footer>
    </div>
  );
};

export interface LandownerPortalViewProps {
  selectedParcelId: string;
  onSelectParcelId: (parcelId: string) => void;
  projects: Project[];
  parcels: LandParcel[];
  landowners: LandownerRecord[];
  compensations: CompensationRecord[];
  documents: DocumentRecord[];
  rehabilitations: RehabilitationRecord[];
  geometries: ParcelGeometryRecord[];
  liveGeoJson: GeoJsonParcelCollection;
  onSwitchToOfficerPortal: () => void;
  onBackToGateway: () => void;
  onVerifyLandownerKyc: (parcelId: string) => Promise<void>;
  onSubmitLandownerObjection: (
    parcelId: string,
    category: string,
    remarks: string
  ) => Promise<void>;
}

type LandownerTab = 'overview' | 'compensation' | 'map' | 'kyc_grievance' | 'documents';

interface StageInfo {
  step: number;
  code: string;
  name: { en: string; pa: string; hi: string };
  desc: { en: string; pa: string; hi: string };
}

const STATUTORY_STAGES: StageInfo[] = [
  {
    step: 1,
    code: 'Sec 11',
    name: {
      en: 'Preliminary Notification',
      pa: 'ਮੁੱਢਲਾ ਨੋਟਿਸ',
      hi: 'प्रारंभिक अधिसूचना',
    },
    desc: {
      en: 'Official Gazette publication of land proposal and survey freeze',
      pa: 'ਸਰਕਾਰੀ ਗਜ਼ਟ ਵਿੱਚ ਜ਼ਮੀਨ ਤਜਵੀਜ਼ ਅਤੇ ਸਰਵੇਖਣ ਦੀ ਪ੍ਰਕਾਸ਼ਨਾ',
      hi: 'सरकारी राजपत्र में भूमि प्रस्ताव और सर्वेक्षण का प्रकाशन',
    },
  },
  {
    step: 2,
    code: 'Sec 15',
    name: {
      en: 'Hearing of Objections',
      pa: 'ਇਤਰਾਜ਼ਾਂ ਦੀ ਸੁਣਵਾਈ',
      hi: 'आपत्तियों की सुनवाई',
    },
    desc: {
      en: 'Landowner hearing before the District Collector for claims and boundaries',
      pa: 'ਜ਼ਿਲ੍ਹਾ ਕੁਲੈਕਟਰ ਸਾਹਮਣੇ ਦਾਅਵਿਆਂ ਅਤੇ ਹੱਦਾਂ ਸੰਬੰਧੀ ਸੁਣਵਾਈ',
      hi: 'जिला कलेक्टर के समक्ष दावों और सीमाओं पर सुनवाई',
    },
  },
  {
    step: 3,
    code: 'Sec 19',
    name: {
      en: 'Declaration of Acquisition',
      pa: 'ਗ੍ਰਹਿਣ ਦਾ ਐਲਾਨ',
      hi: 'अधिग्रहण की घोषणा',
    },
    desc: {
      en: 'Final statutory declaration published with Rehabilitation scheme',
      pa: 'ਪੁਨਰਵਾਸ ਸਕੀਮ ਨਾਲ ਅੰਤਿਮ ਕਾਨੂੰਨੀ ਐਲਾਨ ਪ੍ਰਕਾਸ਼ਿਤ',
      hi: 'पुनर्वास योजना के साथ अंतिम वैधानिक घोषणा प्रकाशित',
    },
  },
  {
    step: 4,
    code: 'Sec 23/30',
    name: {
      en: 'Compensation Award',
      pa: 'ਮੁਆਵਜ਼ਾ ਅਵਾਰਡ',
      hi: 'मुआवजा अवार्ड',
    },
    desc: {
      en: 'Market rate determined, 100% Solatium bonus added & PFMS DBT bank credit',
      pa: 'ਮਾਰਕੀਟ ਦਰ ਤੈਅ, 100% ਸੋਲੇਸ਼ੀਅਮ ਬੋਨਸ ਅਤੇ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਭੁਗਤਾਨ',
      hi: 'बाजार दर तय, 100% सोलेशियम बोनस और बैंक खाते में भुगतान',
    },
  },
  {
    step: 5,
    code: 'Sec 38',
    name: {
      en: 'Handover & Possession',
      pa: 'ਕਬਜ਼ਾ ਸੌਂਪਣਾ',
      hi: 'कब्जा हस्तांतरण',
    },
    desc: {
      en: 'Final mutation recorded in revenue records and land transferred',
      pa: 'ਮਾਲ ਰਿਕਾਰਡ ਵਿੱਚ ਇੰਤਕਾਲ ਦਰਜ ਅਤੇ ਜ਼ਮੀਨ ਹਵਾਲੇ ਕੀਤੀ ਗਈ',
      hi: 'राजस्व रिकॉर्ड में दाखिल-खारिज और भूमि का कब्जा सौंपा गया',
    },
  },
];

function getStageStep(status: AcquisitionStatusCode, stageLabel: string): number {
  if (status === 'acquired' || stageLabel === 'Possession Handover') return 5;
  if (
    status === 'approved' ||
    stageLabel === 'Compensation Paid' ||
    stageLabel === 'Award Declared'
  )
    return 4;
  if (status === 'disputed') return 2;
  if (status === 'notification_issued' || stageLabel === 'Notification Issued')
    return 1;
  return 1;
}

export const LandownerPortalView: React.FC<LandownerPortalViewProps> = ({
  selectedParcelId,
  onSelectParcelId,
  projects,
  parcels,
  landowners,
  compensations,
  documents,
  rehabilitations,
  geometries,
  liveGeoJson,
  onSwitchToOfficerPortal,
  onBackToGateway,
  onVerifyLandownerKyc,
  onSubmitLandownerObjection,
}) => {
  const [activeTab, setActiveTab] = useState<LandownerTab>('overview');
  const [lang, setLang] = useState<LanguageMode>('en');
  const [kycLoading, setKycLoading] = useState(false);
  const [kycBanner, setKycBanner] = useState<string | null>(null);
  const [gazettePreviewOpen, setGazettePreviewOpen] = useState(false);

  // Grievance / Objection Form state
  const [objectionCategory, setObjectionCategory] = useState(
    'Market Rate Multiplier Review (Request 2.0x)'
  );
  const [objectionRemarks, setObjectionRemarks] = useState(
    'Requesting re-assessment of circle rate multiplier and prompt disbursement of pending compensation.'
  );
  const [submittingObjection, setSubmittingObjection] = useState(false);
  const [objectionSuccessBanner, setObjectionSuccessBanner] = useState<string | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mapLayerRef = useRef<L.LayerGroup | null>(null);

  // Selected Parcel & related records - strictly Sukhdev Singh Bajwa (PAR-PB-004)
  const parcel = useMemo(
    () =>
      parcels.find((p) => p.id === 'PAR-PB-004') ||
      parcels.find((p) => p.landownerName.toLowerCase().includes('sukhdev')) ||
      parcels.find((p) => p.id === selectedParcelId) ||
      parcels[0],
    [parcels, selectedParcelId]
  );

  const owner = useMemo(
    () => landowners.find((o) => o.parcelId === parcel?.id) || landowners[0],
    [landowners, parcel]
  );

  const comp = useMemo(
    () =>
      compensations.find((c) => c.parcelId === parcel?.id) || compensations[0],
    [compensations, parcel]
  );

  const docItem = useMemo(
    () => documents.find((d) => d.parcelId === parcel?.id) || documents[0],
    [documents, parcel]
  );

  const rnr = useMemo(
    () =>
      rehabilitations.find((r) => r.parcelId === parcel?.id) ||
      rehabilitations[0],
    [rehabilitations, parcel]
  );

  const geom = useMemo(
    () => geometries.find((g) => g.parcelId === parcel?.id) || geometries[0],
    [geometries, parcel]
  );

  const project = useMemo(
    () => projects.find((p) => p.id === parcel?.projectId) || projects[0],
    [projects, parcel]
  );

  const geoFeature = useMemo(
    () =>
      liveGeoJson.features.find((f) => f.properties.parcel_id === parcel?.id) ||
      null,
    [liveGeoJson, parcel]
  );

  // Clean village and location names
  const cleanVillage = useMemo(() => {
    if (!parcel) return 'Mullanpur Garibdass';
    if (parcel.id === 'PAR-PB-004' || parcel.landownerName.toLowerCase().includes('sukhdev')) {
      return 'Mullanpur Garibdass';
    }
    if (
      parcel.id === 'PAR-PB-001' ||
      parcel.id === 'PAR-PB-002' ||
      parcel.id === 'PAR-PB-005' ||
      parcel.id === 'PAR-PB-007' ||
      parcel.village.includes('Muzaffarpur')
    ) {
      return 'Mauli Baidwan';
    }
    return parcel.village;
  }, [parcel]);

  const cleanTehsil = useMemo(() => {
    if (!parcel) return 'Kharar';
    if (parcel.id === 'PAR-PB-004' || parcel.landownerName.toLowerCase().includes('sukhdev') || cleanVillage.includes('Mullanpur')) {
      return 'Kharar';
    }
    if (
      parcel.id === 'PAR-PB-001' ||
      parcel.id === 'PAR-PB-002' ||
      parcel.id === 'PAR-PB-005' ||
      parcel.id === 'PAR-PB-007' ||
      cleanVillage.includes('Mauli Baidwan')
    ) {
      return 'Mohali';
    }
    return geoFeature?.properties.tehsil || 'Mohali';
  }, [parcel, cleanVillage, geoFeature]);

  const cleanDistrict = useMemo(() => {
    if (!parcel) return 'SAS Nagar (Mohali)';
    if (
      parcel.id === 'PAR-PB-001' ||
      parcel.id === 'PAR-PB-002' ||
      parcel.id === 'PAR-PB-005' ||
      parcel.id === 'PAR-PB-007'
    ) {
      return 'SAS Nagar (Mohali)';
    }
    return parcel.district;
  }, [parcel]);

  const acqStatus: AcquisitionStatusCode = useMemo(() => {
    if (geom?.acquisitionStatus) return geom.acquisitionStatus;
    if (parcel) {
      return stageToAcquisitionStatusCode(
        parcel.acquisitionStage,
        parcel.compensationStatus
      );
    }
    return 'not_initiated';
  }, [geom, parcel]);

  const currentStep = useMemo(
    () => getStageStep(acqStatus, parcel?.acquisitionStage || ''),
    [acqStatus, parcel]
  );

  // Leaflet Map Initialization
  useEffect(() => {
    if (activeTab !== 'map' && activeTab !== 'overview') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [parcel?.latitude || 30.6808, parcel?.longitude || 76.6055],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Landowner Parcel View',
          maxZoom: 20,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (mapLayerRef.current) {
      map.removeLayer(mapLayerRef.current);
    }

    const group = L.layerGroup();
    if (geoFeature && geoFeature.geometry.coordinates[0]?.length >= 4) {
      const latLngs: [number, number][] =
        geoFeature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const polyColor =
        acqStatus === 'disputed'
          ? '#EF4444'
          : acqStatus === 'acquired'
          ? '#047857'
          : acqStatus === 'approved'
          ? '#10B981'
          : '#0284C7';

      const poly = L.polygon(latLngs, {
        color: '#FACC15',
        weight: 3.5,
        fillColor: polyColor,
        fillOpacity: 0.6,
      }).addTo(group);

      poly.bindTooltip(
        `<div style="font-family:sans-serif;font-size:12px;padding:4px 6px;">
          <strong>Khasra ${parcel?.surveyNumber}</strong> (${parcel?.id})<br/>
          <span>${owner?.fullName} · ${parcel?.areaHectares} ha</span>
        </div>`,
        { permanent: true, direction: 'center' }
      );

      map.fitBounds(poly.getBounds(), { padding: [30, 30], maxZoom: 18 });
    } else if (parcel) {
      L.circleMarker([parcel.latitude, parcel.longitude], {
        radius: 10,
        color: '#FACC15',
        weight: 3,
        fillColor: '#10B981',
        fillOpacity: 0.8,
      }).addTo(group);
      map.setView([parcel.latitude, parcel.longitude], 16);
    }

    group.addTo(map);
    mapLayerRef.current = group;

    // Invalidate size in case container rendered while transitioning
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(t);
  }, [activeTab, geoFeature, parcel, owner, acqStatus]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (!parcel || !owner || !comp || !docItem || !rnr) {
    return null;
  }

  const areaAcres = (parcel.areaHectares * 2.471).toFixed(2);
  const areaKanalMarla = formatKanalMarlaExact(parcel.areaHectares);
  const khewatNo =
    KHEWAT_BY_PARCEL[parcel.id] ||
    String(35 + (Number(parcel.id.replace(/\D/g, '')) || 1) * 3);
  const netCoSharerEntitlementInr = Math.round(
    (comp.totalAwardAmountInr * (owner.sharePercentage || 100)) / 100
  );
  const disbursementPercent =
    comp.totalAwardAmountInr > 0
      ? Math.round((comp.paidAmountInr / comp.totalAwardAmountInr) * 100)
      : 0;

  // Simple Status Config
  const getStatusDisplay = () => {
    if (acqStatus === 'acquired') {
      return {
        title: lang === 'pa' ? 'ਗ੍ਰਹਿਣ ਮੁਕੰਮਲ · ਕਬਜ਼ਾ ਸੌਂਪਿਆ' : lang === 'hi' ? 'अधिग्रहण पूर्ण · कब्जा सौंपा' : 'Acquired & Handed Over',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
        actionAdvice: lang === 'pa' ? 'ਭੁਗਤਾਨ ਸਫਲਤਾਪੂਰਵਕ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਭੇਜਿਆ ਗਿਆ।' : lang === 'hi' ? 'भुगतान बैंक खाते में भेजा जा चुका है।' : 'Compensation credited to bank account.',
      };
    }
    if (acqStatus === 'approved') {
      return {
        title: lang === 'pa' ? 'ਮੁਆਵਜ਼ਾ ਅਵਾਰਡ ਮਨਜ਼ੂਰ' : lang === 'hi' ? 'मुआवजा अवार्ड स्वीकृत' : 'Award Declared (Payment in Progress)',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        dotClass: 'bg-teal-500',
        actionAdvice: lang === 'pa' ? 'PFMS ਰਾਹੀਂ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਸਿੱਧਾ ਭੁਗਤਾਨ ਜਾਰੀ ਹੈ।' : lang === 'hi' ? 'PFMS द्वारा बैंक खाते में सीधा भुगतान जारी है।' : 'PFMS Direct Benefit Transfer in progress.',
      };
    }
    if (acqStatus === 'disputed') {
      return {
        title: lang === 'pa' ? 'ਸੁਣਵਾਈ ਅਧੀਨ / ਇਤਰਾਜ਼ ਦਰਜ' : lang === 'hi' ? 'सुनवाई के अधीन / आपत्ति सक्रिय' : 'Hearing / Objection Active (Sec 15)',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        dotClass: 'bg-rose-500 animate-pulse',
        actionAdvice: lang === 'pa' ? 'ਤੁਹਾਡਾ ਇਤਰਾਜ਼ ਕੁਲੈਕਟਰ ਦਫ਼ਤਰ ਵਿੱਚ ਵਿਚਾਰ ਅਧੀਨ ਹੈ।' : lang === 'hi' ? 'आपकी आपत्ति कलेक्टर कार्यालय में विचाराधीन है।' : 'Objection under review by District Collector.',
      };
    }
    return {
      title: lang === 'pa' ? 'ਮੁੱਢਲਾ ਨੋਟਿਸ ਜਾਰੀ (ਧਾਰਾ 11)' : lang === 'hi' ? 'प्रारंभिक अधिसूचना जारी (धारा 11)' : 'Preliminary Notification Issued (Sec 11)',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      dotClass: 'bg-sky-500',
      actionAdvice: lang === 'pa' ? 'ਜ਼ਮੀਨ ਸਰਵੇਖਣ ਅਤੇ ਦਸਤਾਵੇਜ਼ ਤਸਦੀਕ ਪ੍ਰਕਿਰਿਆ ਜਾਰੀ ਹੈ।' : lang === 'hi' ? 'भूमि सर्वेक्षण और दस्तावेज सत्यापन जारी है।' : 'Survey and document verification in progress.',
    };
  };

  const statusInfo = getStatusDisplay();

  const handleDownloadReceipt = () => {
    const receiptText = [
      '========================================================================',
      'PUNJAB REVENUE ADMINISTRATION — LANDOWNER PASSBOOK & AWARD RECEIPT',
      'RFCTLARR ACT, 2013 · OFFICIAL RECORD',
      '========================================================================',
      `Date Generated      : ${new Date().toLocaleDateString('en-IN')}`,
      `Landowner Name      : ${owner.fullName}`,
      `Father / Spouse     : ${owner.fatherOrSpouseName}`,
      `Mobile Number       : ${owner.dummyContactNumber}`,
      `Ownership Share     : ${owner.ownershipType} (${owner.sharePercentage}%)`,
      `e-KYC Status        : ${owner.kycVerified ? 'VERIFIED' : 'PENDING'}`,
      '------------------------------------------------------------------------',
      `Parcel ID           : ${parcel.id}`,
      `Khasra / Survey No  : ${parcel.surveyNumber} (Khewat No. ${khewatNo})`,
      `Village & Tehsil    : ${cleanVillage}, Tehsil ${cleanTehsil}, ${cleanDistrict}`,
      `Land Type           : ${formatLandClassificationLabel(parcel.landType)}`,
      `Area Extent         : ${parcel.areaHectares} ha (${areaAcres} Acres / ${areaKanalMarla})`,
      `Infrastructure Proj : ${project?.title || parcel.projectTitle}`,
      '------------------------------------------------------------------------',
      'COMPENSATION SUMMARY:',
      `Base Land Value     : ${formatCurrencyInr(comp.baseMarketValueInr)}`,
      `Multiplier Factor   : ${comp.multiplierFactor}x`,
      `100% Solatium Bonus : ${formatCurrencyInr(comp.solatiumAmountInr)}`,
      `Total Award Value   : ${formatCurrencyInr(comp.totalAwardAmountInr)}`,
      `Your Net Share      : ${formatCurrencyInr(netCoSharerEntitlementInr)}`,
      `Credited to Bank    : ${formatCurrencyInr(comp.paidAmountInr)} (${disbursementPercent}%)`,
      `Balance Pending     : ${formatCurrencyInr(comp.pendingAmountInr)}`,
      `PFMS Reference Code : ${comp.pfmsReferenceCode}`,
      '========================================================================',
    ].join('\n');

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Award_Passbook_${parcel.id}_Khasra_${parcel.surveyNumber.replace(/\W+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerifyKyc = async () => {
    setKycLoading(true);
    try {
      await onVerifyLandownerKyc(parcel.id);
      setKycBanner(
        lang === 'pa'
          ? `ਆਧਾਰ ਅਤੇ ਬੈਂਕ ਖਾਤਾ ਸਫਲਤਾਪੂਰਵਕ ਤਸਦੀਕ ਹੋ ਗਿਆ (${owner.fullName})!`
          : lang === 'hi'
          ? `आधार और बैंक खाता सफलतापूर्वक सत्यापित हो गया (${owner.fullName})!`
          : `Aadhaar & Bank Account verified successfully for ${owner.fullName}!`
      );
    } finally {
      setKycLoading(false);
    }
  };

  const handleFileObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectionRemarks.trim()) return;
    setSubmittingObjection(true);
    try {
      await onSubmitLandownerObjection(
        parcel.id,
        objectionCategory,
        objectionRemarks.trim()
      );
      setObjectionSuccessBanner(
        lang === 'pa'
          ? `ਇਤਰਾਜ਼ ਦਰਜ ਹੋ ਗਿਆ! ਤੁਹਾਡਾ ਕੇਸ ਕੁਲੈਕਟਰ ਕੋਲ ਭੇਜਿਆ ਗਿਆ ਹੈ।`
          : lang === 'hi'
          ? `आपत्ति दर्ज हो गई! आपका मामला कलेक्टर के समक्ष भेजा गया है।`
          : `Grievance submitted successfully. Record updated to Section 15 Hearing.`
      );
    } finally {
      setSubmittingObjection(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. Simple, High-Trust Citizen Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0B192C] text-white flex items-center justify-center font-bold text-sm tracking-wider">
              BT
            </div>
            <div>
              <div className="text-sm font-bold text-slate-950 flex items-center gap-2">
                BhoomiTrack
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'pa'
                    ? '· ਨਾਗਰਿਕ ਖਾਤੇਦਾਰ ਪੋਰਟਲ'
                    : lang === 'hi'
                    ? '· नागरिक खातेदार पोर्टल'
                    : '· Landowner Portal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'pa'
                  ? 'ਜ਼ਮੀਨ ਗ੍ਰਹਿਣ ਅਤੇ ਮੁਆਵਜ਼ਾ ਪਾਰਦਰਸ਼ਤਾ ਪ੍ਰਣਾਲੀ'
                  : lang === 'hi'
                  ? 'भूमि अधिग्रहण एवं मुआवजा पारदर्शिता प्रणाली'
                  : 'Land Acquisition & Direct Compensation Transparency'}
              </p>
            </div>
          </div>

          {/* Controls: Language, Switch to Officer, Back to Gateway */}
          <div className="flex items-center gap-2.5">
            {/* Language Selector */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === 'en'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('pa')}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === 'pa'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ਪੰਜਾਬੀ
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === 'hi'
                    ? 'bg-white text-slate-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Exit to Gateway */}
            <button
              type="button"
              onClick={onBackToGateway}
              title="Sign Out / Back to Login"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>

        {/* Active Landowner Record Badge (Sukhdev Singh Bajwa) */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-4 sm:px-6 py-2.5">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px] font-medium">
                {lang === 'pa' ? 'ਦਰਜ ਖਾਤੇਦਾਰ:' : lang === 'hi' ? 'सक्रिय खातेदार:' : 'Active Record:'}
              </span>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-300 rounded-lg shadow-2xs font-semibold text-[#0B192C]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Sukhdev Singh Bajwa</span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  (Parcel PAR-PB-004 · Khasra 4 · Khewat 115)
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Landowner Record · Mullanpur Garibdass, Tehsil Kharar
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Alerts / Banners */}
        {kycBanner && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{kycBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setKycBanner(null)}
              className="text-emerald-800 hover:underline text-xs shrink-0 font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        {objectionSuccessBanner && (
          <div className="bg-amber-50 border border-amber-300 text-amber-950 p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-medium">{objectionSuccessBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setObjectionSuccessBanner(null)}
              className="text-amber-900 hover:underline text-xs shrink-0 font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. Hero Citizen Card: Owner Identity, Parcel Specs, and High-Level Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Owner Info & Land Location */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{cleanVillage}, Tehsil {cleanTehsil}</span>
                <span>·</span>
                <span>{cleanDistrict}</span>
                <span>·</span>
                <span className="font-mono text-slate-600">Khasra No. {parcel.surveyNumber}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {owner.fullName}
              </h1>
              <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>s/o or w/o {owner.fatherOrSpouseName}</span>
                <span>·</span>
                <span>{owner.ownershipType} ({owner.sharePercentage}% share)</span>
                <span>·</span>
                <span className="font-mono text-slate-700">Parcel ID: {parcel.id}</span>
              </p>
            </div>

            {/* Status Beacon & Action Tag */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.title}
              </div>
              <p className="text-[11px] text-slate-500 sm:text-right max-w-xs">
                {statusInfo.actionAdvice}
              </p>
            </div>
          </div>

          {/* 3 Prominent Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Metric 1: Total Compensation Award */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/90 p-4 space-y-1">
              <div className="text-xs text-slate-500 font-medium">
                {lang === 'pa' ? 'ਕੁੱਲ ਮੁਆਵਜ਼ਾ ਅਵਾਰਡ' : lang === 'hi' ? 'कुल मुआवजा अवार्ड' : 'Total Award Compensation'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-950 font-mono tracking-tight">
                {formatCurrencyInr(comp.totalAwardAmountInr)}
              </div>
              <div className="text-[11px] text-slate-600">
                {lang === 'pa' ? 'ਤੁਹਾਡਾ ਹਿੱਸਾ:' : lang === 'hi' ? 'आपका हिस्सा:' : 'Your share:'}{' '}
                <strong className="text-slate-900 font-mono">
                  {formatCurrencyInr(netCoSharerEntitlementInr)}
                </strong>{' '}
                ({owner.sharePercentage}%)
              </div>
            </div>

            {/* Metric 2: Amount Paid / Credited */}
            <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 space-y-1">
              <div className="text-xs text-emerald-800 font-medium flex items-center justify-between">
                <span>{lang === 'pa' ? 'ਖਾਤੇ ਵਿੱਚ ਭੇਜਿਆ ਗਿਆ' : lang === 'hi' ? 'खाते में क्रेडिट' : 'Credited to Bank (PFMS)'}</span>
                <span className="font-mono text-emerald-700 font-bold">{disbursementPercent}%</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-950 font-mono tracking-tight">
                {formatCurrencyInr(comp.paidAmountInr)}
              </div>
              <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, disbursementPercent)}%` }}
                />
              </div>
            </div>

            {/* Metric 3: Land Extent */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/90 p-4 space-y-1">
              <div className="text-xs text-slate-500 font-medium">
                {lang === 'pa' ? 'ਜ਼ਮੀਨ ਦਾ ਰਕਬਾ' : lang === 'hi' ? 'भूमि का क्षेत्रफल' : 'Land Extent'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-950 font-mono tracking-tight">
                {parcel.areaHectares.toFixed(2)} ha
              </div>
              <div className="text-[11px] text-slate-600">
                {areaAcres} Acres · {areaKanalMarla}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Intuitive Tab Bar */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#0B192C] text-[#0B192C] bg-slate-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {lang === 'pa' ? 'ਕਾਨੂੰਨੀ ਪੜਾਅ ਅਤੇ ਸਮਾਂ-ਸੀਮਾ' : lang === 'hi' ? 'प्रक्रिया एवं समयरेखा' : 'Timeline & Progress'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compensation')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'compensation'
                ? 'border-[#0B192C] text-[#0B192C] bg-slate-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {lang === 'pa' ? 'ਮੁਆਵਜ਼ਾ ਅਤੇ ਬੈਂਕ ਭੁਗਤਾਨ' : lang === 'hi' ? 'मुआवजा एवं बैंक भुगतान' : 'Compensation & Bank'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'map'
                ? 'border-[#0B192C] text-[#0B192C] bg-slate-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            {lang === 'pa' ? 'ਜ਼ਮੀਨ ਦਾ ਨਕਸ਼ਾ (GIS)' : lang === 'hi' ? 'भूखंड मानचित्र (GIS)' : 'Plot Boundary Map'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kyc_grievance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'kyc_grievance'
                ? 'border-[#0B192C] text-[#0B192C] bg-slate-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {lang === 'pa' ? 'e-KYC ਅਤੇ ਇਤਰਾਜ਼ ਦਰਜ ਕਰੋ' : lang === 'hi' ? 'e-KYC एवं आपत्ति दर्ज करें' : 'KYC & Objections'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'border-[#0B192C] text-[#0B192C] bg-slate-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {lang === 'pa' ? 'ਸਰਕਾਰੀ ਗਜ਼ਟ ਅਤੇ ਦਸਤਾਵੇਜ਼' : lang === 'hi' ? 'सरकारी राजपत्र एवं दस्तावेज' : 'Official Documents'}
          </button>
        </div>

        {/* 4. Tab Contents */}
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 p-6 shadow-sm">
          {/* TAB 1: TIMELINE & STATUTORY PROGRESS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  {lang === 'pa'
                    ? '5-ਪੜਾਅ ਕਾਨੂੰਨੀ ਗ੍ਰਹਿਣ ਯਾਤਰਾ (RFCTLARR Act 2013)'
                    : lang === 'hi'
                    ? '5-चरणीय वैधानिक अधिग्रहण प्रक्रिया (RFCTLARR Act 2013)'
                    : '5-Stage Statutory Acquisition Progress'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Project: <strong className="text-slate-800">{project?.title || parcel.projectTitle}</strong> · Agency:{' '}
                  <strong className="text-slate-800">{project?.agency || 'NHAI / Revenue Dept'}</strong>
                </p>
              </div>

              {/* Clean Horizontal Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {STATUTORY_STAGES.map((st) => {
                  const isCompleted = st.step < currentStep;
                  const isCurrent = st.step === currentStep;
                  const isDisputed = isCurrent && acqStatus === 'disputed';

                  return (
                    <div
                      key={st.step}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                        isDisputed
                          ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-200'
                          : isCurrent
                          ? 'bg-teal-50/50 border-teal-400 ring-2 ring-teal-200'
                          : isCompleted
                          ? 'bg-slate-50 border-emerald-300'
                          : 'bg-slate-50/40 border-slate-200 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                              isDisputed
                                ? 'bg-rose-600 text-white'
                                : isCurrent
                                ? 'bg-[#0B192C] text-white'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            Step {st.step} · {st.code}
                          </span>
                          {isCompleted && (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {isDisputed && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-900">
                          {st.name[lang] || st.name.en}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {st.desc[lang] || st.desc.en}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/80 text-[10px] font-semibold uppercase tracking-wider">
                        {isDisputed ? (
                          <span className="text-rose-700">Hearing Active</span>
                        ) : isCurrent ? (
                          <span className="text-teal-800">Current Step</span>
                        ) : isCompleted ? (
                          <span className="text-emerald-700">Completed ✓</span>
                        ) : (
                          <span className="text-slate-400">Upcoming</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Helpful Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900">
                    Cadastral Land Summary
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Khasra Number:</span>
                      <div className="font-mono font-semibold text-slate-900">
                        {parcel.surveyNumber}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Khewat Number:</span>
                      <div className="font-mono font-semibold text-slate-900">
                        {khewatNo}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Land Classification:</span>
                      <div className="font-medium text-slate-900">
                        {formatLandClassificationLabel(parcel.landType)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">ULPIN Code:</span>
                      <div className="font-mono text-slate-900">
                        {geom?.demoUlpin || 'PB-SAS-KHR-039-0001'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Need Help or Have an Objection?
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      If you believe your land area, circle rate multiplier, or tube-well/structure
                      compensation was calculated incorrectly, you can submit a formal Section 15 petition.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('kyc_grievance')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    Go to Grievance &amp; Objection Form →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPENSATION & BANK DETAILS */}
          {activeTab === 'compensation' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {lang === 'pa'
                      ? 'ਮੁਆਵਜ਼ਾ ਗਣਨਾ ਅਤੇ ਬੈਂਕ ਭੁਗਤਾਨ ਵੇਰਵਾ'
                      : lang === 'hi'
                      ? 'मुआवजा गणना एवं बैंक भुगतान विवरण'
                      : 'Compensation Calculation & Payment Details'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Calculated under First Schedule of RFCTLARR Act, 2013 with 100% Solatium
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  Download Award Receipt
                </button>
              </div>

              {/* Simplified Step-by-Step Mathematical Calculation */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Compensation Component</th>
                      <th className="px-4 py-2.5 text-left">Legal Statutory Reference</th>
                      <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="px-4 py-3 font-medium">1. Base Land Value</td>
                      <td className="px-4 py-3 text-slate-500">Collector Circle Rate (Section 26)</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatCurrencyInr(comp.baseMarketValueInr)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">2. Rural / Urban Multiplier</td>
                      <td className="px-4 py-3 text-slate-500">First Schedule Distance Factor ({comp.multiplierFactor}x)</td>
                      <td className="px-4 py-3 text-right font-mono text-teal-700 font-semibold">
                        {comp.multiplierFactor.toFixed(1)}x
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">3. 100% Solatium Bonus</td>
                      <td className="px-4 py-3 text-slate-500">Mandatory Solatium under Section 30(1)</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatCurrencyInr(comp.solatiumAmountInr)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-950">
                      <td className="px-4 py-3.5">Total Assessed Award</td>
                      <td className="px-4 py-3.5 text-slate-600 font-normal">Total value of entire parcel</td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm">
                        {formatCurrencyInr(comp.totalAwardAmountInr)}
                      </td>
                    </tr>
                    <tr className="bg-teal-50/40 text-teal-950 font-bold">
                      <td className="px-4 py-3.5">Your Share Entitlement</td>
                      <td className="px-4 py-3.5 text-teal-800 font-normal">{owner.ownershipType} ({owner.sharePercentage}% recorded share)</td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm text-teal-900">
                        {formatCurrencyInr(netCoSharerEntitlementInr)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span>Disbursed to Bank Account</span>
                    <span className="font-mono">{disbursementPercent}%</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-950">
                    {formatCurrencyInr(comp.paidAmountInr)}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    PFMS Reference: <span className="font-mono font-semibold">{comp.pfmsReferenceCode}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                    <span>Balance in LARR Escrow</span>
                    <span className="font-mono text-slate-500">
                      {comp.pendingAmountInr === 0 ? 'Nil' : `${100 - disbursementPercent}%`}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {formatCurrencyInr(comp.pendingAmountInr)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {comp.pendingAmountInr > 0
                      ? 'Held pending Section 15 disposal or Aadhaar e-KYC validation.'
                      : 'Entire compensation has been disbursed.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLOT BOUNDARY MAP */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {lang === 'pa' ? 'ਜ਼ਮੀਨ ਦੀ ਹੱਦਬੰਦੀ ਨਕਸ਼ਾ (GIS Map)' : lang === 'hi' ? 'भूखंड सीमा मानचित्र (GIS Map)' : 'Plot Boundary Map (Cadastral GIS)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Satellite view verified against Punjab BhuNaksha digital revenue cadastre
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  Khasra {parcel.surveyNumber} · {parcel.areaHectares} ha ({areaKanalMarla})
                </div>
              </div>

              {/* Map Viewport */}
              <div className="relative rounded-xl overflow-hidden border border-slate-300 h-[420px] bg-slate-900">
                <div ref={mapContainerRef} className="w-full h-full z-0" />
                <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-2 rounded-lg shadow-sm border border-slate-200 text-xs font-medium space-y-0.5">
                  <div className="font-bold text-slate-950">
                    Khasra {parcel.surveyNumber} ({cleanVillage})
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Khatedar: {owner.fullName}
                  </div>
                  <div className="text-[11px] font-mono text-teal-800 font-semibold">
                    Extent: {parcel.areaHectares} ha ({areaAcres} Acres)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KYC & OBJECTIONS / GRIEVANCES */}
          {activeTab === 'kyc_grievance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Bank & Aadhaar KYC */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <h4 className="text-sm font-bold text-slate-950">
                      Bank &amp; Aadhaar e-KYC Status
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Direct compensation requires verified bank account linking under PFMS DBT.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">e-KYC Verification:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        owner.kycVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {owner.kycVerified ? 'Verified ✓' : 'Pending Verification'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Registered Khatedar:</span>
                    <span className="font-semibold text-slate-900">{owner.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mobile Number:</span>
                    <span className="font-mono text-slate-900">{owner.dummyContactNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">PFMS Status:</span>
                    <span className="font-mono text-slate-900">{comp.paymentStatus}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={kycLoading || owner.kycVerified}
                  onClick={handleVerifyKyc}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                    owner.kycVerified
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-[#0B192C] hover:bg-slate-800 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  {owner.kycVerified
                    ? 'Bank e-KYC Already Verified'
                    : kycLoading
                    ? 'Verifying with UIDAI/PFMS...'
                    : '1-Click Verify Aadhaar & Bank KYC'}
                </button>
              </div>

              {/* Right Column: File an Objection or Inquiry */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h4 className="text-sm font-bold text-slate-950">
                      Submit Section 15 Objection / Claim
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Direct submission to the District Land Acquisition Collector (SDM / CALA).
                  </p>
                </div>

                <form onSubmit={handleFileObjection} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Reason for Claim / Objection
                    </label>
                    <select
                      value={objectionCategory}
                      onChange={(e) => setObjectionCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      <option value="Market Rate Multiplier Review (Request 2.0x)">
                        Request 2.0x Urban Multiplier Rate
                      </option>
                      <option value="Release of Held Compensation in Escrow">
                        Request Release of Held Escrow Payment
                      </option>
                      <option value="Omission of Tube-well, Trees or Building Valuation">
                        Omission of Tube-well, Trees or Structure
                      </option>
                      <option value="Joint-Khewat Partition & Bank Account Update">
                        Joint-Khewat Partition &amp; Bank Account Update
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Details / Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={objectionRemarks}
                      onChange={(e) => setObjectionRemarks(e.target.value)}
                      placeholder="Explain your objection or claim..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingObjection}
                    className="w-full py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingObjection ? 'Submitting...' : 'Submit to Collector'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: OFFICIAL NOTICES & DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  {lang === 'pa'
                    ? 'ਸਰਕਾਰੀ ਗਜ਼ਟ ਨੋਟੀਫਿਕੇਸ਼ਨ ਅਤੇ ਮਾਲ ਦਸਤਾਵੇਜ਼'
                    : lang === 'hi'
                    ? 'सरकारी राजपत्र अधिसूचना एवं राजस्व दस्तावेज'
                    : 'Official Gazette Notifications & Revenue Documents'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified by District Revenue Officer · Connected to Punjab Land Records
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">Section 11 Preliminary Gazette</div>
                  <div className="font-mono font-bold text-sm text-slate-900">
                    {docItem.section11GazetteRef}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Preliminary survey notification published in Punjab Extraordinary Gazette.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">Section 19 Final Declaration</div>
                  <div className="font-mono font-bold text-sm text-slate-900">
                    {docItem.section19DeclarationRef}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Declaration of acquisition and R&amp;R entitlement scheme.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">Jamabandi Verification</div>
                  <div className="font-semibold text-sm text-emerald-800">
                    {docItem.jamabandiStatus}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Verified by: {docItem.verifiedByOfficer}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Gazette Notice Extract (Khasra {parcel.surveyNumber})
                  </span>
                  <button
                    type="button"
                    onClick={() => setGazettePreviewOpen((prev) => !prev)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                  >
                    {gazettePreviewOpen ? 'Hide Notice Extract' : 'Show Notice Extract'}
                  </button>
                </div>

                {gazettePreviewOpen && (
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs leading-relaxed space-y-2">
                    <div className="text-amber-300 font-bold">
                      PUNJAB GOVERNMENT GAZETTE (EXTRAORDINARY) — NOTIFICATION REF: {docItem.section11GazetteRef}
                    </div>
                    <p>
                      It is hereby notified that land measuring <strong>{parcel.areaHectares} Hectares ({areaKanalMarla})</strong> bearing <strong>Khasra No. {parcel.surveyNumber}</strong> (Khewat {khewatNo}) situated in Revenue Village <strong>{cleanVillage}</strong>, Tehsil <strong>{cleanTehsil}</strong>, District <strong>{cleanDistrict}</strong> owned by <strong>{owner.fullName}</strong> is acquired for public infrastructure purpose: <strong>{project?.title || parcel.projectTitle}</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Simplified Citizen Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 px-6 text-center text-xs text-slate-500">
        Department of Revenue &amp; Land Administration · District SAS Nagar (Mohali) · Helpline: 0172-2219500
      </footer>
    </div>
  );
};


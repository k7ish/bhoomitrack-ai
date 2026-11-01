import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  GitCommit,
  History,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  ACQUISITION_STATUS_CODES,
  stageToAcquisitionStatusCode,
  type AcquisitionStatusCode,
  type CompensationRecord,
  type DocumentRecord,
  type LandownerRecord,
  type LandParcel,
  type ParcelGeometryRecord,
} from '../types/bhoomi';

export interface ParcelStatusTransitionEvent {
  id: string;
  parcelId: string;
  fromStatus: AcquisitionStatusCode | 'registered';
  toStatus: AcquisitionStatusCode;
  timestamp: string;
  statutorySection: string;
  referenceCode: string;
  officerOrActor: string;
  remarks: string;
  isLiveUpdate?: boolean;
}

export interface TimelineStageMeta {
  code: AcquisitionStatusCode;
  stepNumber: number;
  label: string;
  shortLabel: string;
  statutoryRef: string;
  description: string;
}

export const PARCEL_TIMELINE_STAGES: TimelineStageMeta[] = [
  {
    code: 'not_initiated',
    stepNumber: 1,
    label: 'Not Initiated',
    shortLabel: 'Not Initiated',
    statutoryRef: 'Sec 4 SIA & Cadastral Survey',
    description:
      'Parcel mapped in BhuNaksha Musavi; preliminary Social Impact Assessment (SIA) & survey initiated.',
  },
  {
    code: 'notification_issued',
    stepNumber: 2,
    label: 'Notification Issued',
    shortLabel: 'Notification',
    statutoryRef: 'Sec 11 Preliminary Gazette',
    description:
      'Official Section 11 Preliminary Notification published in State Gazette; land title freeze active.',
  },
  {
    code: 'documentation_pending',
    stepNumber: 3,
    label: 'Documentation Pending',
    shortLabel: 'Docs Pending',
    statutoryRef: 'Sec 15 / Jamabandi & e-KYC',
    description:
      'Jamabandi Khewat ownership verification, encumbrance check, and landowner Aadhaar e-KYC underway.',
  },
  {
    code: 'disputed',
    stepNumber: 3.5,
    label: 'Disputed / Hearing',
    shortLabel: 'Disputed',
    statutoryRef: 'Sec 15 / Sec 64 Objection',
    description:
      'Active collector hearing for multiplier revision, joint-khewat partition, or title encumbrance.',
  },
  {
    code: 'approved',
    stepNumber: 4,
    label: 'Approved',
    shortLabel: 'Approved',
    statutoryRef: 'Sec 19 Declaration & Sec 23 Award',
    description:
      'Final Section 19 Declaration signed; Section 23/30 compensation award (100% Solatium) sanctioned.',
  },
  {
    code: 'acquired',
    stepNumber: 5,
    label: 'Acquired',
    shortLabel: 'Acquired',
    statutoryRef: 'PFMS DBT & Sec 38 Possession',
    description:
      'Compensation disbursed via PFMS Direct Benefit Transfer; Section 38 possession & mutation completed.',
  },
];

export function formatAcquisitionStatusBadgeLabel(
  code: AcquisitionStatusCode | 'registered'
): string {
  switch (code) {
    case 'registered':
      return 'Cadastral Registry';
    case 'not_initiated':
      return 'Not Initiated';
    case 'notification_issued':
      return 'Notification Issued';
    case 'documentation_pending':
      return 'Documentation Pending';
    case 'disputed':
      return 'Disputed';
    case 'approved':
      return 'Approved';
    case 'acquired':
      return 'Acquired';
    default:
      return code;
  }
}

export function getStatusBadgeStyle(
  code: AcquisitionStatusCode | 'registered'
): string {
  switch (code) {
    case 'acquired':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    case 'approved':
      return 'bg-teal-50 text-teal-800 border-teal-300';
    case 'disputed':
      return 'bg-rose-50 text-rose-800 border-rose-300';
    case 'documentation_pending':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'notification_issued':
      return 'bg-sky-50 text-sky-800 border-sky-300';
    case 'not_initiated':
    case 'registered':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function getSequentialRank(code: AcquisitionStatusCode): number {
  switch (code) {
    case 'not_initiated':
      return 1;
    case 'notification_issued':
      return 2;
    case 'documentation_pending':
      return 3;
    case 'disputed':
      return 3;
    case 'approved':
      return 4;
    case 'acquired':
      return 5;
  }
}

export function buildBaselineParcelTransitions(
  parcel: LandParcel,
  currentStatus: AcquisitionStatusCode,
  owner?: LandownerRecord,
  comp?: CompensationRecord,
  docRecord?: DocumentRecord,
  geom?: ParcelGeometryRecord
): ParcelStatusTransitionEvent[] {
  const num = Number(parcel.id.replace(/\D/g, '')) || 1;
  const dayPad = (d: number) => String(((d + num) % 27) + 1).padStart(2, '0');
  const ulpin =
    geom?.demoUlpin || `PB-SAS-KHR-039-${String(num).padStart(4, '0')}`;
  const sec11Ref =
    docRecord?.section11GazetteRef || `PB-GAZ-11/2025/${100 + num}`;
  const sec19Ref =
    docRecord?.section19DeclarationRef || `PB-GAZ-19/2025/${300 + num}`;
  const pfmsRef =
    comp?.pfmsReferenceCode || `PFMS-DBT-PB-${2025000 + num}`;
  const officer = docRecord?.verifiedByOfficer || 'DRO / CALA SAS Nagar';

  const events: ParcelStatusTransitionEvent[] = [
    {
      id: `${parcel.id}-step-1`,
      parcelId: parcel.id,
      fromStatus: 'registered',
      toStatus: 'not_initiated',
      timestamp: `2025-01-${dayPad(3)} 09:30 IST`,
      statutorySection: 'Sec 4 SIA & BhuNaksha Cadastral Mapping',
      referenceCode: ulpin,
      officerOrActor: 'Patwari / Kanungo Revenue Circle',
      remarks: `Khasra ${parcel.surveyNumber} (${parcel.areaHectares.toFixed(
        2
      )} ha in ${parcel.village}) indexed in digital Musavi for ${
        parcel.projectTitle
      }.`,
    },
  ];

  const rank = getSequentialRank(currentStatus);

  if (rank >= 2) {
    events.push({
      id: `${parcel.id}-step-2`,
      parcelId: parcel.id,
      fromStatus: 'not_initiated',
      toStatus: 'notification_issued',
      timestamp: `2025-01-${dayPad(14)} 11:15 IST`,
      statutorySection: 'Section 11(1) Preliminary Notification',
      referenceCode: sec11Ref,
      officerOrActor: officer,
      remarks: `Preliminary Gazette Notification issued for Khasra ${
        parcel.surveyNumber
      }; notice served to Khatedar ${
        owner?.fullName || parcel.landownerName
      }.`,
    });
  }

  if (rank >= 3) {
    events.push({
      id: `${parcel.id}-step-3`,
      parcelId: parcel.id,
      fromStatus: 'notification_issued',
      toStatus: 'documentation_pending',
      timestamp: `2025-02-${dayPad(5)} 14:20 IST`,
      statutorySection: 'Jamabandi Title & Khatedar e-KYC Verification',
      referenceCode: docRecord?.documentId || `DOC-PB-${String(num).padStart(3, '0')}`,
      officerOrActor: officer,
      remarks: `Jamabandi status: ${
        docRecord?.jamabandiStatus || 'Matched with Online Jamabandi'
      } · Ownership: ${owner?.ownershipType || 'Sole Khewat'} (${
        owner?.sharePercentage ?? 100
      }% share).`,
    });
  }

  if (currentStatus === 'disputed') {
    events.push({
      id: `${parcel.id}-step-disputed`,
      parcelId: parcel.id,
      fromStatus: 'documentation_pending',
      toStatus: 'disputed',
      timestamp: `2025-02-${dayPad(18)} 16:05 IST`,
      statutorySection: 'Section 15 Collector Hearing / Section 64 Reference',
      referenceCode: docRecord?.documentId || `OBJ-PB-${100 + num}`,
      officerOrActor: `${owner?.fullName || parcel.landownerName} / CALA Hearing Bench`,
      remarks:
        docRecord?.encumbranceStatus &&
        docRecord.encumbranceStatus !== 'Clean - No Encumbrance'
          ? `Active Bottleneck: ${docRecord.encumbranceStatus}`
          : 'Objection logged regarding rural-to-urban multiplier revision / joint-khewat family partition holdback.',
    });
  }

  if (rank >= 4) {
    events.push({
      id: `${parcel.id}-step-4`,
      parcelId: parcel.id,
      fromStatus: 'documentation_pending',
      toStatus: 'approved',
      timestamp: `${comp?.awardDate || `2025-02-${dayPad(21)}`} 15:45 IST`,
      statutorySection: 'Section 19 Declaration & Section 23/30 Award',
      referenceCode: sec19Ref,
      officerOrActor: officer,
      remarks: `Final Declaration published & Award sanctioned for ₹${(
        comp?.totalAwardAmountInr ?? parcel.compensationAmountInr
      ).toLocaleString('en-IN')} (incl. 100% Solatium at ${
        comp?.multiplierFactor ?? 1.5
      }x multiplier).`,
    });
  }

  if (rank >= 5) {
    events.push({
      id: `${parcel.id}-step-5`,
      parcelId: parcel.id,
      fromStatus: 'approved',
      toStatus: 'acquired',
      timestamp: `2025-03-${dayPad(9)} 17:10 IST`,
      statutorySection: 'PFMS DBT Settlement & Section 38 Possession Handover',
      referenceCode: pfmsRef,
      officerOrActor: `${officer} / Executing Agency`,
      remarks: `₹${(
        comp?.paidAmountInr ?? parcel.compensationAmountInr
      ).toLocaleString(
        'en-IN'
      )} disbursed via PFMS Direct Benefit Transfer (${pfmsRef}); physical possession & mutation completed.`,
    });
  }

  return events;
}

export interface ParcelInlineMiniTimelineProps {
  statusCode: AcquisitionStatusCode;
  onClickInspect?: () => void;
}

export const ParcelInlineMiniTimeline: React.FC<
  ParcelInlineMiniTimelineProps
> = ({ statusCode, onClickInspect }) => {
  const rank = getSequentialRank(statusCode);
  const isDisputed = statusCode === 'disputed';

  const coreSteps: { label: string; stepRank: number }[] = [
    { label: 'Not Init.', stepRank: 1 },
    { label: 'Notified', stepRank: 2 },
    { label: isDisputed ? 'Disputed' : 'Docs', stepRank: 3 },
    { label: 'Approved', stepRank: 4 },
    { label: 'Acquired', stepRank: 5 },
  ];

  return (
    <div className="flex flex-col gap-1 min-w-[210px]">
      <div className="flex items-center gap-1">
        {coreSteps.map((s, idx) => {
          const isCompleted = rank > s.stepRank;
          const isCurrent = rank === s.stepRank;
          const dotClass =
            isCurrent && isDisputed
              ? 'bg-rose-600 ring-2 ring-rose-200'
              : isCurrent
              ? 'bg-[#0B192C] ring-2 ring-slate-300'
              : isCompleted
              ? 'bg-teal-600'
              : 'bg-slate-200';
          const barClass = isCompleted ? 'bg-teal-600' : 'bg-slate-200';

          return (
            <React.Fragment key={s.label}>
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${dotClass}`}
                title={`${s.label}`}
              />
              {idx < coreSteps.length - 1 && (
                <div className={`h-0.5 flex-1 rounded ${barClass}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span
          className={`font-semibold ${
            isDisputed
              ? 'text-rose-700'
              : statusCode === 'acquired'
              ? 'text-emerald-700'
              : 'text-slate-600'
          }`}
        >
          Step {rank}/5 · {formatAcquisitionStatusBadgeLabel(statusCode)}
        </span>
        {onClickInspect && (
          <button
            type="button"
            onClick={onClickInspect}
            className="text-[#0B192C] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            <History className="w-3 h-3" />
            <span>History</span>
          </button>
        )}
      </div>
    </div>
  );
};

export interface ParcelStatusTimelineProps {
  parcels: LandParcel[];
  selectedParcelId: string;
  onSelectParcelId: (parcelId: string) => void;
  landownerByParcelId: Map<string, LandownerRecord>;
  compByParcelId: Map<string, CompensationRecord>;
  docByParcelId: Map<string, DocumentRecord>;
  geomByParcelId: Map<string, ParcelGeometryRecord>;
  liveTransitionsByParcelId: Record<string, ParcelStatusTransitionEvent[]>;
  onTriggerStatusTransition: (
    parcel: LandParcel,
    newStatus: AcquisitionStatusCode
  ) => void;
}

export const ParcelStatusTimeline: React.FC<ParcelStatusTimelineProps> = ({
  parcels,
  selectedParcelId,
  onSelectParcelId,
  landownerByParcelId,
  compByParcelId,
  docByParcelId,
  geomByParcelId,
  liveTransitionsByParcelId,
  onTriggerStatusTransition,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedParcel = useMemo(
    () =>
      parcels.find((p) => p.id === selectedParcelId) ||
      parcels[0] ||
      null,
    [parcels, selectedParcelId]
  );

  const currentStatus: AcquisitionStatusCode = useMemo(() => {
    if (!selectedParcel) return 'not_initiated';
    const geom = geomByParcelId.get(selectedParcel.id);
    return (
      geom?.acquisitionStatus ||
      stageToAcquisitionStatusCode(
        selectedParcel.acquisitionStage,
        selectedParcel.compensationStatus
      )
    );
  }, [selectedParcel, geomByParcelId]);

  const owner = selectedParcel
    ? landownerByParcelId.get(selectedParcel.id)
    : undefined;
  const comp = selectedParcel
    ? compByParcelId.get(selectedParcel.id)
    : undefined;
  const docRecord = selectedParcel
    ? docByParcelId.get(selectedParcel.id)
    : undefined;
  const geom = selectedParcel
    ? geomByParcelId.get(selectedParcel.id)
    : undefined;

  const transitionHistory = useMemo(() => {
    if (!selectedParcel) return [];
    const baseline = buildBaselineParcelTransitions(
      selectedParcel,
      currentStatus,
      owner,
      comp,
      docRecord,
      geom
    );
    const liveExtras = liveTransitionsByParcelId[selectedParcel.id] || [];
    return [...baseline, ...liveExtras];
  }, [
    selectedParcel,
    currentStatus,
    owner,
    comp,
    docRecord,
    geom,
    liveTransitionsByParcelId,
  ]);

  if (!selectedParcel) return null;

  const currentRank = getSequentialRank(currentStatus);
  const isDisputed = currentStatus === 'disputed';

  // Quick showcase parcels representing distinct status paths
  const showcaseParcels = parcels.slice(0, 6);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="bg-[#0B192C] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">
                Parcel Status Transition Timeline &amp; Statutory Audit Trail
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-white/10 text-slate-200 border border-white/15">
                RFCTLARR Act 2013
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              End-to-end history of status transitions (Not Initiated →
              Notification Issued → Documentation Pending → Approved → Acquired)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Parcel Selector Dropdown */}
          <select
            value={selectedParcel.id}
            onChange={(e) => onSelectParcelId(e.target.value)}
            aria-label="Select parcel to inspect status transition timeline"
            className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-white"
          >
            {parcels.map((p) => {
              const g = geomByParcelId.get(p.id);
              const st =
                g?.acquisitionStatus ||
                stageToAcquisitionStatusCode(
                  p.acquisitionStage,
                  p.compensationStatus
                );
              return (
                <option key={p.id} value={p.id}>
                  {p.id} · Khasra {p.surveyNumber} ({st})
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title={isCollapsed ? 'Expand Timeline' : 'Collapse Timeline'}
            aria-label={isCollapsed ? 'Expand Timeline' : 'Collapse Timeline'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-5 space-y-5">
          {/* Quick Parcel Switcher Bar + Selected Parcel Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                Quick Inspect:
              </span>
              {showcaseParcels.map((p) => {
                const g = geomByParcelId.get(p.id);
                const st =
                  g?.acquisitionStatus ||
                  stageToAcquisitionStatusCode(
                    p.acquisitionStage,
                    p.compensationStatus
                  );
                const isSelected = p.id === selectedParcel.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectParcelId(p.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B192C] text-white border-[#0B192C]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.id} ({p.surveyNumber}) · {st}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">
                Khatedar:{' '}
                <strong className="text-slate-900">
                  {owner?.fullName || selectedParcel.landownerName}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                Current Status:{' '}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getStatusBadgeStyle(
                    currentStatus
                  )}`}
                >
                  {formatAcquisitionStatusBadgeLabel(currentStatus)}
                </span>
              </span>
            </div>
          </div>

          {/* 1. VISUAL HORIZONTAL STATUS TRANSITION PIPELINE */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Visual Status Progression Pipeline (Click any stage to transition status)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {transitionHistory.length} Recorded Transitions
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {PARCEL_TIMELINE_STAGES.map((stage) => {
                const isStageDisputed = stage.code === 'disputed';
                const isCurrent = currentStatus === stage.code;
                const isCompleted =
                  !isStageDisputed &&
                  currentRank > getSequentialRank(stage.code);
                const isSkippedDispute =
                  isStageDisputed && currentStatus !== 'disputed';

                let cardStyle =
                  'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300';
                let badgeStyle = 'bg-slate-200 text-slate-700';

                if (isCurrent && isStageDisputed) {
                  cardStyle =
                    'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-rose-950';
                  badgeStyle = 'bg-rose-600 text-white';
                } else if (isCurrent) {
                  cardStyle =
                    'bg-slate-900/5 border-[#0B192C] ring-2 ring-[#0B192C]/15 text-slate-900';
                  badgeStyle = 'bg-[#0B192C] text-white';
                } else if (isCompleted) {
                  cardStyle =
                    'bg-emerald-50/60 border-emerald-300 text-emerald-950';
                  badgeStyle = 'bg-emerald-600 text-white';
                } else if (isSkippedDispute) {
                  cardStyle =
                    'bg-slate-50/60 border-dashed border-slate-200 text-slate-400';
                  badgeStyle = 'bg-slate-100 text-slate-500';
                }

                return (
                  <button
                    key={stage.code}
                    type="button"
                    onClick={() => {
                      if (stage.code !== currentStatus) {
                        onTriggerStatusTransition(selectedParcel, stage.code);
                      }
                    }}
                    className={`text-left p-3 rounded-xl border transition flex flex-col justify-between cursor-pointer ${cardStyle}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${badgeStyle}`}
                        >
                          {stage.code}
                        </span>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {isCurrent && isStageDisputed && (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        {isCurrent && !isStageDisputed && (
                          <Clock className="w-4 h-4 text-[#0B192C] shrink-0" />
                        )}
                      </div>

                      <div className="text-xs font-bold text-slate-900">
                        {stage.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {stage.statutoryRef}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">
                        {stage.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-semibold uppercase">
                      {isCurrent ? (
                        <span
                          className={
                            isStageDisputed
                              ? 'text-rose-700 font-bold'
                              : 'text-[#0B192C] font-bold'
                          }
                        >
                          ● Active Status
                        </span>
                      ) : isCompleted ? (
                        <span className="text-emerald-700">✓ Completed</span>
                      ) : isSkippedDispute ? (
                        <span className="text-slate-400">No Dispute</span>
                      ) : (
                        <span className="text-slate-400">
                          Click to Transition →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CHRONOLOGICAL STATUS TRANSITION AUDIT TRAIL */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#0B192C]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Chronological Status Transition History (
                  {selectedParcel.id} · Khasra {selectedParcel.surveyNumber})
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">
                  Record New Transition:
                </span>
                <select
                  value={currentStatus}
                  onChange={(e) =>
                    onTriggerStatusTransition(
                      selectedParcel,
                      e.target.value as AcquisitionStatusCode
                    )
                  }
                  aria-label="Transition parcel to new status"
                  className="px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-[#0B192C]"
                >
                  {ACQUISITION_STATUS_CODES.map((code) => (
                    <option key={code} value={code}>
                      Transition to: {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300">
              {transitionHistory.map((ev, index) => {
                const isLatest = index === transitionHistory.length - 1;
                return (
                  <div
                    key={ev.id}
                    className={`relative bg-white rounded-lg border p-3 transition ${
                      ev.isLiveUpdate
                        ? 'border-[#0B192C] ring-1 ring-[#0B192C]/20'
                        : isLatest
                        ? 'border-slate-300 shadow-2xs'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Timeline Node Dot */}
                    <span
                      className={`absolute -left-[19px] top-4 w-3 h-3 rounded-full border-2 border-white ${
                        ev.toStatus === 'disputed'
                          ? 'bg-rose-600'
                          : ev.toStatus === 'acquired'
                          ? 'bg-emerald-600'
                          : isLatest
                          ? 'bg-[#0B192C]'
                          : 'bg-teal-600'
                      }`}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Status Transition Badges (From -> To) */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          #{index + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getStatusBadgeStyle(
                            ev.fromStatus
                          )}`}
                        >
                          {formatAcquisitionStatusBadgeLabel(ev.fromStatus)}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getStatusBadgeStyle(
                            ev.toStatus
                          )}`}
                        >
                          {formatAcquisitionStatusBadgeLabel(ev.toStatus)}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 ml-1">
                          · {ev.statutorySection}
                        </span>
                        {ev.isLiveUpdate && (
                          <span className="px-2 py-0.5 rounded bg-[#0B192C] text-white text-[10px] font-mono uppercase">
                            Live Session Transition
                          </span>
                        )}
                      </div>

                      {/* Timestamp & Reference Code */}
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {ev.referenceCode}
                        </span>
                        <span>{ev.timestamp}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {ev.remarks}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-teal-700" />
                        Authorized by: <strong>{ev.officerOrActor}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        Immutable Audit Log
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ParcelStatusTimeline;

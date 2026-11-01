import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  COMPENSATION_STATUSES,
  LAND_TYPES,
  PARCEL_STAGES,
  PROJECT_STAGES,
  PROJECT_STATUSES,
  REHAB_STATUSES,
  type CompensationStatus,
  type LandType,
  type ParcelAcquisitionStage,
  type Project,
  type ProjectStage,
  type ProjectStatus,
  type RehabStatus,
} from '../types/bhoomi';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
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
  }) => Promise<void>;
}

export function CreateProjectModal({ isOpen, onClose, onSubmit }: CreateProjectModalProps) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState('Punjab');
  const [district, setDistrict] = useState('SAS Nagar (Mohali)');
  const [agency, setAgency] = useState('NHAI PIU Chandigarh');
  const [totalAreaHectares, setTotalAreaHectares] = useState('42.50');
  const [acquiredAreaHectares, setAcquiredAreaHectares] = useState('18.20');
  const [budgetInrCrores, setBudgetInrCrores] = useState('95.00');
  const [disbursedInrCrores, setDisbursedInrCrores] = useState('42.00');
  const [stage, setStage] = useState<ProjectStage>('Section 11 Notification');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        code,
        state,
        district,
        agency,
        totalAreaHectares: Number(totalAreaHectares),
        acquiredAreaHectares: Number(acquiredAreaHectares),
        budgetInrCrores: Number(budgetInrCrores),
        disbursedInrCrores: Number(disbursedInrCrores),
        stage,
        status,
      });
      setTitle('');
      setCode('');
      setState('Punjab');
      setDistrict('SAS Nagar (Mohali)');
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Register Land Acquisition Project
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a new statutory infrastructure project record in Firestore.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={150}
                placeholder="e.g. SH-12A Jhanjeri-Chunni Kalan 6-Lane Bypass"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project Code *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={40}
                placeholder="e.g. PRJ-PB-JHANJERI-006"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">State *</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Punjab"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">District *</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="SAS Nagar (Mohali)"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Requiring Agency *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                placeholder="NHAI PIU Chandigarh / GMADA"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Area (ha)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={totalAreaHectares}
                onChange={(e) => setTotalAreaHectares(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Acquired (ha)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={acquiredAreaHectares}
                onChange={(e) => setAcquiredAreaHectares(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Budget (₹ Cr)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={budgetInrCrores}
                onChange={(e) => setBudgetInrCrores(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Disbursed (₹ Cr)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={disbursedInrCrores}
                onChange={(e) => setDisbursedInrCrores(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Statutory Stage (RFCTLARR 2013)
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as ProjectStage)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {PROJECT_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {PROJECT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Saving to Firestore...' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreateParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSubmit: (data: {
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
  }) => Promise<void>;
}

export function CreateParcelModal({
  isOpen,
  onClose,
  projects,
  onSubmit,
}: CreateParcelModalProps) {
  const [surveyNumber, setSurveyNumber] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [village, setVillage] = useState('Jhanjeri (HB 39)');
  const [district, setDistrict] = useState(
    projects[0]?.district || 'SAS Nagar (Mohali)'
  );
  const [landownerName, setLandownerName] = useState('');
  const [areaHectares, setAreaHectares] = useState('1.45');
  const [landType, setLandType] = useState<LandType>('Agricultural');
  const [acquisitionStage, setAcquisitionStage] =
    useState<ParcelAcquisitionStage>('Notification Issued');
  const [compensationStatus, setCompensationStatus] =
    useState<CompensationStatus>('Approved');
  const [compensationAmountInr, setCompensationAmountInr] = useState('2850000');
  const [rehabStatus, setRehabStatus] = useState<RehabStatus>('Eligible');
  const [latitude, setLatitude] = useState('30.6808');
  const [longitude, setLongitude] = useState('76.6055');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedProject = projects.find((p) => p.id === projectId) || projects[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) {
      setFormError('Please create a project before registering a land parcel.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        surveyNumber,
        projectId: selectedProject.id,
        projectTitle: selectedProject.title,
        village,
        district: district || selectedProject.district,
        landownerName,
        areaHectares: Number(areaHectares),
        landType,
        acquisitionStage,
        compensationStatus,
        compensationAmountInr: Number(compensationAmountInr),
        rehabStatus,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      setSurveyNumber('');
      setVillage('Jhanjeri (HB 39)');
      setLandownerName('');
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to register parcel.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Register Cadastral Land Parcel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Link a Khasra / Survey number to an active acquisition project.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Parent Project *
              </label>
              <select
                value={selectedProject?.id || ''}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.code} — {proj.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Khasra / Survey No. *
              </label>
              <input
                type="text"
                required
                minLength={1}
                maxLength={60}
                placeholder="e.g. Hadbast 39 | Murabba 42//15/1"
                value={surveyNumber}
                onChange={(e) => setSurveyNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Landowner Name *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                placeholder="Gurpreet Singh Sidhu"
                value={landownerName}
                onChange={(e) => setLandownerName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Village / Sub-District *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                placeholder="30352 Muzaffarpur"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                District *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Jalandhar"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Parcel Area (ha)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={areaHectares}
                onChange={(e) => setAreaHectares(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Land Classification
              </label>
              <select
                value={landType}
                onChange={(e) => setLandType(e.target.value as LandType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {LAND_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt === 'Barren' ? 'Non-Developable Plot (Barren)' : lt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Award Amount (₹)
              </label>
              <input
                type="number"
                step="1000"
                min="0"
                required
                value={compensationAmountInr}
                onChange={(e) => setCompensationAmountInr(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Acquisition Stage
              </label>
              <select
                value={acquisitionStage}
                onChange={(e) => setAcquisitionStage(e.target.value as ParcelAcquisitionStage)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {PARCEL_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Compensation Status
              </label>
              <select
                value={compensationStatus}
                onChange={(e) => setCompensationStatus(e.target.value as CompensationStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {COMPENSATION_STATUSES.map((cs) => (
                  <option key={cs} value={cs}>
                    {cs}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                R&R Entitlement
              </label>
              <select
                value={rehabStatus}
                onChange={(e) => setRehabStatus(e.target.value as RehabStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {REHAB_STATUSES.map((rs) => (
                  <option key={rs} value={rs}>
                    {rs}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Latitude (°N)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Longitude (°E)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {submitting ? 'Saving Parcel...' : 'Register Parcel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

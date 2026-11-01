import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  loadAndValidateDataset,
  ROOT_DIR,
} from './validate-dataset.ts';

const __filename = fileURLToPath(import.meta.url);

// Map dataset acquisition_status & Tricity stage/status labels to RFCTLARR UI stage & status enums
export function mapProjectStatus(
  acqStatus: string,
  currentStageLabel?: string,
  uiStatus?: string
): {
  stage:
    | 'Section 4 SIA'
    | 'Section 11 Notification'
    | 'Section 19 Declaration'
    | 'Section 23 Award'
    | 'Possession Taken';
  status: 'Active' | 'Delayed' | 'Disputed' | 'Completed';
} {
  let stage:
    | 'Section 4 SIA'
    | 'Section 11 Notification'
    | 'Section 19 Declaration'
    | 'Section 23 Award'
    | 'Possession Taken' = 'Section 11 Notification';

  if (currentStageLabel) {
    if (currentStageLabel.includes('Section 38') || currentStageLabel.includes('Possession')) {
      stage = 'Possession Taken';
    } else if (currentStageLabel.includes('Section 23')) {
      stage = 'Section 23 Award';
    } else if (currentStageLabel.includes('Section 19')) {
      stage = 'Section 19 Declaration';
    } else if (currentStageLabel.includes('Section 11')) {
      stage = 'Section 11 Notification';
    } else if (currentStageLabel.includes('Section 4')) {
      stage = 'Section 4 SIA';
    }
  } else {
    switch (acqStatus) {
      case 'not_initiated':
        stage = 'Section 4 SIA';
        break;
      case 'notification_issued':
        stage = 'Section 11 Notification';
        break;
      case 'documentation_pending':
      case 'disputed':
        stage = 'Section 19 Declaration';
        break;
      case 'approved':
        stage = 'Section 23 Award';
        break;
      case 'acquired':
        stage = 'Possession Taken';
        break;
    }
  }

  let status: 'Active' | 'Delayed' | 'Disputed' | 'Completed' = 'Active';
  if (uiStatus === 'Active' || uiStatus === 'Delayed' || uiStatus === 'Disputed' || uiStatus === 'Completed') {
    status = uiStatus;
  } else if (acqStatus === 'disputed') {
    status = 'Disputed';
  } else if (acqStatus === 'documentation_pending') {
    status = 'Delayed';
  } else if (acqStatus === 'acquired') {
    status = 'Active';
  }

  return { stage, status };
}

export function mapParcelStages(
  acqStatus: string,
  payStatus: string
): {
  acquisitionStage:
    | 'Survey Pending'
    | 'SIA Underway'
    | 'Notification Issued'
    | 'Award Declared'
    | 'Compensation Paid'
    | 'Possession Handover';
  compensationStatus:
    | 'Pending Assessment'
    | 'Approved'
    | 'Disbursed'
    | 'Litigation';
  rehabStatus: 'Not Applicable' | 'Eligible' | 'Allotted' | 'Completed';
} {
  let acquisitionStage:
    | 'Survey Pending'
    | 'SIA Underway'
    | 'Notification Issued'
    | 'Award Declared'
    | 'Compensation Paid'
    | 'Possession Handover' = 'Notification Issued';

  if (acqStatus === 'not_initiated') acquisitionStage = 'Survey Pending';
  else if (acqStatus === 'notification_issued')
    acquisitionStage = 'Notification Issued';
  else if (acqStatus === 'documentation_pending')
    acquisitionStage = 'SIA Underway';
  else if (acqStatus === 'disputed') acquisitionStage = 'Notification Issued';
  else if (acqStatus === 'approved') acquisitionStage = 'Award Declared';
  else if (acqStatus === 'acquired') acquisitionStage = 'Possession Handover';

  let compensationStatus:
    | 'Pending Assessment'
    | 'Approved'
    | 'Disbursed'
    | 'Litigation' = 'Pending Assessment';
  if (acqStatus === 'disputed') compensationStatus = 'Litigation';
  else if (payStatus === 'paid') compensationStatus = 'Disbursed';
  else if (payStatus === 'partially_paid' || acqStatus === 'approved')
    compensationStatus = 'Approved';

  let rehabStatus: 'Not Applicable' | 'Eligible' | 'Allotted' | 'Completed' =
    'Eligible';
  if (acqStatus === 'acquired') rehabStatus = 'Completed';
  else if (acqStatus === 'approved') rehabStatus = 'Allotted';

  return { acquisitionStage, compensationStatus, rehabStatus };
}

/**
 * Builds deterministic, schema-validated Firestore documents for all 7 collections
 * using stable document IDs so multiple executions never create duplicate documents.
 */
export function buildFirestoreSeedPayloads(ownerId: string) {
  const dataset = loadAndValidateDataset();

  const projectById = new Map(dataset.projects.map((p) => [p.project_id, p]));
  const ownerByParcelId = new Map(
    dataset.landowners.map((o) => [o.parcel_id, o])
  );
  const compByParcelId = new Map(
    dataset.compensations.map((c) => [c.parcel_id, c])
  );

  const projectsDocs = dataset.projects.map((p) => {
    const mapped = mapProjectStatus(
      p.acquisition_status,
      p.current_stage_label,
      p.ui_status
    );
    const budgetInrCrores = Number(
      (Number(p.sanctioned_budget_inr) / 10000000).toFixed(2)
    );
    const disbursedInrCrores = Number(
      (Number(p.disbursed_amount_inr) / 10000000).toFixed(2)
    );

    return {
      id: p.project_id,
      raw: p,
      data: {
        title: p.project_name.slice(0, 150),
        code: p.project_code.slice(0, 40),
        state: (p.state || 'Punjab').slice(0, 80),
        district: p.district.slice(0, 80),
        agency: p.executing_agency.slice(0, 100),
        totalAreaHectares: Number(p.total_area_hectares),
        acquiredAreaHectares: Number(p.acquired_area_hectares),
        budgetInrCrores,
        disbursedInrCrores,
        stage: mapped.stage,
        status: mapped.status,
        ownerId,
      },
    };
  });

  const parcelsDocs = dataset.parcels.map((parcel) => {
    const parentProj = projectById.get(parcel.project_id)!;
    const owner = ownerByParcelId.get(parcel.parcel_id)!;
    const comp = compByParcelId.get(parcel.parcel_id)!;
    const mapped = mapParcelStages(
      parcel.acquisition_status,
      comp.payment_status
    );

    return {
      id: parcel.parcel_id, // Stable ID: PAR-PB-001 .. PAR-PB-050
      raw: parcel,
      data: {
        surveyNumber: `${parcel.khasra_number} (${parcel.demo_ulpin})`.slice(
          0,
          60
        ),
        projectId: parcel.project_id,
        projectTitle: parentProj.project_name.slice(0, 150),
        village: parcel.village.slice(0, 100),
        district: parcel.district.slice(0, 80),
        landownerName: owner.full_name.slice(0, 120),
        areaHectares: Number(parcel.area_hectares),
        landType: parcel.land_use_type as
          | 'Agricultural'
          | 'Residential'
          | 'Commercial'
          | 'Barren'
          | 'Forest',
        acquisitionStage: mapped.acquisitionStage,
        compensationStatus: mapped.compensationStatus,
        compensationAmountInr: Number(comp.total_award_amount_inr),
        rehabStatus: mapped.rehabStatus,
        latitude: Number(parcel.centroid_lat),
        longitude: Number(parcel.centroid_lng),
        ownerId,
      },
    };
  });

  const landownersDocs = dataset.landowners.map((o) => ({
    id: o.landowner_id, // Stable ID: OWN-PB-001 .. OWN-PB-050
    data: {
      landownerId: o.landowner_id,
      parcelId: o.parcel_id,
      projectId: o.project_id,
      fullName: o.full_name.slice(0, 120),
      fatherOrSpouseName: o.father_or_spouse_name.slice(0, 120),
      dummyContactNumber: o.dummy_contact_number.slice(0, 30),
      dummyEmail: o.dummy_email.slice(0, 120),
      village: o.village.slice(0, 100),
      district: o.district.slice(0, 80),
      ownershipType: o.ownership_type.slice(0, 50),
      sharePercentage: Number(o.share_percentage),
      kycVerified: o.kyc_verified === 'true',
      isSyntheticDemo: true,
      ownerId,
    },
  }));

  const compensationsDocs = dataset.compensations.map((c) => ({
    id: c.compensation_id, // Stable ID: CMP-PB-001 .. CMP-PB-050
    data: {
      compensationId: c.compensation_id,
      parcelId: c.parcel_id,
      projectId: c.project_id,
      landownerId: c.landowner_id,
      baseMarketValueInr: Number(c.base_market_value_inr),
      solatiumAmountInr: Number(c.solatium_amount_inr),
      multiplierFactor: Number(c.multiplier_factor),
      totalAwardAmountInr: Number(c.total_award_amount_inr),
      paidAmountInr: Number(c.paid_amount_inr),
      pendingAmountInr: Number(c.pending_amount_inr),
      paymentStatus: c.payment_status as 'pending' | 'partially_paid' | 'paid',
      pfmsReferenceCode: c.pfms_reference_code.slice(0, 60),
      awardDate: c.award_date.slice(0, 30),
      isSyntheticDemo: true,
      ownerId,
    },
  }));

  const documentsDocs = dataset.documents.map((d) => ({
    id: d.document_id, // Stable ID: DOC-PB-001 .. DOC-PB-050
    data: {
      documentId: d.document_id,
      parcelId: d.parcel_id,
      projectId: d.project_id,
      landownerId: d.landowner_id,
      jamabandiStatus: d.jamabandi_status.slice(0, 80),
      section11GazetteRef: d.section_11_gazette_ref.slice(0, 80),
      section19DeclarationRef: d.section_19_declaration_ref.slice(0, 80),
      encumbranceStatus: d.encumbrance_certificate_status.slice(0, 80),
      verificationStatus: d.verification_status as
        | 'verified'
        | 'objection_logged'
        | 'pending_verification',
      verifiedByOfficer: d.verified_by_officer.slice(0, 80),
      isSyntheticDemo: true,
      ownerId,
    },
  }));

  const rehabilitationsDocs = dataset.rehabilitations.map((r) => ({
    id: r.rnr_id, // Stable ID: RNR-PB-001 .. RNR-PB-050
    data: {
      rnrId: r.rnr_id,
      parcelId: r.parcel_id,
      projectId: r.project_id,
      landownerId: r.landowner_id,
      affectedFamilySize: Number(r.affected_family_size),
      livelihoodCategory: r.livelihood_category.slice(0, 80),
      subsistenceAllowanceInr: Number(r.subsistence_allowance_inr),
      resettlementGrantInr: Number(r.resettlement_grant_inr),
      housingUnitEntitled: r.housing_unit_entitled === 'true',
      rnrStatus: r.rnr_status as
        | 'assessment_ongoing'
        | 'allotted'
        | 'completed',
      paymentStatus: r.payment_status as 'pending' | 'partially_paid' | 'paid',
      allotmentReference: r.allotment_reference.slice(0, 80),
      isSyntheticDemo: true,
      ownerId,
    },
  }));

  const geometriesDocs = dataset.geojson.features.map((feat) => {
    const ring = feat.geometry.coordinates[0];
    const lngs = ring.map((pt) => pt[0]);
    const lats = ring.map((pt) => pt[1]);
    return {
      id: feat.properties.parcel_id, // Stable ID: PAR-PB-001 .. PAR-PB-050
      data: {
        parcelId: feat.properties.parcel_id,
        projectId: feat.properties.project_id,
        demoUlpin: feat.properties.demo_ulpin.slice(0, 60),
        acquisitionStatus: feat.properties.acquisition_status as
          | 'not_initiated'
          | 'notification_issued'
          | 'documentation_pending'
          | 'disputed'
          | 'approved'
          | 'acquired',
        paymentStatus: feat.properties.payment_status as
          | 'pending'
          | 'partially_paid'
          | 'paid',
        village: feat.properties.village.slice(0, 100),
        district: feat.properties.district.slice(0, 80),
        bboxLatMin: Math.min(...lats),
        bboxLatMax: Math.max(...lats),
        bboxLngMin: Math.min(...lngs),
        bboxLngMax: Math.max(...lngs),
        isSyntheticDemo: true,
        ownerId,
      },
    };
  });

  return {
    projectsDocs,
    parcelsDocs,
    landownersDocs,
    compensationsDocs,
    documentsDocs,
    rehabilitationsDocs,
    geometriesDocs,
    geojson: dataset.geojson,
  };
}

async function runCliSeed() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const ownerIdArg = args
    .find((a) => a.startsWith('--ownerId='))
    ?.split('=')[1];
  const idTokenArg =
    args.find((a) => a.startsWith('--idToken='))?.split('=')[1] ||
    process.env.FIREBASE_GOOGLE_ID_TOKEN;

  const ownerId = ownerIdArg || 'DEMO_OFFICER_UID';
  const payloads = buildFirestoreSeedPayloads(ownerId);

  const totalCount =
    payloads.projectsDocs.length +
    payloads.parcelsDocs.length +
    payloads.landownersDocs.length +
    payloads.compensationsDocs.length +
    payloads.documentsDocs.length +
    payloads.rehabilitationsDocs.length +
    payloads.geometriesDocs.length;

  console.log('======================================================================');
  console.log('BhoomiTrack AI (SIH26016) — Firestore Seed & Import Runner');
  console.log('======================================================================');
  console.log(`1. /projects                    : ${payloads.projectsDocs.length} records (IDs: PROJ-PB-001..005)`);
  console.log(`2. /parcels                     : ${payloads.parcelsDocs.length} records (IDs: PAR-PB-001..050)`);
  console.log(`3. /landowners                  : ${payloads.landownersDocs.length} records (IDs: OWN-PB-001..050)`);
  console.log(`4. /compensations               : ${payloads.compensationsDocs.length} records (IDs: CMP-PB-001..050)`);
  console.log(`5. /documents                   : ${payloads.documentsDocs.length} records (IDs: DOC-PB-001..050)`);
  console.log(`6. /rehabilitation_resettlement : ${payloads.rehabilitationsDocs.length} records (IDs: RNR-PB-001..050)`);
  console.log(`7. /parcel_geometries           : ${payloads.geometriesDocs.length} records (IDs: PAR-PB-001..050)`);
  console.log('----------------------------------------------------------------------');
  console.log(`Total Validated Records Read    : ${totalCount} records`);

  if (isDryRun) {
    console.log('Status: DRY-RUN PASSED (All 305 Firestore documents validated).');
    console.log('======================================================================');
    return;
  }

  const configPath = path.join(ROOT_DIR, 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error(
      'ERROR: Missing firebase-applet-config.json. Cannot initialize Firebase SDK.'
    );
    process.exit(1);
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`Firebase Project ID             : ${firebaseConfig.projectId}`);
  console.log(`Firestore Database ID           : ${firebaseConfig.firestoreDatabaseId}`);

  if (!idTokenArg && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('----------------------------------------------------------------------');
    console.log('CLI DIRECT WRITE STATUS: SKIPPED (Missing CLI Auth Token / Service Account)');
    console.log('Why:');
    console.log('  1. firebase-applet-config.json contains the Web Client SDK configuration.');
    console.log('  2. Production firestore.rules enforce Zero-Trust Authentication:');
    console.log('     allow create/update requires request.auth != null && email_verified == true.');
    console.log('  3. The non-interactive shell does not have GOOGLE_APPLICATION_CREDENTIALS');
    console.log('     (Firebase Admin Service Account JSON) or a browser Google OAuth ID token.');
    console.log('How Firestore Import Executes:');
    console.log('  - In the Web UI: Sign in with Google and click "Import Synthetic Dataset to Firestore"');
    console.log('    (uses src/lib/dataAccess.ts -> seedSyntheticDatasetToFirestore(user.uid)).');
    console.log('  - In the CLI: Pass a verified Google OAuth ID token via:');
    console.log('    npm run dataset:seed -- --idToken=<GOOGLE_OAUTH_ID_TOKEN>');
    console.log('======================================================================');
    return;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const credential = GoogleAuthProvider.credential(idTokenArg!);
  const userCred = await signInWithCredential(auth, credential);
  const authenticatedUid = userCred.user.uid;

  const authedPayloads = buildFirestoreSeedPayloads(authenticatedUid);

  // Stage 1: Root Projects (5 records)
  const batchProjects = writeBatch(db);
  for (const item of authedPayloads.projectsDocs) {
    batchProjects.set(doc(db, 'projects', item.id), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batchProjects.commit();

  // Stage 2: Land Parcels referencing Projects (50 records)
  const batchParcels = writeBatch(db);
  for (const item of authedPayloads.parcelsDocs) {
    batchParcels.set(doc(db, 'parcels', item.id), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batchParcels.commit();

  // Stage 3: Dependent Relational & GeoJSON Collections referencing Parcels (250 records)
  const batchChildren = writeBatch(db);
  for (const item of authedPayloads.landownersDocs) {
    batchChildren.set(doc(db, 'landowners', item.id), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const item of authedPayloads.compensationsDocs) {
    batchChildren.set(doc(db, 'compensations', item.id), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const item of authedPayloads.documentsDocs) {
    batchChildren.set(doc(db, 'documents', item.id), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const item of authedPayloads.rehabilitationsDocs) {
    batchChildren.set(doc(db, 'rehabilitation_resettlement', item.id), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const item of authedPayloads.geometriesDocs) {
    batchChildren.set(doc(db, 'parcel_geometries', item.id), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batchChildren.commit();

  console.log(
    `CLI DIRECT WRITE STATUS: SUCCESS (${totalCount} records imported into Firestore for UID ${authenticatedUid}).`
  );
  console.log('======================================================================');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCliSeed().catch((err) => {
    console.error('Firestore Seed Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

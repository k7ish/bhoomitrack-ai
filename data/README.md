# BhoomiTrack AI (SIH26016) — Synthetic Punjab Land Acquisition Dataset

> **IMPORTANT DISCLAIMER — SYNTHETIC DEMONSTRATION DATA ONLY**
>
> 1. **100% Synthetic Data**: Every record in this folder (`projects.csv`, `parcels.csv`, `landowners.csv`, `compensation.csv`, `documents.csv`, `rehabilitation_resettlement.csv`, and `parcels.geojson`) is completely fictional and generated strictly for software engineering demonstration and testing under Smart India Hackathon Problem Statement **SIH26016**.
> 2. **No Real Personal Information (PII)**: Landowner names are fictional (suffixed with `(Demo)`), phone numbers use dummy ranges (`+91-90000-00001` to `+91-90000-00050`), and email addresses use the reserved `.invalid` TLD (`@demo-bhoomitrack.invalid`).
> 3. **Non-Official ULPIN References**: Identifiers prefixed with `DEMO-ULPIN-PB-XXXX` are synthetic demonstration tokens and are **NOT** official Bhu-Aadhaar / Unique Land Parcel Identification Numbers.
> 4. **Non-Surveyed Geometry**: The rectangular polygons in `parcels.geojson` are synthetic demonstration geometries placed near Punjab district coordinates (**Ludhiana, Mohali, Bathinda, Patiala, and Fazilka**) and do **NOT** represent surveyed or legal cadastral land boundaries.

---

## 1. Files Included in `data/`

| File | Record Count | Primary Key | Foreign Keys | Description |
| :--- | :---: | :--- | :--- | :--- |
| `projects.csv` | **5** | `project_id` (`PROJ-PB-001`..`005`) | — | Fictional infrastructure corridors across Ludhiana, Mohali, Bathinda, Patiala, and Fazilka. |
| `parcels.csv` | **50** | `parcel_id` (`PAR-PB-001`..`050`) | `project_id` | 50 synthetic land parcels (10 per project) with `DEMO-ULPIN` references and centroids. |
| `landowners.csv` | **50** | `landowner_id` (`OWN-PB-001`..`050`) | `parcel_id`, `project_id` | Fictional khatedar/titleholder profiles with dummy contact details. |
| `compensation.csv` | **50** | `compensation_id` (`CMP-PB-001`..`050`) | `parcel_id`, `project_id`, `landowner_id` | Illustrative RFCTLARR 2013 award calculations, solatium, and PFMS disbursement status. |
| `documents.csv` | **50** | `document_id` (`DOC-PB-001`..`050`) | `parcel_id`, `project_id`, `landowner_id` | Statutory notification (Section 11 / Section 19) and Jamabandi verification records. |
| `rehabilitation_resettlement.csv` | **50** | `rnr_id` (`RNR-PB-001`..`050`) | `parcel_id`, `project_id`, `landowner_id` | Schedule II R&R subsistence, housing entitlement, and resettlement grant statuses. |
| `parcels.geojson` | **50 Features** | `id` / `properties.parcel_id` | `properties.project_id`, `landowner_id`, `compensation_id`, `document_id`, `rnr_id` | Valid GeoJSON `FeatureCollection` containing 50 rectangular `Polygon` features. |

---

## 2. Controlled Status Vocabularies

### Acquisition Statuses (`acquisition_status`)
All parcel and GeoJSON records strictly use one of these 6 values:
* `not_initiated`
* `notification_issued`
* `documentation_pending`
* `disputed`
* `approved`
* `acquired`

### Payment Statuses (`payment_status`)
All compensation, R&R, and GeoJSON records strictly use one of these 3 values:
* `pending`
* `partially_paid`
* `paid`

---

## 3. Entity Relationship Architecture

```text
projects.csv (project_id: PROJ-PB-001 .. PROJ-PB-005)
   │
   └──< parcels.csv (parcel_id: PAR-PB-001 .. PAR-PB-050, project_id)
          ├─── landowners.csv (landowner_id: OWN-PB-001 .. OWN-PB-050, parcel_id, project_id)
          ├─── compensation.csv (compensation_id: CMP-PB-001 .. CMP-PB-050, parcel_id, project_id, landowner_id)
          ├─── documents.csv (document_id: DOC-PB-001 .. DOC-PB-050, parcel_id, project_id, landowner_id)
          ├─── rehabilitation_resettlement.csv (rnr_id: RNR-PB-001 .. RNR-PB-050, parcel_id, project_id, landowner_id)
          └─── parcels.geojson (Feature.id = parcel_id, properties.project_id = project_id)
```

---

## 4. Validating & Importing into Firebase Firestore

### Step 1: Validate CSVs, GeoJSON, Foreign Keys, and Record Counts
Run the standalone validation script:
```bash
npm run dataset:validate
```
*(or `npx tsx scripts/validate-dataset.ts`)*

### Step 2: Import / Seed into Firebase Firestore
You can import the dataset using either the CLI seed script or from the authenticated BhoomiTrack AI web application:

1. **Via CLI Script (`scripts/seed-firestore.ts`)**:
   ```bash
   npm run dataset:seed -- --ownerId=<YOUR_FIREBASE_AUTH_UID>
   ```
   Or dry-run/verify payload preparation without writing:
   ```bash
   npm run dataset:seed -- --dry-run
   ```
2. **Idempotency & Duplicate Prevention**:
   The seed script uses deterministic document IDs (`PROJ-PB-001`..`005`, `PAR-PB-001`..`050`, `OWN-PB-001`..`050`, `CMP-PB-001`..`050`, `DOC-PB-001`..`050`, `RNR-PB-001`..`050`, `GEO-PB-001`..`050`) with `setDoc(..., { merge: true })`. Re-running the import script updates existing records in-place and **never** creates duplicate documents.

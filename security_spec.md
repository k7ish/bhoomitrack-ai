# BhoomiTrack AI (SIH26016) — Firestore Security Specification

## 1. Data Invariants

1. **Default-Deny Catch-All**: All paths not explicitly matched (`/{document=**}`) deny all reads and writes.
2. **Authentication & Verification**: All write operations require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Strict Ownership & Query Enforcement**:
   - Every `Project` and `LandParcel` document must have `ownerId == request.auth.uid` on creation.
   - `allow list` on `/projects` and `/parcels` strictly requires `resource.data.ownerId == request.auth.uid` (no blanket `isSignedIn()` list rules).
   - `ownerId` and `createdAt` are immutable across all updates.
4. **Relational Consistency (Master Gate)**:
   - A `LandParcel` cannot be created unless its referenced `/projects/$(incoming().projectId)` exists and belongs to `request.auth.uid`.
   - `projectId` on a `LandParcel` is immutable after creation.
5. **Terminal State Locking**:
   - Once a `Project` reaches `status == 'Completed'`, no further non-admin updates are permitted.
   - Once a `LandParcel` reaches `acquisitionStage == 'Possession Handover'`, no further non-admin updates are permitted.
6. **Temporal Integrity**:
   - `createdAt` and `updatedAt` must equal `request.time` on creation.
   - `updatedAt` must equal `request.time` on update.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on Project Create**: `ownerId: "victim-uid"` when authenticated as `"attacker-uid"`.
2. **Shadow Field Injection on Project Create**: Adding `"isApproved": true` not in `hasOnly()` allowlist.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting to create a Project.
4. **Admin Email Spoofing**: Authenticated user with `email: "samcoc70020@gmail.com"` but `email_verified: false`.
5. **Orphaned Parcel Creation**: Creating a `LandParcel` with `projectId: "non-existent-project"`.
6. **Cross-Tenant Parcel Creation**: Creating a `LandParcel` pointing to a `projectId` owned by another user.
7. **Terminal State Bypass**: Updating a `Project` whose existing `status` is `"Completed"` as a non-admin.
8. **Immortal Field Mutation**: Updating `createdAt` or `ownerId` on an existing `Project`.
9. **Client Timestamp Forgery**: Providing a past/future timestamp for `updatedAt` instead of `request.time`.
10. **Value Poisoning on Update**: Updating `status` to `"HackedStatus"` (not in enum) or `title` to a 5,000-character string.
11. **ID Poisoning Attack**: Document ID containing spaces or special characters (`project/../../bad`) or >128 chars.
12. **Blanket List Scraping**: Listing `/projects` without filtering `ownerId == request.auth.uid`.

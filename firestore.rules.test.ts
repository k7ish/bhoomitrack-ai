/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface DirtyPayloadTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyPayloadTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Project Create',
    operation: 'create',
    path: '/projects/proj_01',
    auth: { uid: 'attacker_1', email: 'attacker@example.com', email_verified: true },
    payload: { ownerId: 'victim_1', title: 'NH-44 Expansion' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Project Create',
    operation: 'create',
    path: '/projects/proj_01',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { ownerId: 'user_1', title: 'NH-44 Expansion', isSuperAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/projects/proj_01',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: false },
    payload: { ownerId: 'user_1', title: 'NH-44 Expansion' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Admin Email Spoofing with Unverified Email',
    operation: 'get',
    path: '/projects/other_user_proj',
    auth: { uid: 'spoof_1', email: 'samcoc70020@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Parcel Creation',
    operation: 'create',
    path: '/parcels/parcel_01',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { ownerId: 'user_1', projectId: 'missing_proj_999' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Cross-Tenant Parcel Creation',
    operation: 'create',
    path: '/parcels/parcel_01',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { ownerId: 'user_1', projectId: 'other_users_project' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Bypass on Completed Project',
    operation: 'update',
    path: '/projects/completed_proj',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { status: 'Active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immortal Field Mutation (ownerId / createdAt)',
    operation: 'update',
    path: '/projects/proj_01',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { ownerId: 'user_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    operation: 'update',
    path: '/projects/proj_01',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { updatedAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Update (Invalid Enum)',
    operation: 'update',
    path: '/projects/proj_01',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { status: 'INVALID_STATUS' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'ID Poisoning Attack',
    operation: 'create',
    path: '/projects/invalid$id!@#',
    auth: { uid: 'user_1', email: 'user@example.com', email_verified: true },
    payload: { ownerId: 'user_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blanket List Scraping Across Tenants',
    operation: 'list',
    path: '/projects',
    auth: { uid: 'attacker_1', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];

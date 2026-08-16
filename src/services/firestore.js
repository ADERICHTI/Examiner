import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../utility/config';

// ---------- admins ----------

export async function isAdminEmail(email) {
  if (!email) return false;
  const snap = await getDoc(doc(db, 'admins', email));
  return snap.exists();
}

// ---------- tests ----------

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'test';
}

function randomSuffix(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function getTest(testId) {
  if (!testId) return null;
  const snap = await getDoc(doc(db, 'tests', testId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listTests() {
  const snap = await getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createTest({ adminEnteredId, displayName, minutes, questions, allowedUsers, strictMode, createdBy }) {
  // Collision-checked id: admin-entered id + random suffix, retried on the
  // (astronomically unlikely) chance of a collision.
  let testId;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${slugify(adminEnteredId)}-${randomSuffix()}`;
    const existing = await getDoc(doc(db, 'tests', candidate));
    if (!existing.exists()) {
      testId = candidate;
      break;
    }
  }
  if (!testId) throw new Error('Could not allocate a unique test id, please try again.');

  await setDoc(doc(db, 'tests', testId), {
    adminEnteredId,
    displayName,
    minutes,
    questions,
    // Empty/absent = open to anyone with the link; non-empty = only these
    // name + student id pairs may start the test (checked in StartTest.jsx).
    allowedUsers: allowedUsers ?? [],
    // Strict mode: no exit button, forces fullscreen, auto-submits if the
    // student navigates away or leaves fullscreen (enforced in TestInterface.jsx).
    strictMode: Boolean(strictMode),
    active: true,
    createdAt: serverTimestamp(),
    createdBy,
    updatedAt: serverTimestamp(),
    updatedBy: createdBy,
    submissionCount: 0,
    lastSubmissionAt: null,
  });

  return testId;
}

export async function updateTest(testId, { displayName, minutes, questions, allowedUsers, strictMode, active, updatedBy }) {
  const patch = { updatedAt: serverTimestamp(), updatedBy };
  if (displayName !== undefined) patch.displayName = displayName;
  if (minutes !== undefined) patch.minutes = minutes;
  if (questions !== undefined) patch.questions = questions;
  if (allowedUsers !== undefined) patch.allowedUsers = allowedUsers;
  if (strictMode !== undefined) patch.strictMode = strictMode;
  if (active !== undefined) patch.active = active;
  await updateDoc(doc(db, 'tests', testId), patch);
}

export async function deleteTest(testId) {
  await deleteDoc(doc(db, 'tests', testId));
}

// ---------- users ----------

export async function upsertUser(email, data) {
  await setDoc(doc(db, 'users', email), { email, ...data, lastSignInAt: serverTimestamp() }, { merge: true });
}

export async function getUser(email) {
  const snap = await getDoc(doc(db, 'users', email));
  return snap.exists() ? snap.data() : null;
}

export async function hasUserTakenTest(email, testId) {
  const user = await getUser(email);
  return Boolean(user?.testsTaken?.[testId]);
}

// ---------- submissions: tests/{testId}/submissions/{studentId_time} ----------

function submissionsCol(testId) {
  return collection(db, 'tests', testId, 'submissions');
}

export async function getSubmission(testId, attemptId) {
  const snap = await getDoc(doc(db, 'tests', testId, 'submissions', attemptId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Finds an existing attempt for this student id under this test, regardless
// of who's asking - used to block retakes/duplicate starts under the same id.
export async function findActiveSubmission(testId, studentId) {
  const snap = await getDocs(query(submissionsCol(testId), where('studentId', '==', studentId)));
  if (snap.empty) return null;
  const attempts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  attempts.sort((a, b) => (b.startedAt?.toMillis?.() ?? 0) - (a.startedAt?.toMillis?.() ?? 0));
  return attempts[0];
}

export async function startTestAttempt(testId, studentId, { name, userEmail }) {
  const attemptId = `${studentId}_${Date.now()}`;
  await setDoc(doc(db, 'tests', testId, 'submissions', attemptId), {
    studentId,
    name,
    userEmail,
    startedAt: serverTimestamp(),
    testTaken: false,
    submittedAt: null,
    answers: null,
    score: null,
  });
  return attemptId;
}

export async function submitTestAttempt({ testId, attemptId, userEmail, answers, score }) {
  const batch = writeBatch(db);

  batch.update(doc(db, 'tests', testId, 'submissions', attemptId), {
    testTaken: true,
    submittedAt: serverTimestamp(),
    answers,
    score,
  });

  batch.set(
    doc(db, 'users', userEmail),
    { testsTaken: { [testId]: true } },
    { merge: true }
  );

  batch.update(doc(db, 'tests', testId), {
    submissionCount: increment(1),
    lastSubmissionAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function listSubmissionsForTest(testId) {
  const snap = await getDocs(submissionsCol(testId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Deletes a submission and all its metadata, decrements the test's counter if
// it had been completed, and clears the student's testsTaken flag for this
// test so they're no longer blocked from retaking it.
export async function deleteSubmission(testId, attemptId) {
  const submissionRef = doc(db, 'tests', testId, 'submissions', attemptId);
  const snap = await getDoc(submissionRef);
  if (!snap.exists()) return;
  const data = snap.data();

  const batch = writeBatch(db);
  batch.delete(submissionRef);
  if (data.testTaken === true) {
    batch.update(doc(db, 'tests', testId), { submissionCount: increment(-1) });
    if (data.userEmail) {
      batch.set(doc(db, 'users', data.userEmail), { testsTaken: { [testId]: false } }, { merge: true });
    }
  }
  await batch.commit();
}

// ---------- dashboard recents ----------

export async function listRecentSubmissions(max = 20) {
  const snap = await getDocs(
    query(collectionGroup(db, 'submissions'), where('testTaken', '==', true), orderBy('submittedAt', 'desc'), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, testId: d.ref.parent.parent.id, ...d.data() }));
}

export async function listRecentlyCreatedTests(max = 20) {
  const snap = await getDocs(query(collection(db, 'tests'), orderBy('createdAt', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listRecentlyEditedTests(max = 20) {
  const snap = await getDocs(query(collection(db, 'tests'), orderBy('updatedAt', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

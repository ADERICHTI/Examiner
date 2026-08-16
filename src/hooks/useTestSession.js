import { useNavigate, useSearchParams } from 'react-router-dom';

// Centralizes reading/propagating the test id (?id=) and, once a student has
// started an attempt, their student id (?sid=) across every navigation so a
// page refresh never loses track of "which test / which attempt" - everything
// is re-derivable from the URL + Firestore instead of fragile in-memory state.
export function useTestSession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('id');
  const studentId = searchParams.get('sid');

  function paramsFor(extra = {}) {
    const merged = { id: testId, sid: studentId, ...extra };
    const params = new URLSearchParams();
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  function goTo(path, extra = {}, options) {
    navigate(`${path}${paramsFor(extra)}`, options);
  }

  return { testId, studentId, paramsFor, goTo };
}

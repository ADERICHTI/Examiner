import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function RequireAdmin() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    const redirectTarget = `${location.pathname}${location.search}`;
    return <Navigate to={`/admin/auth?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/auth" replace />;
  }

  return <Outlet />;
}

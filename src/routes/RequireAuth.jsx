import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  if (loading) return <LoadingScreen />;

  if (!user) {
    const redirectTarget = `${location.pathname}${location.search}`;
    const authUrl = id
      ? `/auth?id=${encodeURIComponent(id)}&redirect=${encodeURIComponent(redirectTarget)}`
      : `/auth?redirect=${encodeURIComponent(redirectTarget)}`;
    return <Navigate to={authUrl} replace />;
  }

  return <Outlet />;
}

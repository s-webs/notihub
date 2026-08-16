import { Navigate, Outlet } from 'react-router-dom';
import { isLoggedIn } from './auth';

export function RequireAuth() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

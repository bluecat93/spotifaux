import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // or spinner
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
export default function AdminProtected({ children }){
  const { user, loaded } = useAuth(); const loc = useLocation()
  if(!loaded) return null; if(!user || !user.isAdmin) return <Navigate to="/admin/login" state={{ from: loc }} replace />
  return children || <Outlet/>
}
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
export default function Protected({ children }){
  const { user, loaded } = useAuth(); const loc = useLocation()
  if(!loaded) return null; if(!user) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}
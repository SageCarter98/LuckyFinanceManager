import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import { AdminApp } from './AdminApp'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AppRoutes } from './App'
import { SiteSettingsProvider } from './context/SiteSettingsContext'

const root = document.getElementById('root')!

const app = (
  <StrictMode>
    <BrowserRouter>
      <SiteSettingsProvider>
        <AppRoutes />
      </SiteSettingsProvider>
    </BrowserRouter>
  </StrictMode>
)

// Prerendered routes ship real markup → hydrate. Otherwise mount fresh.
if (root.firstElementChild) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}

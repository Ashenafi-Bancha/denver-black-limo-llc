import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AboutPage } from './pages/AboutPage'
import { BookNowPage } from './pages/BookNowPage'
import { ContactPage } from './pages/ContactPage'
import { FleetPage } from './pages/FleetPage'
import { HomePage } from './pages/HomePage'
import { RequestQuotePage } from './pages/RequestQuotePage'
import { ServiceAreaDetailPage } from './pages/ServiceAreaDetailPage'
import { ServiceAreasPage } from './pages/ServiceAreasPage'
import { ServiceDetailPage } from './pages/ServiceDetailPage'
import { ServicesPage } from './pages/ServicesPage'
import { AdminDashboard } from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:slug" element={<ServiceDetailPage />} />
          <Route path="service-areas" element={<ServiceAreasPage />} />
          <Route path="service-areas/:slug" element={<ServiceAreaDetailPage />} />
          <Route path="fleet" element={<FleetPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="book" element={<BookNowPage />} />
          <Route path="quote" element={<RequestQuotePage />} />
        </Route>
        <Route path="admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

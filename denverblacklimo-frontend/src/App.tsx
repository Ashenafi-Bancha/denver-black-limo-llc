import { Route, Routes } from 'react-router-dom'
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
import { PricingPage } from './pages/PricingPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { BlogPage } from './pages/BlogPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { NotFoundPage } from './pages/NotFoundPage'

/** Route tree, router-agnostic so it can be wrapped by BrowserRouter (client) or StaticRouter (SSG). */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:slug" element={<ServiceDetailPage />} />
        <Route path="service-areas" element={<ServiceAreasPage />} />
        <Route path="service-areas/:slug" element={<ServiceAreaDetailPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="book" element={<BookNowPage />} />
        <Route path="quote" element={<RequestQuotePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="admin" element={<AdminDashboard />} />
    </Routes>
  )
}

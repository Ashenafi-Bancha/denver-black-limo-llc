import { Link, Navigate, useParams } from 'react-router-dom'
import { getServiceBySlug } from '../data/services'

export function ServiceDetailPage() {
  const { slug } = useParams()
  const service = slug ? getServiceBySlug(slug) : undefined

  if (!service) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center md:px-6">
        <h1 className="font-display text-3xl">Service not found</h1>
        <Link to="/services" className="mt-4 inline-block text-brand-gold-light">
          Back to services
        </Link>
      </div>
    )
  }

  return <Navigate to={`/services#${service.slug}`} replace />
}

import { Link, Navigate, useParams } from 'react-router-dom'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { defaultServices } from '../content/defaults'
import type { Service } from '../data/services'

export function ServiceDetailPage() {
  const { slug } = useParams()
  const { get } = useSiteSettings()
  // Resolve against the CMS list, not the built-in one, so a service added or
  // re-slugged in the admin still opens instead of reporting "not found".
  const services = get<Service[]>('services', defaultServices)
  const service = slug ? services.find((s) => s.slug === slug) : undefined

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

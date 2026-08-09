import { FallbackImage } from './FallbackImage'
import { imageCandidates, numberedPaths } from '../lib/imageSource'
import { IMAGES } from '../config/images'
import { fleet as builtInFleet, type FleetVehicle } from '../data/fleet'

/** What this vehicle's photo was before anyone edited it in the admin. */
function builtInImageFor(v: FleetVehicle) {
  return builtInFleet.find((b) => b.id === v.id)?.image
}

/**
 * Sources to try for a vehicle photo, best first. A photo set in the admin
 * wins; otherwise the client's own `/images/fleet/fleet-<n>.jpeg` upload; then
 * the stock image on the record.
 */
export function vehicleImageCandidates(v: FleetVehicle) {
  return imageCandidates(v.image, builtInImageFor(v), [
    ...numberedPaths('/images/fleet', 'fleet', v.number),
  ]).concat(IMAGES.hero2)
}

/** First choice only — for callers that need a plain URL rather than an <img>. */
export function vehicleImg(v: FleetVehicle) {
  return vehicleImageCandidates(v)[0]
}

/**
 * A fleet photo with the project's usual fallback chain. Shared so the Fleet
 * page and the homepage pricing cards can never drift apart on which photo a
 * vehicle shows.
 */
export function VehicleImage({ vehicle, className }: { vehicle: FleetVehicle; className: string }) {
  return (
    <FallbackImage
      candidates={vehicleImageCandidates(vehicle)}
      alt={vehicle.name}
      loading="lazy"
      className={className}
    />
  )
}

/**
 * Pairs a pricing row with its fleet vehicle. The two lists are maintained
 * separately, so match on name and fall back to a loose match rather than
 * showing a card with no picture.
 */
export function findVehicleFor(vehicleName: string, fleet: FleetVehicle[]) {
  const target = vehicleName.trim().toLowerCase()
  return (
    fleet.find((v) => v.name.trim().toLowerCase() === target) ??
    fleet.find((v) => v.name.toLowerCase().includes(target) || target.includes(v.name.toLowerCase())) ??
    null
  )
}

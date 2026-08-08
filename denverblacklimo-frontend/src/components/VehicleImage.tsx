import { IMAGES } from '../config/images'
import type { FleetVehicle } from '../data/fleet'

/** Primary source: the client's own photo, named by position in the fleet list. */
export function vehicleImg(v: FleetVehicle) {
  return v.number ? `/images/fleet/fleet-${v.number}.jpeg` : v.image
}

/**
 * A fleet photo with the project's usual fallback chain: `.jpeg` → `.jpg` → the
 * stock image on the vehicle record. Shared so the Fleet page and the homepage
 * pricing cards can never drift apart on which photo a vehicle shows.
 */
export function VehicleImage({ vehicle, className }: { vehicle: FleetVehicle; className: string }) {
  return (
    <img
      src={vehicleImg(vehicle)}
      alt={vehicle.name}
      loading="lazy"
      className={className}
      onError={(e) => {
        const t = e.currentTarget
        const step = t.dataset.step
        if (!step && vehicle.number) {
          t.dataset.step = 'jpg'
          t.src = `/images/fleet/fleet-${vehicle.number}.jpg`
        } else if (step !== 'stock') {
          t.dataset.step = 'stock'
          t.src = vehicle.image || IMAGES.hero2
        }
      }}
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

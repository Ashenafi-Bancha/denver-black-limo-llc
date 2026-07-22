import {
  Beer,
  Briefcase,
  Building,
  Bus,
  Calendar,
  Camera,
  Car,
  Clock,
  Crown,
  EyeOff,
  FileText,
  GlassWater,
  GraduationCap,
  Headphones,
  Heart,
  Landmark,
  Luggage,
  MapPin,
  Moon,
  Mountain,
  Music,
  Navigation,
  Plane,
  Radar,
  Route,
  Shield,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Sun,
  Trophy,
  User,
  UserCheck,
  Users,
  Wine,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  plane: Plane,
  luggage: Luggage,
  clock: Clock,
  car: Car,
  crown: Crown,
  'eye-off': EyeOff,
  briefcase: Briefcase,
  user: User,
  building: Building,
  route: Route,
  users: Users,
  'file-text': FileText,
  calendar: Calendar,
  moon: Moon,
  'shopping-bag': ShoppingBag,
  navigation: Navigation,
  mountain: Mountain,
  snowflake: Snowflake,
  sun: Sun,
  heart: Heart,
  bus: Bus,
  sparkles: Sparkles,
  wine: Wine,
  music: Music,
  trophy: Trophy,
  'graduation-cap': GraduationCap,
  beer: Beer,
  camera: Camera,
  landmark: Landmark,
  'glass-water': GlassWater,
  headphones: Headphones,
  shield: Shield,
  'user-check': UserCheck,
  radar: Radar,
  'map-pin': MapPin,
}

export function ServiceIcon({
  name,
  className = 'h-6 w-6',
}: {
  name: string
  className?: string
}) {
  const Icon = iconMap[name] ?? Car
  return <Icon className={className} strokeWidth={1.5} />
}

export function TrustIcon({
  name,
  className = 'h-7 w-7',
}: {
  name: string
  className?: string
}) {
  return <ServiceIcon name={name} className={className} />
}

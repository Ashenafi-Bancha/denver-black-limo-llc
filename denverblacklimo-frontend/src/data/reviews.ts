export type Review = {
  name: string
  quote: string
  avatar: string
}

export const reviews: Review[] = [
  {
    name: 'Josh M.',
    quote:
      'Flawless airport pickup at DIA. The chauffeur tracked our flight, helped with luggage, and the Escalade was immaculate. This is how luxury transportation should feel.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
  },
  {
    name: 'Sarah T.',
    quote:
      'We used Denver Black Limo for our wedding party and corporate guests. Professional, on time, and discreet. The gold-standard service matched our event perfectly.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face',
  },
  {
    name: 'Michael R.',
    quote:
      'Hourly chauffeur for a full day of meetings across Denver and Boulder — flexible, courteous, and always ahead of schedule. Already set up a corporate account.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face',
  },
]

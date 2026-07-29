# Service Images Guide

Save real photos under `public/images/services/`. Missing files fall back to a stock image automatically, so you can add them gradually. Names must end in **.jpeg** (watch the double-extension trap). Hard-refresh (Ctrl+Shift+R) after adding.

---

## 👉 TO DO NOW

> Sub-service counts vary per service (from the client's designs). Counts: #8 Sporting = **8**, #9 Bachelor = **5**, #10 City Tours = **6**, #11 Brewery = **5**, #12 Group = **6**, #13 VIP = **5**. The count each service shows is set in `services.ts`; images just need to match the names below.

**How to add them (step by step):**

1. Open the folder `denverblacklimo-frontend/public/images/services/`.
2. **Section banners** go directly in that folder, named `service-banner-<N>.jpeg` (map below).
3. **Sub-service images** go inside the matching subfolder (e.g. `sporting-events/`) with the exact name.
4. Every filename must end in **`.jpeg`** — nothing after it. On Windows, turn on *View → File name extensions* in Explorer so a name can't secretly become `...jpeg.jpg`.
5. When done (or partway), tell me — I'll **optimize** them all with `sharp` and rebuild/verify.

---

## Section banners — `service-banner-<N>.jpeg`

The 13 per-service hero banners are now loaded by **number**, so they can all use the client's numbered files. (The old per-slug hero files were removed; sub-service images are untouched.)

```
service-banner-1.jpeg    # 1  Airport Transportation
service-banner-2.jpeg    # 2  Private Aviation / FBO Transportation
service-banner-3.jpeg    # 3  Executive & Corporate Transportation
service-banner-4.jpeg    # 4  Hourly Chauffeur Service
service-banner-5.jpeg    # 5  Mountain Resort Transportation
service-banner-6.jpeg    # 6  Wedding Transportation
service-banner-7.jpeg    # 7  Concert & Red Rocks Transportation
service-banner-8.jpeg    # 8  Sporting Event Transportation
service-banner-9.jpeg    # 9  Bachelor & Bachelorette Transportation
service-banner-10.jpeg   # 10 Private City Tours
service-banner-11.jpeg   # 11 Brewery, Winery & Whiskey Tours
service-banner-12.jpeg   # 12 Group Transportation
service-banner-13.jpeg   # 13 VIP & Special Event Transportation
```

> `services-hero.jpeg` (the top Services-page banner) is separate and stays as-is.
> Sub-service images for services **1–7 are already added**; only **8–13** are pending (lists below).

## Sub-service card images (in per-service subfolders)

### images/services/airport-transportation/

```
denver-international-airport.jpeg # Denver International Airport
meet-greet.jpeg                   # Meet & Greet
hotel-transfers.jpeg              # Hotel Transfers
flight-tracking.jpeg              # Flight Tracking
private-airport-pickups.jpeg      # Private Airport Pickups
```

### images/services/private-aviation-fbo/

```
signature-aviation.jpeg           # Signature Aviation
atlantic-aviation.jpeg            # Atlantic Aviation
jsx.jpeg                          # JSX
netjets.jpeg                      # NetJets
flexjet.jpeg                      # Flexjet
private-jet-transfers.jpeg        # Private Jet Transfers
```

### images/services/executive-corporate/

```
corporate-travel.jpeg             # Corporate Travel
roadshows.jpeg                    # Roadshows
meetings-conferences.jpeg         # Meetings & Conferences
executive-transfers.jpeg          # Executive Transfers
corporate-accounts.jpeg           # Corporate Accounts
```

### images/services/hourly-chauffeur/

```
business-hours.jpeg               # Business Hours
evening-night-out.jpeg            # Evening & Night Out
shopping-errands.jpeg             # Shopping & Errands
custom-itineraries.jpeg           # Custom Itineraries
as-directed-service.jpeg          # As-Directed Service
```

### images/services/mountain-resort/

```
vail-beaver-creek.jpeg            # Vail & Beaver Creek
aspen-snowmass.jpeg               # Aspen & Snowmass
breckenridge-keystone.jpeg        # Breckenridge & Keystone
winter-ski-transfers.jpeg         # Winter Ski Transfers
summer-mountain-escapes.jpeg      # Summer Mountain Escapes
```

### images/services/wedding-transportation/

```
bridal-party.jpeg                 # Bridal Party
guest-shuttles.jpeg               # Guest Shuttles
ceremony-to-reception.jpeg        # Ceremony to Reception
getaway-car.jpeg                  # Getaway Car
rehearsal-dinners.jpeg            # Rehearsal Dinners
```

### images/services/concert-red-rocks/

```
red-rocks-amphitheatre.jpeg       # Red Rocks Amphitheatre
ball-arena-downtown.jpeg          # Ball Arena & Downtown
group-concert-rides.jpeg          # Group Concert Rides
festival-transportation.jpeg      # Festival Transportation
private-after-party.jpeg          # Private After-Party
```

### images/services/sporting-events/

```
broncos.jpeg                      # Broncos
nuggets.jpeg                      # Nuggets
avalanche.jpeg                    # Avalanche
rockies.jpeg                      # Rockies
rapids.jpeg                       # Rapids
ball-arena.jpeg                   # Ball Arena
empower-field.jpeg                # Empower Field
coors-field.jpeg                  # Coors Field
```

### images/services/bachelor-bachelorette/

```
bachelor-parties.jpeg             # Bachelor Parties
bachelorette-parties.jpeg         # Bachelorette Parties
night-out.jpeg                    # Night Out
club-transportation.jpeg          # Club Transportation
dinner-transfers.jpeg             # Dinner Transfers
```

### images/services/private-city-tours/

```
denver-city-tours.jpeg            # Denver City Tours
scenic-tours.jpeg                 # Scenic Tours
golden.jpeg                       # Golden
boulder.jpeg                      # Boulder
garden-of-the-gods.jpeg           # Garden of the Gods
rocky-mountain-national-park.jpeg # Rocky Mountain National Park
```

### images/services/brewery-winery-whiskey/

```
brewery-tours.jpeg                # Brewery Tours
winery-tours.jpeg                 # Winery Tours
whiskey-tours.jpeg                # Whiskey Tours
distillery-tours.jpeg             # Distillery Tours
custom-group-tours.jpeg           # Custom Group Tours
```

### images/services/group-transportation/

```
executive-sprinter.jpeg           # Executive Sprinter
shuttle-service.jpeg              # Shuttle Service
mini-coach.jpeg                   # Mini Coach
motor-coach.jpeg                  # Motor Coach
corporate-groups.jpeg             # Corporate Groups
family-groups.jpeg                # Family Groups
```

### images/services/vip-special-events/  (Service 13 — VIP & Special Event Transportation)

Hero: `images/services/vip-special-events.jpeg`

```
vip-transportation.jpeg           # VIP Transportation
talent-transportation.jpeg        # Talent Transportation
celebrity-transportation.jpeg     # Celebrity Transportation
government-transportation.jpeg    # Government Transportation
special-events.jpeg               # Special Events
```

**Total sub-service images: 66**

---

# Service Areas Images — `public/images/service-areas/`

Same numbered scheme as service banners. The top page hero + one banner per area (loaded by number, stock fallback until added).

```
service-areas-hero.jpeg    # top Service Areas page banner
area-banner-1.jpeg         # 1  Denver Metro
area-banner-2.jpeg         # 2  South Denver Metro
area-banner-3.jpeg         # 3  North Denver Metro
area-banner-4.jpeg         # 4  Boulder & Northern Colorado
area-banner-5.jpeg         # 5  Foothills & Mountain Gateway
area-banner-6.jpeg         # 6  Colorado Mountain Resorts
area-banner-7.jpeg         # 7  Colorado Springs & Southern Colorado
area-banner-8.jpeg         # 8  Airports & Private Aviation
area-banner-9.jpeg         # 9  Entertainment, Sports & Luxury Hotels
area-banner-10.jpeg        # 10 Long-Distance & Interstate Travel
```

**Total: 11 images (1 hero + 10 area banners)**

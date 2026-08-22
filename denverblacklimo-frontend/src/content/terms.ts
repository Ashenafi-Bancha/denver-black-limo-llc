/**
 * Reservation Agreement, Terms, Conditions and Cancellation Policies.
 *
 * The client's own wording. This is the website's copy of
 * denverblacklimo-backend/terms.js, which the booking emails render from.
 * Generated from that file; edit both together.
 */

export type TermsBlock =
  | { type: 'p'; text: string }
  | { type: 'sub'; title: string; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'table'; head: [string, string]; rows: [string, string][] }

export interface TermsSection {
  id: string
  title: string
  blocks: TermsBlock[]
}

export const COMPANY = "Denver Black Limo, LLC"
export const DISPATCH = "+1 (720) 499-6744"

/** When the full balance is due, by vehicle class. */
export const PAYMENT_SCHEDULE: [string, string][] = [
  [
    "Sedan / SUV",
    "Time of booking"
  ],
  [
    "Executive Van / Limos",
    "7 days prior to service"
  ],
  [
    "Coach and Charter",
    "14 days prior to service"
  ]
]

/** Notice required to cancel without charge, by service. */
export const CANCELLATION_WINDOWS: [string, string][] = [
  [
    "Airport services",
    "24 hours"
  ],
  [
    "Sedan / SUV (all other trips)",
    "72 hours"
  ],
  [
    "Executive Van / Limos",
    "7 days"
  ],
  [
    "Coach and Charter",
    "14 days"
  ]
]

export const DAMAGE_FEES: [string, string][] = [
  [
    "Smoking in vehicle",
    "$500 + out of service cost"
  ],
  [
    "Vomiting in vehicle",
    "$200 + out of service cost"
  ],
  [
    "Rips, tears, burns",
    "Actual cost to repair + out of service cost"
  ],
  [
    "Broken glassware",
    "$10 per glass/flute, $50 per decanter"
  ],
  [
    "Excessive messes / spills",
    "$200 + out of service cost"
  ],
  [
    "Broken fixtures",
    "Actual cost to repair + out of service cost"
  ]
]

export const PREAMBLE: string[] = [
  "This confirmation is to serve as a plan of services and to notify you of our terms and conditions, listed below. Receipt of this agreement shall constitute agreement and acceptance. In the event you disagree with one or any of the below policies, you must contact us in writing within 24 hours of receipt of this email. By booking services with Denver Black Limo, LLC or its affiliates, you agree to the following terms and conditions:",
  "All communication regarding your reservation(s) will be sent via email. During the first call, our reservation specialist will ask all necessary questions and collect the information required to help ensure a first-class experience. All confirmations are communicated via email. Denver Black Limo, LLC is not responsible if communications end up in a spam folder. It is the responsibility of the booker to check all email boxes and verify the accuracy of all information on this confirmation. Please notify Denver Black Limo, LLC immediately of any incorrect information. This confirmation serves as the primary service agreement. Additional changes and extra services will be communicated via email marked as modified. Payment(s), deposit(s), and receipt(s) will be sent at the time of payment. Additional payment(s) and final receipt(s) will be emailed within 24 hours of completing the reservation."
]

export const SECTIONS: TermsSection[] = [
  {
    "id": "payment",
    "title": "Payment Schedule",
    "blocks": [
      {
        "type": "p",
        "text": "All reservations require immediate payment and/or deposit at the time of booking to secure your reservation. Remainder balances are due following the schedule below. Any changes or additional charges will be processed after the completion of the reservation."
      },
      {
        "type": "table",
        "head": [
          "Service type",
          "Full payment due"
        ],
        "rows": [
          [
            "Sedan / SUV",
            "Time of booking"
          ],
          [
            "Executive Van / Limos",
            "7 days prior to service"
          ],
          [
            "Coach and Charter",
            "14 days prior to service"
          ]
        ]
      }
    ]
  },
  {
    "id": "arrival",
    "title": "On-Time Arrival and Vehicle Comfort",
    "blocks": [
      {
        "type": "p",
        "text": "All chauffeur(s) preplan the trip to ensure on-time arrival to all reservations. Denver Black Limo, LLC, its chauffeur(s), and/or its affiliates shall not be held responsible for late arrival caused by (but not limited to) acts of nature, traffic delays, breakdown, incorrect pickup and drop-off information, and any situation beyond our control. Denver Black Limo, LLC dispatch will notify you immediately via phone call or text message(s) with any updates regarding late arrival(s)."
      },
      {
        "type": "sub",
        "title": "Warm weather conditions",
        "text": "Please note that large vehicles (Sprinters, Limos, Buses, etc.) are built with additional compressors to properly cool down vehicles during hot summer months. These vehicles will cool the inside 20-30 degrees below the outside temperature. When filled with passengers and extremely hot weather/sun is present, the vehicle may feel less cool than expected. We will always make every effort to ensure a comfortable service but will not discount or refund services due to high temperatures."
      }
    ]
  },
  {
    "id": "rate",
    "title": "Rate",
    "blocks": [
      {
        "type": "sub",
        "title": "All-inclusive",
        "text": "The rate you are quoted shall remain the same rate billed except for additional time used and possible additional charges listed below."
      },
      {
        "type": "sub",
        "title": "Gratuity",
        "text": "Chauffeurs are paid an appropriate wage and 100% of the gratuity for the service(s) they perform. If a chauffeur asks for or says they do not get gratuity, please call our office immediately at +1 (720) 499-6744. Additional gratuities for exceptional services are always welcome at the customer's discretion but are not expected."
      },
      {
        "type": "sub",
        "title": "Additional charges",
        "text": "Additional charges may apply for wait times, additional stops, tolls/parking, and damages."
      }
    ]
  },
  {
    "id": "airport-policies",
    "title": "Airport Pick-Up Policies",
    "blocks": [
      {
        "type": "p",
        "text": "Denver Black Limo, LLC will automatically adjust the scheduled pick-up time based on the flight's scheduled arrival. If a plane is delayed significantly, the company will make every effort to arrive upon landing but may be slightly delayed in these cases."
      },
      {
        "type": "sub",
        "title": "Commercial flight tracking",
        "text": "All flights will be tracked via multiple flight tracking software options and your airline's website. Pick-up time for airport arrivals will be adjusted to match the expected flight arrival time. It is the responsibility of the booker to provide accurate flight information. In the event the client changes flights, they must inform Denver Black Limo, LLC immediately or possible wait time/late cancellation fees will be incurred. Denver Black Limo, LLC is not responsible for inaccurate reporting of flight arrival times from any flight tracking software or commercial airline website. Please note that Denver Black Limo, LLC is not responsible for missing any connecting flights and/or major airline cancellations. Rescheduling a new flight and/or date will be considered a new reservation. Denver Black Limo, LLC recommends you purchase travel insurance to protect all your travel."
      },
      {
        "type": "sub",
        "title": "Private flight tracking",
        "text": "All private flight arrivals that have a trackable tail number will be held to the commercial flight tracking policy. Private flight arrivals where no tail number is available, or the tail number is blocked, will have the vehicle staged 15 minutes prior to the flight's scheduled arrival. Wait time after the flight's scheduled arrival will be billed at the standard wait time policy. In order to minimize wait time charges, please update Denver Black Limo, LLC immediately with any known changes to private flight arrival times or possible delays."
      }
    ]
  },
  {
    "id": "airport-procedures",
    "title": "Airport Pick-Up Procedures",
    "blocks": [
      {
        "type": "p",
        "text": "Shortly after the plane arrives at the gate, please expect a text from the chauffeur providing you with direction to our designated pick-up location at the airport. In the event the passenger is unable to contact or locate the chauffeur, immediately call dispatch at +1 (720) 499-6744."
      },
      {
        "type": "sub",
        "title": "DEN (Curbside)",
        "text": "Once contact between passenger(s) and chauffeur is made. Upon exiting the plane, please follow signs to Main Terminal and Baggage Claim. Please note that this may require you to take a tram to Main Terminal and Baggage Claim. Chauffeur(s) stage outside of baggage claim 16 West Terminal Door 506 island 2 with a sign with the passenger's name on it or outside of baggage claim 6 East Terminal Door 511 island 2 with a sign with the passenger's name on it. In the event the passenger is unable to locate the chauffeur, immediately call dispatch at +1 (720) 499-6744."
      },
      {
        "type": "sub",
        "title": "DEN (Inside Meet and Greet)",
        "text": "This service has an additional charge. Upon landing, the passenger should follow the airport signs to Main Terminal and Baggage Claim. This process may require passenger(s) to take the train. After departing the train at the main terminal, the passenger will follow the escalators/elevators up and depart the secure area. Directly outside the secure area, a greeter will be holding a name sign for the passenger. The greeter will escort the passenger through the airport, to baggage claim, and to their chauffeur. In the event the passenger is unable to locate the greeter, immediately call dispatch at +1 (720) 499-6744."
      },
      {
        "type": "sub",
        "title": "COS",
        "text": "Upon landing, the passenger should follow airport signage to baggage claim. The chauffeur will be standing at the bottom of the escalators, next to baggage claim, with a name sign. In the event the passenger is unable to contact and locate the chauffeur, immediately call dispatch at +1 (720) 499-6744."
      },
      {
        "type": "sub",
        "title": "Other airports",
        "text": "Please note that each airport is different. Passenger(s) pick-up locations may change; however, our procedure does not. Upon arriving at the gate, expect a text from the chauffeur providing a designated pick-up location. This could be inside at baggage claim or curbside, airport permitting. In the event the passenger is unable to contact and locate the chauffeur, immediately call dispatch at +1 (720) 499-6744."
      },
      {
        "type": "sub",
        "title": "FBO's",
        "text": "Chauffeur(s) will pick up passenger(s) on the tarmac plane-side at all fixed-base operators whenever available. Please note that certain FBOs have regulations regarding vehicle entrance onto the tarmac that Denver Black Limo, LLC has no control over. Chauffeurs will follow the pick-up procedure provided to them by the specific FBO."
      }
    ]
  },
  {
    "id": "deposits",
    "title": "Deposit, Payments and Cancellation Policies",
    "blocks": [
      {
        "type": "sub",
        "title": "Deposit and payment",
        "text": "All airport and FBO pick-up reservations require full payment at time of booking to secure your reservation. All other reservations require a 50% deposit at time of booking. All deposits paid to Denver Black Limo, LLC are non-refundable. Deposits are taken dependent on the type of service, payment method, and total amount to be billed for services. If a reservation requires a deposit, the service is not considered confirmed until the deposit has been paid. Your confirmation will be noted with your deposit schedule."
      },
      {
        "type": "table",
        "head": [
          "Service type",
          "Full payment due"
        ],
        "rows": [
          [
            "Sedan / SUV",
            "Time of booking"
          ],
          [
            "Executive Van / Limos",
            "7 days prior to service"
          ],
          [
            "Coach and Charter",
            "14 days prior to service"
          ]
        ]
      },
      {
        "type": "sub",
        "title": "Cancellation policy",
        "text": ""
      },
      {
        "type": "bullets",
        "items": [
          "24-hour cancellation notice required for all airport services",
          "Denver Black Limo, LLC is not responsible for missing any connecting flights",
          "Denver Black Limo, LLC is not responsible for any major airline cancellations. Denver Black Limo, LLC recommends you purchase travel insurance to protect all your travel",
          "All other reservations in sedan and/or SUV require 72 hours cancellation",
          "Executive Van and Limos require 7 days cancellation notice",
          "Coach and Charter require 14 days cancellation notice",
          "All deposits are not refundable",
          "Failure to notify Denver Black Limo, LLC will result in full charge",
          "It is the responsibility of the booker, 3rd party, and/or passenger to comply with all cancellation policies",
          "Denver Black Limo, LLC and its affiliates are not liable in the event of mechanical breakdown while en route and/or during charter and will only be responsible for making up lost time at a mutually agreed date. No refund will be issued",
          "Denver Black Limo, LLC is not responsible for delays or the termination in winter caused by unsafe road conditions (i.e., not salted, accidents, road closures, etc.)"
        ]
      },
      {
        "type": "sub",
        "title": "Late cancellations",
        "text": "Late cancellations are considered any cancellation made after the allotted cancellation period. Full charges will be billed in the event of late cancellations. In the event that no cancellation was made, and the chauffeur is on location, the vehicle will wait up to 30 minutes without contact before being considered a late cancellation. If the chauffeur or dispatch team is unable to make contact with passenger(s) within 30 minutes of the scheduled pick-up time (without prior arrangements), the vehicle will be released and full charges will be due."
      }
    ]
  },
  {
    "id": "billing",
    "title": "Wait Time, Hourly Services, Stops and Extras",
    "blocks": [
      {
        "type": "sub",
        "title": "Wait time",
        "text": "Wait time is billed for any wait time after the scheduled pick-up time in 15-minute increments at the vehicle's standard hourly rate. Wait time shall not apply to hourly services as hourly billing commences at the scheduled pick-up time. Wait time for commercial airport pick-ups commences 30 minutes after gate arrival for domestic flights and 1 hour for international flights."
      },
      {
        "type": "sub",
        "title": "Hourly services",
        "text": "Hourly services are billed from the scheduled pick-up time until the final drop-off time, or the vehicle's minimum number of hours, whichever is greater. Hourly services will be billed in full for the total number of hours reserved regardless of usage. Hourly services that start or end outside of the home operating area will be charged garage-to-garage."
      },
      {
        "type": "sub",
        "title": "Stops",
        "text": "There are no stop charges on hourly services. Stop charges apply on point-to-point, direct, and airport transfers. Stop charges include up to 15 minutes at the respective stop. Stops exceeding 15 minutes may incur wait time or cause services to be converted to an hourly charter. Mileage fees may apply if stops are out of the most direct route of the transfer. One 15-minute courtesy stop is provided on trips exceeding 90 minutes."
      },
      {
        "type": "sub",
        "title": "Tolls and parking",
        "text": "Tolls and parking are billed based on actual usage and necessity."
      },
      {
        "type": "sub",
        "title": "Bar stock",
        "text": "In the event the client wishes to have additional amenities stocked in the vehicle that are not regularly provided, Denver Black Limo, LLC may be able to provide such items. Please note that the bar stock fee covers the cost of the item plus an additional surcharge for time and resources spent purchasing said item."
      }
    ]
  },
  {
    "id": "damage",
    "title": "Damage Policy",
    "blocks": [
      {
        "type": "p",
        "text": "By receipt of this confirmation, you agree to be liable for any damages you (the client) or any passenger(s) make to any vehicle during charter, including but not limited to smoking in the vehicles, vomiting in vehicle, excessive spills/messes, burns, tears, broken glassware, etc. In the event of damages, you agree to pay the following charges associated with such damages:"
      },
      {
        "type": "table",
        "head": [
          "Damage",
          "Charge"
        ],
        "rows": [
          [
            "Smoking in vehicle",
            "$500 + out of service cost"
          ],
          [
            "Vomiting in vehicle",
            "$200 + out of service cost"
          ],
          [
            "Rips, tears, burns",
            "Actual cost to repair + out of service cost"
          ],
          [
            "Broken glassware",
            "$10 per glass/flute, $50 per decanter"
          ],
          [
            "Excessive messes / spills",
            "$200 + out of service cost"
          ],
          [
            "Broken fixtures",
            "Actual cost to repair + out of service cost"
          ]
        ]
      }
    ]
  },
  {
    "id": "conduct",
    "title": "Alcohol, Intoxication and Behavior Policy",
    "blocks": [
      {
        "type": "p",
        "text": "In the event any passenger(s) do not follow the below policies, services may be terminated immediately without notice. Dependent on the severity of the infraction, passenger(s) may be dropped off at the nearest safe location or police station. If the chauffeur feels that the action(s) of any passenger is an immediate threat to the safety of any person or property, the chauffeur will call the police for assistance. Terminated services are billable in full and no refund will be made."
      },
      {
        "type": "sub",
        "title": "Minors",
        "text": "Alcohol will not be provided and will not be allowed in a vehicle where minors are riding, even if certain passengers are over the age of 21."
      },
      {
        "type": "sub",
        "title": "Intoxication",
        "text": "Denver Black Limo, LLC is committed to providing a safe and enjoyable experience during every occasion, including ones where passengers may consume alcohol. To ensure the safety of all passengers, the chauffeur, and property, passengers will not be permitted to enter the vehicle, or will be asked to exit the vehicle, in the event they have become overly intoxicated to the point of being belligerent, sick, or unable to walk by themselves. This decision will be made at the discretion of the chauffeur on duty and management."
      },
      {
        "type": "sub",
        "title": "Behavior",
        "text": "For the safety of all passengers, the chauffeur, and the vehicle, the following behaviors are not permitted while in the vehicle:"
      },
      {
        "type": "bullets",
        "items": [
          "Smoking of any kind (to include e-cigarettes and vape options)",
          "Standing while the vehicle is in motion",
          "Putting body parts or foreign objects out any windows or sunroofs",
          "Aggressive behavior (including, but not limited to yelling, excessive arguments, fighting, threatening, etc.)",
          "Throwing items",
          "Being destructive towards property or the vehicle itself",
          "Creating excessive messes and spills",
          "Obstructing the chauffeur's ability to drive safely",
          "Any actions that break a local, state, or federal law"
        ]
      }
    ]
  },
  {
    "id": "agreement",
    "title": "Agreement",
    "blocks": [
      {
        "type": "bullets",
        "items": [
          "Denver Black Limo, LLC, its subsidiaries, and its affiliates shall not be held responsible for late arrival caused by (but not limited to) acts of nature, traffic delays, breakdown, incorrect pickup and drop-off information, and any situation beyond our control",
          "Denver Black Limo, LLC reserves the right to terminate services without notice, prior to the scheduled pick-up time, in the event the weather would provide unsafe road conditions for the vehicle to be able to safely transport passengers. In the event of unsafe road conditions, Denver Black Limo, LLC will make every effort to provide a replacement vehicle with similar seating capacity for the service",
          "Denver Black Limo, LLC reserves the right to subcontract services out to other licensed and insured ground transportation providers without notice to the client",
          "Denver Black Limo, LLC is not responsible for items left in the vehicle. Chauffeur(s) will walk through the vehicle to make sure that no items are left behind at the end of the service",
          "By receipt of this confirmation, your acceptance of these terms and conditions is bound. As the booking party, you agree to be responsible for all charges associated with this service, regardless of whether you are on board the vehicle. You also agree to have all standard charges, additional fees, and damages charged to the card on file"
        ]
      }
    ]
  }
]

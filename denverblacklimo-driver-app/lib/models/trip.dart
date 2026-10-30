/// A trip as the driver app sees it.
///
/// Every field is parsed defensively, because this API is older than this app
/// and its types are not what Dart would assume:
///
///   * `pickup_date` is `VARCHAR`, not a date, and `pickup_time` is a plain
///     string. Either can be empty or malformed on an old record.
///   * Postgres `NUMERIC` columns arrive as strings — `"95.00"`, never `95.0`.
///   * Anything optional can be `null`, including fields that are always
///     present on newer bookings.
///
/// Nothing here casts; everything converts. A single bad row must not take the
/// driver's whole schedule down with it.
class Trip {
  Trip({
    required this.id,
    required this.reference,
    required this.status,
    required this.serviceType,
    required this.pickupDate,
    required this.pickupTime,
    required this.pickupAt,
    required this.pickupLocation,
    required this.dropoffLocation,
    required this.passengerName,
    required this.passengerPhone,
    required this.passengers,
    required this.luggage,
    required this.vehicle,
    required this.additionalStops,
    required this.airlineName,
    required this.flightNumber,
    required this.terminal,
    required this.airportDirection,
    required this.specialRequests,
    required this.dispatchNotes,
    required this.pay,
    required this.driverStatus,
    required this.statusAt,
    required this.arrivedAt,
  });

  final String id;
  final String reference;
  final String status;
  final String serviceType;

  /// As stored: "2026-12-20". Kept as text because that is what it is.
  final String pickupDate;

  /// As stored: "18:03".
  final String pickupTime;

  /// The server's computed timestamp, when it could compute one.
  final DateTime? pickupAt;

  final String pickupLocation;
  final String dropoffLocation;
  final String passengerName;
  final String passengerPhone;
  final String passengers;
  final String luggage;
  final String vehicle;
  final String additionalStops;
  final String airlineName;
  final String flightNumber;
  final String terminal;
  final String airportDirection;
  final String specialRequests;
  final String dispatchNotes;

  /// Free text — "$140 flat", "70%", "as agreed" — never a number.
  final String pay;

  /// Where the trip has got to: one of TripStatus.values, or empty if the
  /// driver has not pressed anything yet.
  final String driverStatus;
  final DateTime? statusAt;

  /// When the car reached the pick-up. The one timestamp wait time is billed
  /// from, which is why the server never moves it once set.
  final DateTime? arrivedAt;

  static String _str(dynamic v) => v == null ? '' : v.toString().trim();

  static DateTime? _date(dynamic v) {
    if (v == null) return null;
    return DateTime.tryParse(v.toString())?.toLocal();
  }

  factory Trip.fromJson(Map<String, dynamic> j) => Trip(
        id: _str(j['id']),
        reference: _str(j['reference']),
        status: _str(j['status']),
        serviceType: _str(j['service_type']),
        pickupDate: _str(j['pickup_date']),
        pickupTime: _str(j['pickup_time']),
        pickupAt: _date(j['pickup_at']),
        pickupLocation: _str(j['pickup_location']),
        dropoffLocation: _str(j['dropoff_location']),
        passengerName: _str(j['passenger_name']),
        passengerPhone: _str(j['passenger_phone']),
        passengers: _str(j['passengers']),
        luggage: _str(j['luggage']),
        vehicle: _str(j['vehicle_preference']),
        additionalStops: _str(j['additional_stops']),
        airlineName: _str(j['airline_name']),
        flightNumber: _str(j['flight_number']),
        terminal: _str(j['terminal']),
        airportDirection: _str(j['airport_direction']),
        specialRequests: _str(j['special_requests']),
        dispatchNotes: _str(j['driver_notes']),
        pay: _str(j['driver_pay']),
        driverStatus: _str(j['driver_status']),
        statusAt: _date(j['driver_status_at']),
        arrivedAt: _date(j['driver_arrived_at']),
      );

  /// Finished, one way or the other — nothing further to press.
  bool get isClosed => driverStatus == 'dropped_off' || driverStatus == 'no_show';

  /// How long the car has been waiting. What the free wait window in the
  /// reservation agreement is measured against.
  Duration? waitingFor(DateTime now) {
    if (arrivedAt == null) return null;
    if (driverStatus == 'on_board' || isClosed) return null;
    return now.difference(arrivedAt!);
  }

  bool get isAirport =>
      airlineName.isNotEmpty ||
      flightNumber.isNotEmpty ||
      serviceType.toLowerCase().contains('airport');

  bool get isArrival => isAirport && airportDirection.toLowerCase().contains('arriv');

  String get flightLabel => [airlineName, flightNumber].where((s) => s.isNotEmpty).join(' ');

  /// What the chauffeur should be there by: fifteen minutes before pick-up,
  /// the same rule the dispatch email has always used.
  DateTime? get spotTime => pickupAt?.subtract(const Duration(minutes: 15));

  /// The name board, matching the trip sheet: the passenger's surname.
  String get signName {
    final parts = passengerName.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    return parts.isEmpty ? '' : parts.last.toUpperCase();
  }

  /// Opens in whichever map app the driver prefers.
  Uri get mapsUri => Uri.parse(
        'https://www.google.com/maps/dir/?api=1'
        '&origin=${Uri.encodeComponent(pickupLocation)}'
        '&destination=${Uri.encodeComponent(dropoffLocation)}',
      );
}

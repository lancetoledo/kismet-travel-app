// File: /types/Flight.ts

export interface Flight {
    id: string;
    price: number;
    itineraries: Itinerary[];
    airlines: string[];
    booking_token: string;
  }
  
  export interface Itinerary {
    departure_time: string;
    arrival_time: string;
    duration: string;
    segments: Segment[];
  }
  
  export interface Segment {
    carrierCode: string;
    flightNumber: string;
    departureAirport: string;
    departureTime: string;
    arrivalAirport: string;
    arrivalTime: string;
    logoUrl?: string; // Made optional in case some components don't use it
  }
  
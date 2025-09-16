

export interface ItineraryItem {
    id: string;
    name: string;
    description: string;
    time: string;
    lat: number;
    lng: number;
    transport: 'walk' | 'metro' | 'bus' | 'taxi' | 'start' | 'car';
    category: 'activity' | 'landmark' | 'restaurant' | 'lodging' | 'shop' | 'other';
    travelTime?: string;
    imageUrl?: string;
}

export interface TripPlan {
    id: string;
    name: string;
    city: string;
    itinerary: ItineraryItem[];
}

export interface SearchResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  // FIX: Add optional boundingbox to support city selection with bounds
  boundingbox?: [string, string, string, string];
}
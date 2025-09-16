

export interface ItineraryItem {
    id: string;
    name: string;
    description: string;
    time: string;
    lat: number;
    lng: number;
    transport: 'walk' | 'metro' | 'bus' | 'taxi' | 'start' | 'car';
    category: 'activity' | 'landmark' | 'restaurant' | 'lodging' | 'other';
    travelTime?: string;
}

export interface TripPlan {
    id: string;
    name: string;
    city: string;
    itinerary: ItineraryItem[];
}
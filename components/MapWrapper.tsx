import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ItineraryItem } from '../types';

interface MapWrapperProps {
    itinerary: ItineraryItem[];
    onMarkerClick: (itemId: string | null) => void;
    selectedItemId: string | null;
}

// Function to get polyline color based on transport mode
const getPolylineColor = (transport: ItineraryItem['transport']): string => {
    switch (transport) {
        case 'walk': return '#28a745'; // Green
        case 'metro': case 'bus': return '#007bff'; // Blue
        case 'taxi': case 'car': return '#dc3545'; // Red
        default: return '#6c757d'; // Gray for 'start' or others
    }
};

const getCategoryColors = (category: ItineraryItem['category']): { base: string; selected: string; ring: string } => {
    switch (category) {
        case 'restaurant':
            return { base: 'bg-orange-500', selected: 'bg-orange-600', ring: 'ring-orange-300' };
        case 'landmark':
            return { base: 'bg-purple-500', selected: 'bg-purple-600', ring: 'ring-purple-300' };
        case 'activity':
            return { base: 'bg-amber-500', selected: 'bg-amber-600', ring: 'ring-amber-300' };
        case 'lodging':
            return { base: 'bg-green-500', selected: 'bg-green-600', ring: 'ring-green-300' };
        default: // other
            return { base: 'bg-gray-500', selected: 'bg-gray-600', ring: 'ring-gray-300' };
    }
};

const getCategoryIconSvg = (category: ItineraryItem['category']): string => {
    const commonProps = `width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    switch (category) {
        case 'activity':
            return `<svg ${commonProps}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        case 'landmark': // New camera icon
            return `<svg ${commonProps}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>`;
        case 'restaurant': // New fork and knife icon
            return `<svg ${commonProps}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2l-3 3-3-3v13h6Z" /></svg>`;
        case 'lodging':
            return `<svg ${commonProps}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
        default: // 'other'
            return `<svg ${commonProps}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    }
};

const MapWrapper: React.FC<MapWrapperProps> = ({ itinerary, onMarkerClick, selectedItemId }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const layerGroup = useRef<L.LayerGroup | null>(null);

    // Initialize map
    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, {
                center: [48.8566, 2.3522], // Default to Paris
                zoom: 12,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance.current);
            
            layerGroup.current = L.layerGroup().addTo(mapInstance.current);
        }
    }, []);

    // Update map when itinerary changes
    useEffect(() => {
        if (!mapInstance.current || !layerGroup.current) return;

        // Clear previous layers
        layerGroup.current.clearLayers();
        const markers: L.Marker[] = [];

        if (itinerary.length > 0) {
            // Add new markers and polylines
            itinerary.forEach((item, index) => {
                const isSelected = item.id === selectedItemId;

                // Create custom icon
                const categoryIconSvg = getCategoryIconSvg(item.category);
                
                const { base, selected, ring } = getCategoryColors(item.category);
                
                const markerClasses = isSelected
                    ? `${selected} ring-4 ${ring} scale-110 marker-pulse`
                    : base;

                const iconHtml = `
                    <div class="relative">
                        <div class="absolute -top-1.5 -right-1.5 flex items-center justify-center h-6 w-6 bg-gray-800 text-white text-xs font-bold rounded-full border-2 border-white z-10">
                            ${index + 1}
                        </div>
                        <div class="flex items-center justify-center w-11 h-11 rounded-full text-white shadow-lg transition-all duration-200 ease-in-out transform ${markerClasses}">
                            ${categoryIconSvg}
                        </div>
                    </div>
                `;
                const customIcon = L.divIcon({
                    html: iconHtml,
                    className: '', // important to clear default leaflet styles
                    iconSize: [52, 52], // Approximate size to contain the element and its badge
                    iconAnchor: [22, 44], // bottom-center of the main circle
                    popupAnchor: [4, -48] // adjusted for new anchor
                });
                
                const marker = L.marker([item.lat, item.lng], { 
                    icon: customIcon,
                    zIndexOffset: isSelected ? 1000 : 0
                }).addTo(layerGroup.current!);

                marker.bindPopup(`<b>${item.name}</b><br>${item.description}`);
                marker.on('click', () => {
                    onMarkerClick(isSelected ? null : item.id);
                });
                
                if (isSelected) {
                    marker.openPopup();
                }
                markers.push(marker);
            });
            
            // Draw route for each leg
            for (let i = 0; i < itinerary.length - 1; i++) {
                const startPoint = L.latLng(itinerary[i].lat, itinerary[i].lng);
                const endPoint = L.latLng(itinerary[i + 1].lat, itinerary[i + 1].lng);
                
                const polyline = L.polyline([startPoint, endPoint], {
                    color: getPolylineColor(itinerary[i + 1].transport),
                    weight: 5,
                    opacity: 0.8
                });
                polyline.addTo(layerGroup.current);
            }

            // Fit map to bounds
            if (markers.length > 0) {
                const featureGroup = L.featureGroup(markers);
                mapInstance.current.fitBounds(featureGroup.getBounds(), { padding: [50, 50] });
            }

        } else {
            // Reset to default view if itinerary is cleared
            mapInstance.current.setView([48.8566, 2.3522], 12);
        }

    }, [itinerary, selectedItemId, onMarkerClick]);

    return <div ref={mapRef} className="h-full w-full z-10" />;
};

export default MapWrapper;
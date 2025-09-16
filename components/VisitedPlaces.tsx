import React from 'react';
import { HistoryIcon, TrashIcon, MapPinIcon, PlusCircleIcon } from './Icons';

interface VisitedPlacesProps {
    isOpen: boolean;
    onClose: () => void;
    visitedPlaces: { [city: string]: string[] };
    onManage: (action: 'delete_one' | 'clear_city', city: string, placeName?: string) => void;
    onAddToItinerary: (placeName: string) => void;
    isTripActive: boolean;
}

const VisitedPlaces: React.FC<VisitedPlacesProps> = ({ isOpen, onClose, visitedPlaces, onManage, onAddToItinerary, isTripActive }) => {
    if (!isOpen) return null;

    const cities = Object.keys(visitedPlaces);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={onClose}
        >
            <div 
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex justify-between items-center border-b">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <HistoryIcon className="h-7 w-7 text-blue-600"/>
                        My Visited Places
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
                    {cities.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-500">You haven't marked any places as visited yet.</p>
                            <p className="text-gray-400 text-sm mt-2">When you suggest an alternative for an activity in your itinerary, the original one will be saved here.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cities.map(city => (
                                <div key={city} className="bg-gray-50 border rounded-lg p-4">
                                     <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                            <MapPinIcon className="h-5 w-5 text-gray-500" />
                                            {city}
                                        </h3>
                                        <button 
                                            onClick={() => onManage('clear_city', city)}
                                            className="text-xs text-red-500 hover:text-red-700 font-semibold"
                                        >
                                            Clear All
                                        </button>
                                     </div>
                                    <ul className="space-y-2">
                                        {visitedPlaces[city].map(place => (
                                            <li key={place} className="flex justify-between items-center bg-white p-2 rounded-md border">
                                                <span className="text-gray-700 flex-grow mr-2">{place}</span>
                                                <div className="flex items-center flex-shrink-0">
                                                    <div title={isTripActive ? "Add to current trip" : "You must have an active itinerary to add a place."}>
                                                        <button 
                                                            onClick={() => onAddToItinerary(place)}
                                                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                                            aria-label={`Add ${place} to trip`}
                                                            disabled={!isTripActive}
                                                        >
                                                            <PlusCircleIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        onClick={() => onManage('delete_one', city, place)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                                        aria-label={`Remove ${place}`}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisitedPlaces;


import React from 'react';
import { TripPlan } from '../types';
import { FolderIcon, TrashIcon, MapPinIcon } from './Icons';

interface SavedTripsProps {
    isOpen: boolean;
    onClose: () => void;
    savedTrips: TripPlan[];
    onLoad: (trip: TripPlan) => void;
    onDelete: (tripId: string) => void;
}

const SavedTrips: React.FC<SavedTripsProps> = ({ isOpen, onClose, savedTrips, onLoad, onDelete }) => {
    if (!isOpen) return null;

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
                        <FolderIcon className="h-7 w-7 text-blue-600"/>
                        My Saved Trips
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
                    {savedTrips.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-500">You have no saved trips yet.</p>
                            <p className="text-gray-400 text-sm">Plan a trip and click "Save Trip" to see it here.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {savedTrips.map(trip => (
                                <li key={trip.id} className="bg-gray-50 border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">{trip.name}</h3>
                                            <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                                                <MapPinIcon className="h-4 w-4 text-gray-400" />
                                                {trip.city}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => onLoad(trip)}
                                                className="px-4 py-1.5 bg-blue-500 text-white text-sm font-semibold rounded-full hover:bg-blue-600 transition"
                                            >
                                                Load
                                            </button>
                                            <button 
                                                onClick={() => onDelete(trip.id)}
                                                className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"
                                                aria-label="Delete trip"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SavedTrips;

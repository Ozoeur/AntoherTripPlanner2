import React, { useState, useEffect, useRef } from 'react';
import { ItineraryItem, SearchResult } from '../types';
import AutocompleteInput from './AutocompleteInput';
import { PlusCircleIcon } from './Icons';

interface AddStopPanelProps {
    onSave: (newItem: Omit<ItineraryItem, 'id' | 'travelTime' | 'imageUrl' | 'transport'>) => void;
    onCancel: () => void;
    onSearchResultsChange: (results: SearchResult[]) => void;
    onSearchResultSelect: (result: SearchResult) => void;
    searchBounds: [string, string, string, string] | null;
    selectedSearchResult: SearchResult | null;
    onClearSelection: () => void;
    cityContext: string;
    isSaving: boolean;
}

const AddStopPanel: React.FC<AddStopPanelProps> = ({ onSave, onCancel, onSearchResultsChange, onSearchResultSelect, searchBounds, selectedSearchResult, onClearSelection, cityContext, isSaving }) => {
    const [name, setName] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<ItineraryItem['category']>('landmark');
    const locationInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (selectedSearchResult) {
            setName(selectedSearchResult.name);
        }
    }, [selectedSearchResult]);

    useEffect(() => {
        // Auto-focus the location input when the panel appears
        const timer = setTimeout(() => {
            locationInputRef.current?.focus();
        }, 100); // Small delay for smooth transition
        return () => clearTimeout(timer);
    }, []);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSearchResult && time) {
            onSave({
                name: selectedSearchResult.name,
                lat: selectedSearchResult.lat,
                lng: selectedSearchResult.lng,
                time,
                description,
                category,
            });
        } else {
            alert("Please select a valid location from the search results and provide a time.");
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (selectedSearchResult && newName !== selectedSearchResult.name) {
            onClearSelection();
        }
        if (newName.length < 3) {
            onSearchResultsChange([]);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-2 pointer-events-none md:w-1/3 md:left-auto md:relative md:p-0 md:pointer-events-auto md:top-0 md:bottom-auto">
            <div className="bg-white rounded-t-2xl shadow-xl p-4 w-full pointer-events-auto h-[50vh] flex flex-col md:h-full md:rounded-none md:shadow-none">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 flex-shrink-0"></div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 flex-shrink-0">
                    <PlusCircleIcon className="h-6 w-6 text-blue-600"/>
                    Add a New Stop
                </h2>
                
                <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                    <div className="space-y-4 flex-grow overflow-y-auto pr-2 pb-2">
                        <div>
                            <label htmlFor="location" className="block text-gray-700 font-semibold mb-1">Location</label>
                             <AutocompleteInput
                                ref={locationInputRef}
                                value={name}
                                onChange={handleNameChange}
                                onSelect={({ id, name, lat, lng }) => {
                                    const result: SearchResult = { id, name, lat, lng };
                                    onSearchResultSelect(result);
                                }}
                                onResultsChange={onSearchResultsChange}
                                viewbox={searchBounds}
                                cityContext={cityContext}
                                placeholder="Search for a place..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="time" className="block text-gray-700 font-semibold mb-1">Time</label>
                            <input
                                type="text" id="time" value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 14:30" required
                            />
                        </div>

                         <div>
                            <label htmlFor="category" className="block text-gray-700 font-semibold mb-1">Category</label>
                            <select
                                id="category" value={category}
                                onChange={(e) => setCategory(e.target.value as ItineraryItem['category'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="landmark">Landmark</option>
                                <option value="activity">Activity</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="shop">Shop</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-gray-700 font-semibold mb-1">Description <span className="font-normal text-gray-500">(Optional)</span></label>
                            <textarea
                                id="description" value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="A short note about this stop."
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4 pt-4 border-t flex-shrink-0">
                        <button type="button" onClick={onCancel} className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={!selectedSearchResult || isSaving} className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex justify-center items-center min-w-[160px]">
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    <span>Adding...</span>
                                </>
                            ) : (
                                'Add to Itinerary'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStopPanel;
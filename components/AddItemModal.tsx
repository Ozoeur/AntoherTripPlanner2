import React, { useState, useEffect, useRef } from 'react';
import { ItineraryItem, SearchResult } from '../types';
import AutocompleteInput from './AutocompleteInput';
import { PlusCircleIcon, XIcon } from './Icons';

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
        // Auto-focus the location input when the panel appears
        const timer = setTimeout(() => {
            locationInputRef.current?.focus();
        }, 100); // Small delay for smooth transition
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (selectedSearchResult) {
            setName(selectedSearchResult.name);
        } else {
            // setName(''); // Commented out to avoid clearing user input when selection is lost
        }
    }, [selectedSearchResult]);


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
        // If the user types something new, clear the previously selected result.
        if (selectedSearchResult && newName !== selectedSearchResult.name) {
            onClearSelection();
        }
    };
    
    const handleSelect = ({ id, name, lat, lng }: { id: string; name: string; lat: number; lng: number; }) => {
        const result: SearchResult = { id, name, lat, lng };
        onSearchResultSelect(result);
        setName(name); // Directly set the name here
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-2 pointer-events-none md:w-1/3 md:left-auto md:relative md:p-0 md:pointer-events-auto md:top-0 md:bottom-auto">
            <div className="bg-white rounded-t-2xl shadow-xl px-3 pt-3 pb-20 md:p-3 w-full pointer-events-auto h-[50vh] flex flex-col md:h-full md:rounded-none md:shadow-none border-t border-gray-200">
                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <PlusCircleIcon className="h-6 w-6 text-blue-600"/>
                        Add a New Stop
                    </h2>
                     <button 
                        type="button" 
                        onClick={onCancel}
                        className="p-2 -mr-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors md:hidden"
                        aria-label="Close"
                    >
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                    <div className="space-y-2 flex-grow pb-2 overflow-y-auto">
                        <div>
                            <label htmlFor="location" className="block text-gray-700 font-semibold mb-1">Location</label>
                             <AutocompleteInput
                                ref={locationInputRef}
                                value={name}
                                onChange={handleNameChange}
                                onSelect={handleSelect}
                                onResultsChange={onSearchResultsChange}
                                viewbox={searchBounds}
                                cityContext={cityContext}
                                placeholder="Search for a place..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        
                        <div className="flex gap-3">
                            <div className="w-1/2">
                                <label htmlFor="time" className="block text-gray-700 font-semibold mb-1">Time</label>
                                <input
                                    type="text" id="time" value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 14:30" required
                                />
                            </div>

                            <div className="w-1/2">
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
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-gray-700 font-semibold mb-1">Description <span className="font-normal text-gray-500">(Optional)</span></label>
                            <textarea
                                id="description" value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="A short note about this stop."
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 mt-2 pt-2 border-t flex-shrink-0">
                        <button type="button" onClick={onCancel} className="hidden md:block px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={!selectedSearchResult || isSaving} className="w-full md:w-auto px-6 py-3 md:py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex justify-center items-center min-w-[160px]">
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
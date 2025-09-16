import React, { useState, useEffect } from 'react';
import { ItineraryItem, SearchResult } from '../types';
import AutocompleteInput from './AutocompleteInput';
import { PlusCircleIcon } from './Icons';

interface AddStopPanelProps {
    onSave: (newItem: Omit<ItineraryItem, 'id' | 'travelTime' | 'imageUrl'>) => void;
    onCancel: () => void;
    onSearchResultsChange: (results: SearchResult[]) => void;
    onSearchResultSelect: (result: SearchResult) => void;
    searchBounds: [string, string, string, string] | null;
    selectedSearchResult: SearchResult | null;
    onClearSelection: () => void;
    cityContext: string;
}

const AddStopPanel: React.FC<AddStopPanelProps> = ({ onSave, onCancel, onSearchResultsChange, onSearchResultSelect, searchBounds, selectedSearchResult, onClearSelection, cityContext }) => {
    const [name, setName] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [transport, setTransport] = useState<ItineraryItem['transport']>('car');
    const [category, setCategory] = useState<ItineraryItem['category']>('landmark');
    
    useEffect(() => {
        if (selectedSearchResult) {
            setName(selectedSearchResult.name);
        }
    }, [selectedSearchResult]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSearchResult && time && description) {
            onSave({
                name: selectedSearchResult.name,
                lat: selectedSearchResult.lat,
                lng: selectedSearchResult.lng,
                time,
                description,
                transport,
                category,
            });
        } else {
            alert("Please select a valid location from the search results and fill out all fields.");
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
        <div className="p-4 h-full flex flex-col bg-white">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PlusCircleIcon className="h-7 w-7 text-blue-600"/>
                Add a New Stop
            </h2>
            
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="location" className="block text-gray-700 font-semibold mb-1">Location</label>
                         <AutocompleteInput
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
                        <label htmlFor="transport" className="block text-gray-700 font-semibold mb-1">Transport</label>
                        <select
                            id="transport" value={transport}
                            onChange={(e) => setTransport(e.target.value as ItineraryItem['transport'])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="car">Car</option>
                            <option value="taxi">Taxi</option>
                            <option value="walk">Walk</option>
                            <option value="metro">Metro</option>
                            <option value="bus">Bus</option>
                        </select>
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
                        <label htmlFor="description" className="block text-gray-700 font-semibold mb-1">Description</label>
                        <textarea
                            id="description" value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="A short note about this stop." required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-4 pt-4 border-t">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={!selectedSearchResult} className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                        Add to Itinerary
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddStopPanel;
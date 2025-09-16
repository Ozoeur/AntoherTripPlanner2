import React, { useState, useEffect, useRef } from 'react';
import { ItineraryItem } from '../types';
import AutocompleteInput from './AutocompleteInput';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newItem: Omit<ItineraryItem, 'id'>) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [transport, setTransport] = useState<ItineraryItem['transport']>('car');
    const [category, setCategory] = useState<ItineraryItem['category']>('landmark');

    const resetState = () => {
        setName('');
        setLat(null);
        setLng(null);
        setTime('');
        setDescription('');
        setTransport('car');
        setCategory('landmark');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && lat !== null && lng !== null && time && description) {
            onSave({ name, lat, lng, time, description, transport, category });
            handleClose();
        } else {
            alert("Please fill out all fields and select a valid location from the search results.");
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center transition-opacity"
            onClick={handleClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Stop</h2>
                    
                    <div className="mb-4">
                        <label htmlFor="location" className="block text-gray-700 font-semibold mb-2">Location</label>
                        <AutocompleteInput
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                // Reset lat/lng if user types manually, forcing selection
                                setLat(null);
                                setLng(null);
                            }}
                            onSelect={({ name, lat, lng }) => {
                                setName(name);
                                setLat(lat);
                                setLng(lng);
                            }}
                            placeholder="Search for a place..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="time" className="block text-gray-700 font-semibold mb-2">Time</label>
                        <input
                            type="text"
                            id="time"
                            name="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 2:00 PM"
                            required
                        />
                    </div>

                     <div className="mb-4">
                        <label htmlFor="transport" className="block text-gray-700 font-semibold mb-2">Transport from Previous Stop</label>
                        <select
                            id="transport"
                            name="transport"
                            value={transport}
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
                     <div className="mb-4">
                        <label htmlFor="category" className="block text-gray-700 font-semibold mb-2">Category</label>
                        <select
                            id="category"
                            name="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as ItineraryItem['category'])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="landmark">Landmark</option>
                            <option value="activity">Activity</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="lodging">Lodging</option>
                            <option value="other">Other</option>
                        </select>
                    </div>


                    <div className="mb-6">
                        <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-4">
                        <button 
                            type="button" 
                            onClick={handleClose}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!lat || !lng}
                            className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                        >
                            Add to Itinerary
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddItemModal;

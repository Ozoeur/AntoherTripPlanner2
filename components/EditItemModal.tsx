import React, { useState, useEffect } from 'react';
import { ItineraryItem } from '../types';

interface EditItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedItem: ItineraryItem) => void;
    item: ItineraryItem | null;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [formData, setFormData] = useState<Partial<ItineraryItem>>({
        name: '',
        time: '',
        description: '',
        category: 'other',
    });

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name,
                time: item.time,
                description: item.description,
                category: item.category || 'other',
            });
        }
    }, [item]);

    if (!isOpen || !item) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...item, ...formData } as ItineraryItem);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center transition-opacity"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Itinerary Item</h2>
                    
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-gray-700 font-semibold mb-2">Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
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
                            value={formData.time}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="description" className="block text-gray-700 font-semibold mb-2">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                     <div className="mb-6">
                        <label htmlFor="category" className="block text-gray-700 font-semibold mb-2">Category</label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="landmark">Landmark</option>
                            <option value="activity">Activity</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="shop">Shop</option>
                            <option value="lodging">Lodging</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditItemModal;
import React, { useState, useRef, useEffect } from 'react';
import { ItineraryItem } from '../types';
import { SaveIcon, GripVerticalIcon, WalkIcon, SubwayIcon, BusIcon, CarIcon, StartIcon, EditIcon, TrashIcon, PlusCircleIcon, ClockIcon, RestaurantIcon, LandmarkIcon, ActivityIcon, BedIcon, ShuffleIcon, CheckCircleIcon } from './Icons';
import EditItemModal from './EditItemModal';
import AddItemModal from './AddItemModal';

interface ItineraryPlannerProps {
    itinerary: ItineraryItem[];
    setItinerary: React.Dispatch<React.SetStateAction<ItineraryItem[]>>;
    tripName: string;
    setTripName: (name: string) => void;
    onSave: () => void;
    selectedItemId: string | null;
    onSuggestAlternative: (itemId: string) => void;
    replacingItemId: string | null;
    onMarkAsVisited: (item: ItineraryItem) => void;
    city: string;
    completedActivities: { [city: string]: string[] };
    showSaveButton: boolean;
}

const TransportIcon = ({ transport }: { transport: ItineraryItem['transport'] }) => {
    const commonClasses = "h-5 w-5 mr-3 text-gray-500";
    switch (transport) {
        case 'walk': return <WalkIcon className={commonClasses} />;
        case 'metro': return <SubwayIcon className={commonClasses} />;
        case 'bus': return <BusIcon className={commonClasses} />;
        case 'taxi': case 'car': return <CarIcon className={commonClasses} />;
        case 'start': return <StartIcon className={commonClasses} />;
        default: return null;
    }
};

const CategoryIcon = ({ category }: { category: ItineraryItem['category'] }) => {
    const commonClasses = "h-5 w-5 text-gray-600 flex-shrink-0";
    switch (category) {
        case 'activity': return <ActivityIcon className={commonClasses} aria-label="Activity" />;
        case 'landmark': return <LandmarkIcon className={commonClasses} aria-label="Landmark" />;
        case 'restaurant': return <RestaurantIcon className={commonClasses} aria-label="Restaurant" />;
        case 'lodging': return <BedIcon className={commonClasses} aria-label="Lodging" />;
        default: return null;
    }
};

const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({ itinerary, setItinerary, tripName, setTripName, onSave, selectedItemId, onSuggestAlternative, replacingItemId, onMarkAsVisited, city, completedActivities, showSaveButton }) => {
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (selectedItemId) {
            const selectedElement = itemRefs.current[selectedItemId];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            }
        }
    }, [selectedItemId]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (!draggedItemId || draggedItemId === targetId) return;

        const draggedIndex = itinerary.findIndex(item => item.id === draggedItemId);
        const targetIndex = itinerary.findIndex(item => item.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;

        const newItinerary = [...itinerary];
        const [draggedItem] = newItinerary.splice(draggedIndex, 1);
        newItinerary.splice(targetIndex, 0, draggedItem);
        
        setItinerary(newItinerary);
        setDraggedItemId(null);
    };

    const handleEditClick = (item: ItineraryItem) => {
        setEditingItem(item);
    };

    const handleSaveChanges = (updatedItem: ItineraryItem) => {
        setItinerary(prevItinerary => 
            prevItinerary.map(item => item.id === updatedItem.id ? updatedItem : item)
        );
        setEditingItem(null);
    };
    
    const handleDeleteItem = (idToDelete: string) => {
        setItinerary(prev => prev.filter(item => item.id !== idToDelete));
    };

    const handleAddItem = (newItem: Omit<ItineraryItem, 'id'>) => {
        const fullNewItem = {
            ...newItem,
            id: `${Date.now()}-new`,
        };
        setItinerary(prev => [...prev, fullNewItem]);
        setIsAdding(false);
    };


    return (
        <>
            <div className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center gap-3 mb-4">
                     <input 
                        type="text" 
                        value={tripName} 
                        onChange={(e) => setTripName(e.target.value)}
                        className="text-xl md:text-2xl font-bold text-gray-800 bg-transparent border-b-2 border-transparent focus:border-blue-500 outline-none flex-grow min-w-0"
                    />
                    {showSaveButton && (
                         <button
                            onClick={onSave}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 transition-colors text-sm"
                        >
                            <SaveIcon className="h-5 w-5" />
                            Save
                        </button>
                    )}
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="relative">
                        {/* Dotted line connecting items */}
                        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 border-l-2 border-dotted border-gray-400 -z-10"></div>

                        {itinerary.map((item, index) => {
                            const isReplacing = replacingItemId === item.id;
                            const isLodgingStartEnd = item.category === 'lodging' && (index === 0 || index === itinerary.length - 1);
                            const isVisited = city && completedActivities[city]?.includes(item.name);

                            return (
                            <React.Fragment key={item.id}>
                                <div
                                    ref={el => { itemRefs.current[item.id] = el; }}
                                    className={`flex items-start mb-4 relative pl-10 transition-all duration-300 rounded-lg ${selectedItemId === item.id ? 'bg-blue-50 ring-2 ring-blue-500' : ''} ${isReplacing ? 'opacity-60' : ''} ${isVisited ? 'opacity-70' : ''}`}
                                    draggable={!isReplacing}
                                    onDragStart={(e) => !isReplacing && handleDragStart(e, item.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, item.id)}
                                >
                                    <div className="absolute left-0 top-1.5 flex items-center">
                                        <GripVerticalIcon className="h-6 w-5 text-gray-400 cursor-move" />
                                        <div className="flex items-center justify-center h-5 w-5 bg-white border-2 border-blue-500 rounded-full z-10">
                                            <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg shadow-sm flex-grow border border-gray-200 relative">
                                        {isReplacing && (
                                            <div className="absolute inset-0 bg-white/70 flex justify-center items-center rounded-lg z-20">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            {!isLodgingStartEnd && (
                                                 <button
                                                    onClick={() => onMarkAsVisited(item)}
                                                    className={`p-1.5 rounded-full transition-colors ${isVisited ? 'text-green-500' : 'text-gray-500 hover:bg-gray-200'}`}
                                                    aria-label={isVisited ? "Marked as visited" : "Mark as visited"}
                                                    disabled={isVisited}
                                                    title={isVisited ? "Already visited" : "Mark as visited"}
                                                >
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            {!isLodgingStartEnd && (
                                                <button 
                                                    onClick={() => onSuggestAlternative(item.id)}
                                                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-full transition-colors disabled:text-gray-400 disabled:hover:bg-transparent"
                                                    aria-label="Suggest alternative"
                                                    disabled={isReplacing}
                                                    title="Suggest an alternative"
                                                >
                                                    <ShuffleIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleEditClick(item)} 
                                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                                                aria-label="Edit item"
                                            >
                                                <EditIcon className="h-4 w-4" />
                                            </button>
                                            {!isLodgingStartEnd && (
                                                <button 
                                                    onClick={() => handleDeleteItem(item.id)} 
                                                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                                    aria-label="Delete item"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 pr-24">
                                            <CategoryIcon category={item.category} />
                                            <h3 className={`font-bold text-lg text-gray-800 ${isVisited ? 'line-through' : ''}`}>{item.name}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-2">{item.time}</p>
                                        <p className="text-gray-600 mb-3">{item.description}</p>
                                        <div className="flex items-center text-sm font-medium text-gray-700 capitalize p-2 bg-gray-200 rounded-md">
                                            <TransportIcon transport={item.transport} />
                                            <span>{item.transport === 'start' ? 'Starting Point' : `By ${item.transport}`}</span>
                                            {item.travelTime && item.transport !== 'start' && (
                                                <div className="flex items-center">
                                                    <span className="mx-2 text-gray-400">•</span>
                                                    <ClockIcon className="h-4 w-4 mr-1 text-gray-500" />
                                                    <span className="text-gray-600 normal-case">{item.travelTime}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        )})}
                    </div>
                     <div className="flex justify-center mt-4">
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-5 py-2 text-blue-600 bg-blue-50 rounded-full font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
                        >
                            <PlusCircleIcon className="h-5 w-5" />
                            Add Stop
                        </button>
                    </div>
                </div>
            </div>
            <EditItemModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleSaveChanges}
                item={editingItem}
            />
            <AddItemModal 
                isOpen={isAdding}
                onClose={() => setIsAdding(false)}
                onSave={handleAddItem}
            />
        </>
    );
};

export default ItineraryPlanner;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ItineraryItem, TripPlan } from './types';
import MapWrapper from './components/MapWrapper';
import ItineraryPlanner from './components/ItineraryPlanner';
import SavedTrips from './components/SavedTrips';
import AutocompleteInput from './components/AutocompleteInput';
import { generateItinerary, generateAlternative, getPlaceDetails } from './services/geminiService';
import { MapIcon, ListIcon, SaveIcon, FolderIcon, AlertTriangleIcon, HistoryIcon } from './components/Icons';
import VisitedPlaces from './components/VisitedPlaces';
import BottomNavBar from './components/BottomNavBar';

const App: React.FC = () => {
    const [city, setCity] = useState<string>('');
    const [cityBounds, setCityBounds] = useState<[string, string, string, string] | null>(null);
    const [lodging, setLodging] = useState<{ name: string; lat: number; lng: number } | null>(null);
    const [lodgingInput, setLodgingInput] = useState('');
    const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
    const [tripName, setTripName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [savedTrips, setSavedTrips] = useState<TripPlan[]>([]);
    const [isSavedTripsDrawerOpen, setIsSavedTripsDrawerOpen] = useState(false);
    const [isVisitedDrawerOpen, setIsVisitedDrawerOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [completedActivities, setCompletedActivities] = useState<{ [city: string]: string[] }>({});
    const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
    const [isAddingVisited, setIsAddingVisited] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'itinerary' | 'map'>('search');


    useEffect(() => {
        try {
            const storedTrips = localStorage.getItem('tripPlans');
            if (storedTrips) {
                setSavedTrips(JSON.parse(storedTrips));
            }
        } catch (e) {
            console.error("Failed to parse saved trips from localStorage", e);
            setError("Could not load saved trips. Local storage might be corrupt.");
        }
        
        try {
            const storedCompleted = localStorage.getItem('completedActivities');
            if (storedCompleted) {
                setCompletedActivities(JSON.parse(storedCompleted));
            }
        } catch (e) {
            console.error("Failed to parse completed activities from localStorage", e);
        }
    }, []);

    const handlePlanDay = async () => {
        if (!city) {
            setError('Please enter a city name.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setItinerary([]);
        setSelectedItemId(null);
        try {
            const placesToAvoid = completedActivities[city] || [];
            const newItinerary = await generateItinerary(city, lodging ?? undefined, placesToAvoid);
            setItinerary(newItinerary);
            setTripName(`${city} Trip`);
            setActiveTab('itinerary');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTrip = useCallback(() => {
        if (itinerary.length === 0 || !tripName) {
            setError("Cannot save an empty trip or a trip without a name.");
            return;
        }
        const newTrip: TripPlan = {
            id: Date.now().toString(),
            name: tripName,
            city: city,
            itinerary: itinerary,
        };
        const updatedTrips = [...savedTrips, newTrip];
        setSavedTrips(updatedTrips);
        localStorage.setItem('tripPlans', JSON.stringify(updatedTrips));
        setIsSavedTripsDrawerOpen(true);
    }, [itinerary, tripName, city, savedTrips]);

    const handleRenameTrip = useCallback((tripId: string, newName: string) => {
        if (!newName.trim()) return;
        const updatedTrips = savedTrips.map(trip =>
            trip.id === tripId ? { ...trip, name: newName.trim() } : trip
        );
        setSavedTrips(updatedTrips);
        localStorage.setItem('tripPlans', JSON.stringify(updatedTrips));
    }, [savedTrips]);

    const handleLoadTrip = useCallback((trip: TripPlan) => {
        setCity(trip.city);
        setItinerary(trip.itinerary);
        setTripName(trip.name);
        setLodging(null);
        setLodgingInput('');
        setSelectedItemId(null); // Deselect item when loading a new trip
        setIsSavedTripsDrawerOpen(false);
        setActiveTab('itinerary');
    }, []);

    const handleDeleteTrip = useCallback((tripId: string) => {
        const updatedTrips = savedTrips.filter(trip => trip.id !== tripId);
        setSavedTrips(updatedTrips);
        localStorage.setItem('tripPlans', JSON.stringify(updatedTrips));
    }, [savedTrips]);
    
    const handleSuggestAlternative = async (itemIdToReplace: string) => {
        const itemToReplace = itinerary.find(item => item.id === itemIdToReplace);
        if (!itemToReplace || !city) {
            setError("Could not find the item to replace or city is not set.");
            return;
        }
    
        setReplacingItemId(itemIdToReplace);
        setError(null);
    
        try {
            const currentCompleted = completedActivities[city] || [];
            
            const newSuggestion = await generateAlternative(
                city,
                itemToReplace,
                itinerary,
                currentCompleted
            );
    
            // Update itinerary with the new suggestion, keeping the original ID for stability
            setItinerary(currentItinerary =>
                currentItinerary.map(item =>
                    item.id === itemIdToReplace ? { ...newSuggestion, id: item.id } : item
                )
            );
    
            // Add the *replaced* item to the completed list for the current city
            // Use a Set to avoid duplicates
            const updatedCompletedForCity = [...new Set([...currentCompleted, itemToReplace.name])];
            const updatedCompleted = { ...completedActivities, [city]: updatedCompletedForCity };
            setCompletedActivities(updatedCompleted);
            localStorage.setItem('completedActivities', JSON.stringify(updatedCompleted));
    
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred while suggesting an alternative.');
        } finally {
            setReplacingItemId(null);
        }
    };
    
    const handleMarkAsVisited = useCallback((itemToMark: ItineraryItem) => {
        if (!city) return;

        const currentCompleted = completedActivities[city] || [];
        const updatedCompletedForCity = [...new Set([...currentCompleted, itemToMark.name])];
        const updatedCompleted = { ...completedActivities, [city]: updatedCompletedForCity };

        setCompletedActivities(updatedCompleted);
        localStorage.setItem('completedActivities', JSON.stringify(updatedCompleted));
    }, [completedActivities, city]);

    const handleMarkerClick = useCallback((itemId: string | null) => {
        setSelectedItemId(itemId);
        setActiveTab('itinerary');
    }, []);
    
    const handleClearLodging = () => {
        setLodging(null);
        setLodgingInput('');
    };

    const handleManageVisitedPlaces = (action: 'delete_one' | 'clear_city', city: string, placeName?: string) => {
        const updatedCompleted = { ...completedActivities };
    
        if (action === 'delete_one' && placeName && updatedCompleted[city]) {
            updatedCompleted[city] = updatedCompleted[city].filter(p => p !== placeName);
            if (updatedCompleted[city].length === 0) {
                delete updatedCompleted[city];
            }
        } else if (action === 'clear_city') {
            delete updatedCompleted[city];
        }
    
        setCompletedActivities(updatedCompleted);
        localStorage.setItem('completedActivities', JSON.stringify(updatedCompleted));
    };

    const handleAddVisitedPlaceToItinerary = async (placeName: string) => {
        if (!city) {
            setError("Cannot add a place without a city context for the current trip.");
            return;
        }
        setIsAddingVisited(true);
        setError(null);
        try {
            const placeDetails = await getPlaceDetails(placeName, city);
            const newItem: ItineraryItem = {
                ...placeDetails,
                id: `${Date.now()}-visited`,
                time: 'Adjust time',
                transport: 'car', // Default transport
                category: 'other', // Default category
                travelTime: 'N/A',
            };
            setItinerary(prev => [...prev, newItem]);
            setIsVisitedDrawerOpen(false); // Close drawer after adding
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : `Could not get details for ${placeName}.`);
        } finally {
            setIsAddingVisited(false);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col font-sans antialiased">
            <header className="bg-white shadow-md z-20 p-4">
                <div className="container mx-auto flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                         <MapIcon className="h-8 w-8 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-800">Another Trip Planner</h1>
                    </div>
                     {/* --- Desktop Search Controls --- */}
                     <div className="w-full sm:w-auto hidden md:flex flex-col items-center sm:items-end gap-2">
                        <div className="w-full sm:w-auto flex flex-wrap items-center justify-center sm:justify-end gap-2">
                            <AutocompleteInput
                                value={city}
                                onChange={(e) => {
                                    setCity(e.target.value);
                                    if (!e.target.value) {
                                        setCityBounds(null);
                                    }
                                }}
                                onSelect={({ name, boundingbox }) => {
                                    const cityName = name.split(',')[0].trim();
                                    setCity(cityName);
                                    if (boundingbox) setCityBounds(boundingbox);
                                }}
                                placeholder="Enter a city..."
                                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                onKeyDown={(e) => e.key === 'Enter' && handlePlanDay()}
                            />
                             <AutocompleteInput
                                value={lodgingInput}
                                onChange={(e) => {
                                    setLodgingInput(e.target.value);
                                    if (!e.target.value) {
                                        setLodging(null);
                                    }
                                }}
                                onSelect={({ name, lat, lng }) => {
                                    setLodging({ name, lat, lng });
                                    setLodgingInput(name);
                                }}
                                viewbox={cityBounds}
                                placeholder="Enter your hotel (optional)..."
                                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                            <button
                                onClick={handlePlanDay}
                                disabled={isLoading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-2"
                            >
                                {isLoading ? 'Planning...' : 'Plan'}
                            </button>
                             <button onClick={() => setIsVisitedDrawerOpen(true)} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Visited Places">
                                <HistoryIcon className="h-6 w-6 text-gray-700" />
                            </button>
                            <button onClick={() => setIsSavedTripsDrawerOpen(true)} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Saved Trips">
                                <FolderIcon className="h-6 w-6 text-gray-700" />
                            </button>
                        </div>
                        {lodging && (
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                                <span>📍 Starting from: <strong>{lodging.name}</strong></span>
                                <button
                                    onClick={handleClearLodging}
                                    className="font-mono text-red-500 hover:text-red-700 text-lg leading-none"
                                    aria-label="Clear lodging"
                                >
                                    &times;
                                </button>
                            </div>
                        )}
                    </div>
                     {/* --- Mobile Header Buttons --- */}
                    <div className="flex md:hidden items-center gap-1">
                        <button onClick={() => setIsVisitedDrawerOpen(true)} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Visited Places">
                            <HistoryIcon className="h-6 w-6 text-gray-700" />
                        </button>
                        <button onClick={() => setIsSavedTripsDrawerOpen(true)} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Saved Trips">
                            <FolderIcon className="h-6 w-6 text-gray-700" />
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4 my-2 flex items-center gap-3 z-10 rounded-md shadow-sm">
                    <AlertTriangleIcon className="h-6 w-6"/>
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto font-bold text-xl">&times;</button>
                </div>
            )}

            <main className="flex-grow flex flex-col md:flex-row-reverse overflow-hidden relative pb-16 md:pb-0">
                {/* --- Map Container --- */}
                <div className={`w-full h-full md:w-2/3 md:relative ${activeTab === 'map' ? 'block' : 'hidden'} md:block`}>
                     <MapWrapper 
                        itinerary={itinerary} 
                        onMarkerClick={handleMarkerClick}
                        selectedItemId={selectedItemId}
                        activeTab={activeTab}
                    />
                </div>
                {/* --- Side/Main Panel Container (Search or Itinerary) --- */}
                <div className={`w-full md:w-1/3 h-full bg-white shadow-lg overflow-y-auto ${activeTab === 'map' ? 'hidden' : 'block'} md:block`}>
                    {/* --- Mobile Search Panel --- */}
                    <div className={`${activeTab === 'search' ? 'flex' : 'hidden'} md:hidden h-full flex-col items-center justify-center p-6 text-center`}>
                        <div className="w-full max-w-sm flex flex-col items-stretch gap-4">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Let's plan your day!</h2>
                            <AutocompleteInput
                                value={city}
                                onChange={(e) => { setCity(e.target.value); if (!e.target.value) setCityBounds(null); }}
                                onSelect={({ name, boundingbox }) => { const cityName = name.split(',')[0].trim(); setCity(cityName); if (boundingbox) setCityBounds(boundingbox); }}
                                placeholder="Enter a city..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                onKeyDown={(e) => e.key === 'Enter' && handlePlanDay()}
                            />
                            <AutocompleteInput
                                value={lodgingInput}
                                onChange={(e) => { setLodgingInput(e.target.value); if (!e.target.value) setLodging(null); }}
                                onSelect={({ name, lat, lng }) => { setLodging({ name, lat, lng }); setLodgingInput(name); }}
                                viewbox={cityBounds}
                                placeholder="Enter your hotel (optional)..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                            {lodging && (
                                <div className="flex items-center justify-center gap-2 text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                                    <span>📍 Starting from: <strong>{lodging.name}</strong></span>
                                    <button onClick={handleClearLodging} className="font-mono text-red-500 hover:text-red-700 text-lg leading-none" aria-label="Clear lodging">&times;</button>
                                </div>
                            )}
                            <button
                                onClick={handlePlanDay}
                                disabled={isLoading}
                                className="w-full mt-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Planning...' : 'Plan Trip'}
                            </button>
                        </div>
                    </div>
                     {/* --- Itinerary Panel (Mobile & Desktop) --- */}
                    <div className={`${activeTab === 'itinerary' ? 'block' : 'hidden'} md:block h-full`}>
                        {(isLoading || isAddingVisited) && (
                            <div className="flex justify-center items-center h-full flex-col gap-4 p-4 text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                                <p className="text-gray-600 font-semibold text-lg">
                                    {isAddingVisited ? `Adding place to your trip...` : `Generating your amazing trip to ${city}...`}
                                </p>
                                <p className="text-gray-500">
                                    {isAddingVisited ? 'Fetching details...' : 'Our AI is finding the best spots and planning the perfect route. This might take a moment.'}
                                </p>
                            </div>
                        )}

                        {!isLoading && !isAddingVisited && itinerary.length > 0 && (
                            <ItineraryPlanner
                                itinerary={itinerary}
                                setItinerary={setItinerary}
                                tripName={tripName}
                                setTripName={setTripName}
                                onSave={handleSaveTrip}
                                selectedItemId={selectedItemId}
                                onSuggestAlternative={handleSuggestAlternative}
                                replacingItemId={replacingItemId}
                                onMarkAsVisited={handleMarkAsVisited}
                                city={city}
                                completedActivities={completedActivities}
                            />
                        )}
                        
                        {!isLoading && !isAddingVisited && itinerary.length === 0 && (
                             <div className="flex justify-center items-center h-full flex-col gap-4 p-8 text-center">
                                <ListIcon className="h-24 w-24 text-gray-300" />
                                <h2 className="text-2xl font-bold text-gray-700">Your adventure awaits!</h2>
                                <p className="text-gray-500">Enter a city above and let our AI craft a personalized day trip for you. Your itinerary will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
            <SavedTrips
                isOpen={isSavedTripsDrawerOpen}
                onClose={() => setIsSavedTripsDrawerOpen(false)}
                savedTrips={savedTrips}
                onLoad={handleLoadTrip}
                onDelete={handleDeleteTrip}
                onRename={handleRenameTrip}
            />
            <VisitedPlaces
                isOpen={isVisitedDrawerOpen}
                onClose={() => setIsVisitedDrawerOpen(false)}
                visitedPlaces={completedActivities}
                onManage={handleManageVisitedPlaces}
                onAddToItinerary={handleAddVisitedPlaceToItinerary}
                isTripActive={itinerary.length > 0}
            />
        </div>
    );
};

export default App;
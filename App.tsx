
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ItineraryItem, TripPlan, SearchResult } from './types';
import MapWrapper from './components/MapWrapper';
import ItineraryPlanner from './components/ItineraryPlanner';
import SavedTrips from './components/SavedTrips';
import AutocompleteInput from './components/AutocompleteInput';
import { generateItinerary, generateAlternative, getPlaceDetails, calculateTravelDetails } from './services/geminiService';
import { MapIcon, ListIcon, SaveIcon, FolderIcon, AlertTriangleIcon, HistoryIcon } from './components/Icons';
import VisitedPlaces from './components/VisitedPlaces';
import BottomNavBar from './components/BottomNavBar';
import AddStopPanel from './components/AddItemModal';

const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};


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
    const [activeTab, setActiveTab] = useState<'search' | 'itinerary' | 'map'>('search');
    const [currentTripId, setCurrentTripId] = useState<string | null>(null);
    const [isModified, setIsModified] = useState<boolean>(false);
    
    // State for the new "Add Stop" flow
    const [isAddingStop, setIsAddingStop] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedPlaceFromMap, setSelectedPlaceFromMap] = useState<SearchResult | null>(null);
    const [mapViewbox, setMapViewbox] = useState<[string, string, string, string] | null>(null);
    const [isAddingItem, setIsAddingItem] = useState(false);


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
        setCurrentTripId(null);
        setIsModified(false);

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

        if (currentTripId) {
            const updatedTrips = savedTrips.map(trip =>
                trip.id === currentTripId ? { ...trip, name: tripName, itinerary: itinerary } : trip
            );
            setSavedTrips(updatedTrips);
            localStorage.setItem('tripPlans', JSON.stringify(updatedTrips));
        } else {
            const newTrip: TripPlan = {
                id: Date.now().toString(),
                name: tripName,
                city: city,
                itinerary: itinerary,
            };
            const updatedTrips = [...savedTrips, newTrip];
            setSavedTrips(updatedTrips);
            localStorage.setItem('tripPlans', JSON.stringify(updatedTrips));
            setCurrentTripId(newTrip.id);
        }
        
        setIsModified(false);
        setIsSavedTripsDrawerOpen(true);
    }, [itinerary, tripName, city, savedTrips, currentTripId]);

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
        setCurrentTripId(trip.id);
        setIsModified(false);
        setLodging(null);
        setLodgingInput('');
        setSelectedItemId(null);
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
            
            const newSuggestion = await generateAlternative(city, itemToReplace, itinerary, currentCompleted);
    
            setItinerary(currentItinerary =>
                currentItinerary.map(item =>
                    item.id === itemIdToReplace ? { ...newSuggestion, id: item.id } : item
                )
            );
            if (currentTripId) setIsModified(true);
    
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
            if (updatedCompleted[city].length === 0) delete updatedCompleted[city];
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
        setIsLoading(true);
        setError(null);
        try {
            const placeDetails = await getPlaceDetails(placeName, city);
            const newItem: ItineraryItem = {
                ...placeDetails,
                id: `${Date.now()}-visited`, time: 'Adjust time', transport: 'car', category: 'other', travelTime: 'N/A',
            };
            setItinerary(prev => [...prev, newItem]);
            if (currentTripId) setIsModified(true);
            setIsVisitedDrawerOpen(false);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : `Could not get details for ${placeName}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const setItineraryAndMarkModified = (updater: React.SetStateAction<ItineraryItem[]>) => {
        setItinerary(updater);
        if (currentTripId) setIsModified(true);
    };

    const setTripNameAndMarkModified = (name: string) => {
        setTripName(name);
        if (currentTripId) setIsModified(true);
    };

    // --- New "Add Stop" Handlers ---
    const handleStartAddStop = () => {
        if (itinerary.length === 0) {
            setError("Please create or load a trip before adding a stop.");
            return;
        }
        setIsAddingStop(true);
        setActiveTab('map'); 
    };
    
    const handleCancelAddStop = () => {
        setIsAddingStop(false);
        setSearchResults([]);
        setSelectedPlaceFromMap(null);
        setActiveTab('itinerary');
    };
    
    const handleAddItem = async (newItemData: Omit<ItineraryItem, 'id' | 'transport' | 'travelTime' | 'imageUrl'>) => {
        setIsAddingItem(true);
        setError(null);
        try {
            // Create a sorted list of the existing itinerary to find the previous stop
            const sortedItinerary = [...itinerary].sort((a, b) => parseTime(a.time) - parseTime(b.time));
            const newItemTime = parseTime(newItemData.time);
    
            let previousItem = lodging ? { ...lodging, time: '00:00' } : null;
            for (const item of sortedItinerary) {
                if (parseTime(item.time) < newItemTime) {
                    previousItem = item;
                } else {
                    break;
                }
            }
            if (!previousItem && sortedItinerary.length > 0) {
                 // If no previous item found (i.e., new item is the earliest), use the first item as reference,
                 // assuming the trip starts there. This may need more sophisticated logic if trips can start anywhere.
                previousItem = sortedItinerary[0];
            }

            if (!previousItem) {
                throw new Error("Could not determine the previous location to calculate travel time.");
            }
    
            const { transport, travelTime } = await calculateTravelDetails(
                { lat: previousItem.lat, lng: previousItem.lng },
                { lat: newItemData.lat, lng: newItemData.lng },
                city
            );
    
            const newItem: ItineraryItem = {
                ...newItemData,
                id: `${Date.now()}-manual`,
                transport,
                travelTime,
            };
    
            const newItinerary = [...itinerary, newItem].sort((a, b) => parseTime(a.time) - parseTime(b.time));
            setItinerary(newItinerary);
    
            if (currentTripId) setIsModified(true);
            handleCancelAddStop();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An error occurred while adding the stop.");
        } finally {
            setIsAddingItem(false);
        }
    };
    

    const handleSearchForStops = (results: SearchResult[]) => {
        setSearchResults(results);
        setSelectedPlaceFromMap(null); // Clear previous selection when new results arrive
    };

    const handleSelectionChange = (selection: SearchResult | null) => {
        setSelectedPlaceFromMap(selection);
        // If a selection is made, we can clear the other search results for a cleaner map view
        if (selection) {
            setSearchResults([selection]);
        }
    };


    const showSaveButton = itinerary.length > 0 && (!currentTripId || isModified);
    const isMobileSearchVisible = activeTab === 'search' && !isAddingStop && itinerary.length === 0;


    return (
        <div className="h-screen w-screen flex flex-col font-sans antialiased bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md z-30 p-4">
                <div className="container mx-auto flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                         <MapIcon className="h-8 w-8 text-blue-600" />
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Another Trip Planner</h1>
                    </div>
                     <div className="w-full sm:w-auto hidden md:flex flex-col items-center sm:items-end gap-2">
                        <div className="w-full sm:w-auto flex flex-wrap items-center justify-center sm:justify-end gap-2">
                           <div className="relative w-full sm:w-52">
                             <AutocompleteInput
                                value={city}
                                onChange={(e) => { setCity(e.target.value); if (!e.target.value) setCityBounds(null); }}
                                onSelect={({ name, boundingbox }) => { const cityName = name.split(',')[0].trim(); setCity(cityName); if (boundingbox) { setCityBounds(boundingbox as [string, string, string, string]); setMapViewbox(boundingbox as [string, string, string, string]);} }}
                                placeholder="Enter a city..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                onKeyDown={(e) => e.key === 'Enter' && handlePlanDay()}
                            />
                            </div>
                            <div className="relative w-full sm:w-60">
                             <AutocompleteInput
                                value={lodgingInput}
                                onChange={(e) => { setLodgingInput(e.target.value); if (!e.target.value) setLodging(null); }}
                                onSelect={({ name, lat, lng }) => { setLodging({ name, lat, lng }); setLodgingInput(name); }}
                                searchBounds={cityBounds}
                                placeholder="Enter your hotel (optional)..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                             </div>
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
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full mt-1">
                                <span>📍 Starting from: <strong>{lodging.name}</strong></span>
                                <button onClick={handleClearLodging} className="font-mono text-red-500 hover:text-red-700 text-lg leading-none" aria-label="Clear lodging">&times;</button>
                            </div>
                        )}
                    </div>
                    <div className="flex md:hidden items-center gap-1">
                        <button onClick={() => setIsVisitedDrawerOpen(true)} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Visited Places"><HistoryIcon className="h-6 w-6 text-gray-700" /></button>
                        <button onClick={() => setIsSavedTripsDrawerOpen(true)} className="p-2 rounded-full hover:bg-gray-200 transition-colors" title="Saved Trips"><FolderIcon className="h-6 w-6 text-gray-700" /></button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4 my-2 flex items-center gap-3 z-20 rounded-md shadow-sm relative">
                    <AlertTriangleIcon className="h-6 w-6"/>
                    <span className="font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto font-bold text-xl">&times;</button>
                </div>
            )}

            <main className="flex-grow flex flex-col md:flex-row overflow-hidden relative pb-16 md:pb-0">
                <div className={`w-full h-full md:w-2/3 md:relative ${activeTab === 'map' || isAddingStop || isMobileSearchVisible ? 'block' : 'hidden'} md:block`}>
                     <MapWrapper 
                        itinerary={itinerary} 
                        onMarkerClick={handleMarkerClick}
                        selectedItemId={selectedItemId}
                        activeTab={activeTab}
                        searchResults={searchResults}
                        selectedSearchResultId={selectedPlaceFromMap?.id ?? null}
                        onSearchResultMarkerClick={(resultId) => {
                            const result = searchResults.find(r => r.id === resultId);
                            if (result) {
                                handleSelectionChange(result);
                            }
                        }}
                        onViewboxChange={setMapViewbox}
                    />
                </div>
                
                 <div className={`
                    absolute top-0 left-0 right-0 bottom-0 md:static
                    md:w-1/3 md:h-full
                    bg-white shadow-lg md:overflow-y-auto 
                    ${activeTab === 'itinerary' && !isAddingStop ? 'block' : 'hidden'} 
                    md:block
                `}>
                    {isLoading && (
                        <div className="flex justify-center items-center h-full flex-col gap-4 p-4 text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                            <p className="text-gray-600 font-semibold text-lg">{`Generating your amazing trip to ${city}...`}</p>
                            <p className="text-gray-500">Our AI is finding the best spots and planning the perfect route. This might take a moment.</p>
                        </div>
                    )}

                    {!isLoading && itinerary.length > 0 && (
                        <ItineraryPlanner
                            itinerary={itinerary} setItinerary={setItineraryAndMarkModified}
                            tripName={tripName} setTripName={setTripNameAndMarkModified}
                            onSave={handleSaveTrip} selectedItemId={selectedItemId}
                            onSuggestAlternative={handleSuggestAlternative} replacingItemId={replacingItemId}
                            onMarkAsVisited={handleMarkAsVisited} city={city}
                            completedActivities={completedActivities} showSaveButton={showSaveButton}
                            onAddStop={handleStartAddStop}
                        />
                    )}
                    
                    {!isLoading && itinerary.length === 0 && activeTab === 'itinerary' && (
                         <div className="flex justify-center items-center h-full flex-col gap-4 p-8 text-center">
                            <ListIcon className="h-24 w-24 text-gray-300" />
                            <h2 className="text-2xl font-bold text-gray-700">Your adventure awaits!</h2>
                            <p className="text-gray-500">Switch to the 'Search' tab to plan a new trip. Your itinerary will appear here.</p>
                        </div>
                    )}
                </div>

                {isMobileSearchVisible && (
                     <div className="md:hidden absolute bottom-16 left-0 right-0 z-20 p-4 bg-white/90 backdrop-blur-sm rounded-t-2xl shadow-lg">
                        <div className="w-full max-w-sm mx-auto flex flex-col items-stretch gap-4">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Let's plan your day!</h2>
                            <AutocompleteInput 
                                value={city} 
                                onChange={(e) => { setCity(e.target.value); if (!e.target.value) setCityBounds(null); }} 
                                onSelect={({ name, boundingbox }) => { 
                                    const cityName = name.split(',')[0].trim(); 
                                    setCity(cityName); 
                                    if (boundingbox) {
                                        setCityBounds(boundingbox as [string, string, string, string]);
                                        setMapViewbox(boundingbox as [string, string, string, string]);
                                    }
                                }} 
                                placeholder="Enter a city..." 
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
                                onKeyDown={(e) => e.key === 'Enter' && handlePlanDay()} 
                            />
                            <AutocompleteInput 
                                value={lodgingInput} 
                                onChange={(e) => { setLodgingInput(e.target.value); if (!e.target.value) setLodging(null); }} 
                                onSelect={({ name, lat, lng }) => { setLodging({ name, lat, lng }); setLodgingInput(name); }} 
                                searchBounds={cityBounds}
                                placeholder="Enter your hotel (optional)..." 
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
                            />
                            <button onClick={handlePlanDay} disabled={isLoading} className="w-full mt-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center gap-2">{isLoading ? 'Planning...' : 'Plan Trip'}</button>
                        </div>
                    </div>
                )}
                 
                 {isAddingStop && (
                     <AddStopPanel
                        onSave={handleAddItem}
                        onCancel={handleCancelAddStop}
                        onSearchResultsChange={handleSearchForStops}
                        onSelectionChange={handleSelectionChange}
                        searchBounds={mapViewbox ?? cityBounds}
                        selectedPlaceFromMap={selectedPlaceFromMap}
                        isSaving={isAddingItem}
                        cityContext={city}
                    />
                )}
            </main>
            <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
            <SavedTrips isOpen={isSavedTripsDrawerOpen} onClose={() => setIsSavedTripsDrawerOpen(false)} savedTrips={savedTrips} onLoad={handleLoadTrip} onDelete={handleDeleteTrip} onRename={handleRenameTrip}/>
            <VisitedPlaces isOpen={isVisitedDrawerOpen} onClose={() => setIsVisitedDrawerOpen(false)} visitedPlaces={completedActivities} onManage={handleManageVisitedPlaces} onAddToItinerary={handleAddVisitedPlaceToItinerary} isTripActive={itinerary.length > 0}/>
        </div>
    );
};

export default App;
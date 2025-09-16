import React, { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { SearchResult } from '../types';
import { RestaurantIcon, LandmarkIcon, BedIcon, ShopIcon, MapPinIcon, ActivityIcon } from './Icons';

// Define the structure of a Nominatim search result
interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    boundingbox?: [string, string, string, string];
    address: { [key: string]: string };
    class: string;
    type: string;
}

// Define the props for our component, extending standard input props
interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect'> {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelect: (selection: { id: string; name: string; lat: number; lng: number; boundingbox?: [string, string, string, string] }) => void;
    onResultsChange?: (results: SearchResult[]) => void;
    viewbox?: [string, string, string, string] | null;
    cityContext?: string;
}

const getIconForType = (type: string, classType: string) => {
    const iconProps = { className: "h-5 w-5 text-gray-500 flex-shrink-0" };
    switch (type) {
        case 'restaurant':
        case 'cafe':
        case 'fast_food':
        case 'food_court':
        case 'pub':
            return <RestaurantIcon {...iconProps} />;
        case 'museum':
        case 'attraction':
        case 'artwork':
        case 'monument':
        case 'castle':
        case 'ruins':
        case 'archaeological_site':
        case 'place_of_worship':
            return <LandmarkIcon {...iconProps} />;
        case 'hotel':
        case 'motel':
        case 'guest_house':
        case 'hostel':
        case 'alpine_hut':
            return <BedIcon {...iconProps} />;
        case 'shop':
        case 'mall':
        case 'supermarket':
        case 'department_store':
        case 'bakery':
            return <ShopIcon {...iconProps} />;
        case 'park':
        case 'cinema':
        case 'theatre':
        case 'stadium':
        case 'sports_centre':
            return <ActivityIcon {...iconProps} />;
        default:
            if (classType === 'tourism' || classType === 'historic') return <LandmarkIcon {...iconProps} />;
            if (classType === 'shop' || classType === 'amenity') return <ShopIcon {...iconProps} />;
            return <MapPinIcon {...iconProps} />;
    }
};

const formatDisplayName = (displayName: string, address: { [key: string]: string }) => {
    const parts = displayName.split(',');
    const title = parts[0].trim();
    
    let subtitle = '';
    if (address.road && address.city) {
        subtitle = `${address.road}, ${address.city}`;
    } else if (address.suburb && address.city) {
        subtitle = `${address.suburb}, ${address.city}`;
    } else if (address.city && address.country) {
        subtitle = `${address.city}, ${address.country}`;
    } else if (parts.length > 1) {
        subtitle = parts.slice(1).join(',').trim();
    }

    return { title, subtitle };
};

const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(({ value, onChange, onSelect, onResultsChange, viewbox, cityContext, ...props }, ref) => {
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: Parameters<F>): void => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const fetchResults = async (query: string, currentViewbox?: [string, string, string, string] | null) => {
        if (query.length < 3) {
            setResults([]);
            if (onResultsChange) onResultsChange([]);
            return;
        }
        setIsLoading(true);
        try {
            const contextualQuery = cityContext ? `${query}, ${cityContext}` : query;
            let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contextualQuery)}&limit=7&addressdetails=1`;
            if (currentViewbox) {
                const [lat_min, lat_max, lon_min, lon_max] = currentViewbox;
                url += `&viewbox=${lon_min},${lat_max},${lon_max},${lat_min}`;
            }
            const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!response.ok) throw new Error('Network response was not ok');
            const data: NominatimResult[] = await response.json();
            setResults(data);
            if(onResultsChange) {
                onResultsChange(data.map(r => ({
                    id: String(r.place_id),
                    name: r.display_name.split(',')[0].trim(), // Return cleaner name
                    lat: parseFloat(r.lat),
                    lng: parseFloat(r.lon)
                })));
            }
        } catch (error) {
            console.error("Failed to fetch from Nominatim:", error);
            setResults([]);
            if (onResultsChange) onResultsChange([]);
        } finally {
            setIsLoading(false);
        }
    };

    const debouncedFetch = useCallback(debounce(fetchResults, 300), [cityContext]);

    useEffect(() => {
        debouncedFetch(value, viewbox);
    }, [value, viewbox, debouncedFetch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (result: NominatimResult) => {
        const cleanName = result.display_name.split(',')[0].trim();
        onSelect({
            id: String(result.place_id),
            name: cleanName,
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            boundingbox: result.boundingbox,
        });
        setResults([]);
        if (onResultsChange) onResultsChange([]);
        setShowResults(false);
    };

    return (
        <div className="relative w-full sm:w-auto" ref={wrapperRef}>
            <input
                ref={ref}
                type="text"
                value={value}
                onChange={onChange}
                onFocus={() => setShowResults(true)}
                autoComplete="off"
                {...props}
            />
            {showResults && value.length > 2 && (
                <div className="absolute z-30 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200">
                    {isLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                    {!isLoading && results.length === 0 && value.length > 2 && (
                        <div className="p-3 text-sm text-gray-500">No results found.</div>
                    )}
                    <ul className="divide-y divide-gray-100">
                        {results.map((result) => {
                            const { title, subtitle } = formatDisplayName(result.display_name, result.address);
                            return (
                                <li
                                    key={result.place_id}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelect(result);
                                    }}
                                    className="p-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 flex items-center gap-3"
                                >
                                    {getIconForType(result.type, result.class)}
                                    <div className="flex-grow overflow-hidden">
                                        <div className="font-semibold text-gray-800 truncate">{title}</div>
                                        <div className="text-xs text-gray-500 truncate">{subtitle}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
});

export default AutocompleteInput;
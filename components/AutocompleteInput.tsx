import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SearchResult } from '../types';

// Define the structure of a Nominatim search result
interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    boundingbox?: [string, string, string, string];
}

// Define the props for our component, extending standard input props
interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect'> {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelect: (selection: { id: string; name: string; lat: number; lng: number; boundingbox?: [string, string, string, string] }) => void;
    onResultsChange?: (results: SearchResult[]) => void;
    viewbox?: [string, string, string, string] | null;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ value, onChange, onSelect, onResultsChange, viewbox, ...props }) => {
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce utility to prevent API calls on every keystroke
    const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: Parameters<F>): void => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // Fetches search results from Nominatim API
    const fetchResults = async (query: string, currentViewbox?: [string, string, string, string] | null) => {
        if (query.length < 3) {
            setResults([]);
            if (onResultsChange) onResultsChange([]);
            return;
        }
        setIsLoading(true);
        try {
            let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
            if (currentViewbox) {
                // viewbox is in format: [lat_min, lat_max, lon_min, lon_max]
                // Nominatim API expects: viewbox=<left>,<top>,<right>,<bottom> which is lon_min,lat_max,lon_max,lat_min
                const [lat_min, lat_max, lon_min, lon_max] = currentViewbox;
                url += `&viewbox=${lon_min},${lat_max},${lon_max},${lat_min}&bounded=1`;
            }
            const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!response.ok) throw new Error('Network response was not ok');
            const data: NominatimResult[] = await response.json();
            setResults(data);
            if(onResultsChange) {
                onResultsChange(data.map(r => ({
                    id: String(r.place_id),
                    name: r.display_name,
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

    const debouncedFetch = useCallback(debounce(fetchResults, 300), []);

    useEffect(() => {
        debouncedFetch(value, viewbox);
    }, [value, viewbox, debouncedFetch]);

    // Handle clicks outside the component to close the results dropdown
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
        onSelect({
            id: String(result.place_id),
            name: result.display_name,
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
                type="text"
                value={value}
                onChange={onChange}
                onFocus={() => setShowResults(true)}
                autoComplete="off"
                {...props} // Pass down other props like className, placeholder, etc.
            />
            {showResults && value.length > 2 && (
                <div className="absolute z-30 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-200">
                    {isLoading && <div className="p-3 text-sm text-gray-500">Searching...</div>}
                    {!isLoading && results.length === 0 && value.length > 2 && (
                        <div className="p-3 text-sm text-gray-500">No results found.</div>
                    )}
                    <ul className="divide-y divide-gray-100">
                        {results.map((result) => (
                            <li
                                key={result.place_id}
                                onMouseDown={(e) => { // Use onMouseDown to fire before onBlur closes the dropdown
                                    e.preventDefault();
                                    handleSelect(result);
                                }}
                                className="p-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                            >
                                {result.display_name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default AutocompleteInput;
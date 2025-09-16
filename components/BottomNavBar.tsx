import React from 'react';
import { ListIcon, MapIcon } from './Icons';

interface BottomNavBarProps {
    activeTab: 'itinerary' | 'map';
    setActiveTab: (tab: 'itinerary' | 'map') => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab }) => {
    const commonButtonClasses = "flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ease-in-out";
    const activeClasses = "text-blue-600";
    const inactiveClasses = "text-gray-500 hover:text-blue-500";

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white shadow-[0_-2px_5px_rgba(0,0,0,0.1)] flex md:hidden z-30">
            <button
                onClick={() => setActiveTab('itinerary')}
                className={`${commonButtonClasses} ${activeTab === 'itinerary' ? activeClasses : inactiveClasses}`}
                aria-pressed={activeTab === 'itinerary'}
            >
                <ListIcon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">Itinerary</span>
            </button>
            <button
                onClick={() => setActiveTab('map')}
                className={`${commonButtonClasses} ${activeTab === 'map' ? activeClasses : inactiveClasses}`}
                aria-pressed={activeTab === 'map'}
            >
                <MapIcon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">Map</span>
            </button>
        </nav>
    );
};

export default BottomNavBar;

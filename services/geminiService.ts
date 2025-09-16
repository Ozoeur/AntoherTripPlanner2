import { GoogleGenAI, Type } from "@google/genai";
import { ItineraryItem } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const itinerarySchema = {
    type: Type.OBJECT,
    properties: {
        itinerary: {
            type: Type.ARRAY,
            description: "List of itinerary items for the day.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the place or activity." },
                    description: { type: Type.STRING, description: "A brief one-sentence description." },
                    time: { type: Type.STRING, description: "Suggested time, e.g., '9:00 AM'." },
                    lat: { type: Type.NUMBER, description: "Latitude of the location." },
                    lng: { type: Type.NUMBER, description: "Longitude of the location." },
                    transport: { 
                        type: Type.STRING, 
                        description: "Mode of transport from previous location.",
                        enum: ['walk', 'metro', 'bus', 'taxi', 'start', 'car']
                    },
                    category: {
                        type: Type.STRING,
                        description: "Category of the location.",
                        enum: ['activity', 'landmark', 'restaurant', 'lodging', 'other']
                    },
                    travelTime: { type: Type.STRING, description: "Estimated travel time from the previous location, e.g., 'approx. 15 mins'." },
                },
                required: ["name", "description", "time", "lat", "lng", "transport", "category"],
            },
        },
    },
    required: ["itinerary"],
};

const singleItemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Name of the place or activity." },
        description: { type: Type.STRING, description: "A brief one-sentence description." },
        time: { type: Type.STRING, description: "Suggested time, e.g., '1:30 PM'." },
        lat: { type: Type.NUMBER, description: "Latitude of the location." },
        lng: { type: Type.NUMBER, description: "Longitude of the location." },
        transport: { 
            type: Type.STRING, 
            description: "Mode of transport from previous location.",
            enum: ['walk', 'metro', 'bus', 'taxi', 'car']
        },
        category: {
            type: Type.STRING,
            description: "Category of the location.",
            enum: ['activity', 'landmark', 'restaurant', 'other']
        },
        travelTime: { type: Type.STRING, description: "Estimated travel time from the previous location, e.g., 'approx. 10 mins'." },
    },
    required: ["name", "description", "time", "lat", "lng", "transport", "category", "travelTime"],
};

const placeDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The official name of the place." },
        description: { type: Type.STRING, description: "A brief, one-sentence description of the place." },
        lat: { type: Type.NUMBER, description: "The precise latitude of the place." },
        lng: { type: Type.NUMBER, description: "The precise longitude of the place." },
    },
    required: ["name", "description", "lat", "lng"],
};


export const generateItinerary = async (city: string, lodging?: { name: string; lat: number; lng: number }, completedActivities: string[] = []): Promise<ItineraryItem[]> => {
    try {
        let prompt: string;

        const exclusionPrompt = completedActivities.length > 0 
            ? `\nCrucially, do NOT include any of the following places in the itinerary as the user has already visited them: ${completedActivities.join(', ')}.`
            : '';

        if (lodging) {
            prompt = `Generate a realistic and engaging one-day travel itinerary for ${city}, creating a complete round trip that starts and ends at the user's lodging: "${lodging.name}". The plan should include popular and interesting locations or activities, logically ordered for a full day.
It is mandatory to include a stop for lunch at a restaurant around 12:00 PM (noon) and another stop for dinner at a restaurant around 8:00 PM (20:00).
The very first item in the itinerary must be "${lodging.name}" at latitude ${lodging.lat} and longitude ${lodging.lng}. Its transport mode must be 'start' and its category must be 'lodging'.
The very last item in the itinerary must also be a return to the lodging, "${lodging.name}", at the same coordinates. The description for this last item should be something like "Return to lodging." and its category must be 'lodging'.
For all items (lodging, activities, and restaurants), provide a name, a brief one-sentence description, precise latitude and longitude, a suggested time, the best mode of transport from the previous location (from 'walk', 'metro', 'bus', 'taxi', 'car'), a category (from 'activity', 'landmark', 'restaurant', 'lodging', 'other'), and an estimated travelTime (e.g., "approx. 15 mins") from the previous location. For the first item, travelTime can be null. Ensure the restaurants are categorized as 'restaurant'.`;
        } else {
            prompt = `Generate a realistic and engaging one-day travel itinerary for ${city}. The plan should include popular and interesting locations or activities, logically ordered for a full day starting around 9 AM.
It is mandatory to include a stop for lunch at a restaurant around 12:00 PM (noon) and another stop for dinner at a restaurant around 8:00 PM (20:00).
For all items (activities and restaurants), provide a name, a brief description, precise latitude and longitude, a suggested time, the best mode of transport from the previous location (from 'walk', 'metro', 'bus', 'taxi', 'car'), a category (from 'activity', 'landmark', 'restaurant', 'other'), and an estimated travelTime (e.g., "approx. 15 mins") from the previous location.
The very first location's transport mode must be 'start' and its travelTime can be null. Ensure the restaurants are categorized as 'restaurant'.`;
        }

        prompt += exclusionPrompt;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: itinerarySchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        if (!parsedResponse.itinerary || !Array.isArray(parsedResponse.itinerary)) {
            throw new Error("Invalid itinerary format received from AI.");
        }

        return parsedResponse.itinerary.map((item: any, index: number) => ({
            ...item,
            id: `${Date.now()}-${index}`,
        }));

    } catch (error) {
        console.error("Error generating itinerary:", error);
        throw new Error("Failed to generate itinerary. The AI service may be unavailable or the city might be invalid. Please try again.");
    }
};

export const generateAlternative = async (
    city: string, 
    itemToReplace: ItineraryItem, 
    fullItinerary: ItineraryItem[],
    completedActivities: string[]
): Promise<ItineraryItem> => {
    try {
        const itemIndex = fullItinerary.findIndex(item => item.id === itemToReplace.id);
        const previousItem = itemIndex > 0 ? fullItinerary[itemIndex - 1] : null;

        const prompt = `Generate a single, alternative travel itinerary item for a trip in ${city}. This new item is intended to replace an existing one in the user's schedule.

Original Item to Replace:
- Name: "${itemToReplace.name}" at ${itemToReplace.time} (${itemToReplace.category})
- Description: "${itemToReplace.description}"

The new suggestion should:
1. Be a suitable alternative for the time slot around ${itemToReplace.time}.
2. Be geographically logical, considering the previous location was "${previousItem?.name ?? 'the starting point'}".
3. NOT be any of the following places the user has already visited in this city: ${completedActivities.join(', ') || 'None'}.
4. Must be a different place than the original ("${itemToReplace.name}").

Provide a response with a new name, a brief one-sentence description, precise latitude and longitude, a suggested time (close to the original), the best mode of transport from the previous location, a category (activity, landmark, restaurant, or other), and an estimated travel time from the previous location. The entire day's itinerary is provided for context of the day's flow: ${JSON.stringify(fullItinerary.map(i => ({name: i.name, time: i.time})))}.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: singleItemSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        if (!parsedResponse.name) {
            throw new Error("Invalid alternative format received from AI.");
        }
        
        // The calling function will handle assigning an ID.
        return parsedResponse as ItineraryItem;

    } catch (error) {
        console.error("Error generating alternative:", error);
        throw new Error("Failed to generate an alternative. The AI service may be unavailable. Please try again.");
    }
};

export const getPlaceDetails = async (placeName: string, city: string): Promise<Pick<ItineraryItem, 'name' | 'description' | 'lat' | 'lng'>> => {
    try {
        const prompt = `Provide the name, a brief one-sentence description, and precise latitude and longitude for the following location in ${city}: "${placeName}".`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: placeDetailsSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);
        
        if (!parsedResponse.lat || !parsedResponse.lng) {
            throw new Error(`Could not find coordinates for ${placeName}.`);
        }

        return parsedResponse;

    } catch (error) {
        console.error(`Error getting details for ${placeName}:`, error);
        throw new Error(`Failed to get details for ${placeName}. Please try again.`);
    }
};

import { GoogleGenAI, Type } from "@google/genai";
import { ItineraryItem } from '../types';

let ai: GoogleGenAI | null = null;
try {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (e) {
    console.error(e);
}


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
                    time: { type: Type.STRING, description: "Suggested time in 24-hour HH:mm format, e.g., '09:00' or '14:30'." },
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
                        enum: ['activity', 'landmark', 'restaurant', 'lodging', 'shop', 'other']
                    },
                    travelTime: { type: Type.STRING, description: "Estimated travel time from the previous location, e.g., 'approx. 15 mins'." },
                    imageUrl: { type: Type.STRING, description: "A publicly accessible URL to a high-quality, royalty-free photograph of the location." },
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
        time: { type: Type.STRING, description: "Suggested time in 24-hour HH:mm format, e.g., '13:30'." },
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
            enum: ['activity', 'landmark', 'restaurant', 'shop', 'other']
        },
        travelTime: { type: Type.STRING, description: "Estimated travel time from the previous location, e.g., 'approx. 10 mins'." },
        imageUrl: { type: Type.STRING, description: "A publicly accessible URL to a high-quality, royalty-free photograph of the location." },
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
        imageUrl: { type: Type.STRING, description: "A publicly accessible URL to a high-quality, royalty-free photograph of the location." },
    },
    required: ["name", "description", "lat", "lng"],
};

const travelDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        transport: {
            type: Type.STRING,
            description: "The most logical mode of transport, either 'walk' or 'metro'.",
            enum: ['walk', 'metro']
        },
        travelTime: {
            type: Type.STRING,
            description: "The estimated travel time, e.g., 'approx. 15 mins'."
        }
    },
    required: ["transport", "travelTime"]
};


export const generateItinerary = async (city: string, lodging?: { name: string; lat: number; lng: number }, completedActivities: string[] = []): Promise<ItineraryItem[]> => {
    if (!ai) return Promise.reject("AI Service is not initialized. Check API Key.");
    try {
        let prompt: string;

        const exclusionPrompt = completedActivities.length > 0 
            ? `\nIMPORTANT: The user has already visited the following places in ${city}: ${completedActivities.join(', ')}. You MUST NOT include any of these places in the generated itinerary. This is a strict requirement.`
            : '';
        
        const baseInstructions = "For all items (lodging, activities, and restaurants), provide a name, a brief one-sentence description, precise latitude and longitude, a suggested time in 24-hour HH:mm format, the best mode of transport from the previous location (from 'walk', 'metro', 'bus', 'taxi', 'car'), a category (from 'activity', 'landmark', 'restaurant', 'lodging', 'shop', 'other'), an estimated travelTime (e.g., 'approx. 15 mins') from the previous location, and a publicly accessible `imageUrl` to a high-quality, royalty-free photograph of the location. For the first item, travelTime can be null. Ensure the restaurants are categorized as 'restaurant'.";


        if (lodging) {
            prompt = `Generate a realistic and engaging one-day travel itinerary for ${city}, creating a complete round trip that starts and ends at the user's lodging: "${lodging.name}". The plan should include popular and interesting locations or activities, logically ordered for a full day.
It is mandatory to include a stop for lunch at a restaurant around 12:00 and another stop for dinner at a restaurant around 20:00.
The very first item in the itinerary must be "${lodging.name}" at latitude ${lodging.lat} and longitude ${lodging.lng}. Its transport mode must be 'start' and its category must be 'lodging'.
The very last item in the itinerary must also be a return to the lodging, "${lodging.name}", at the same coordinates. The description for this last item should be something like "Return to lodging." and its category must be 'lodging'.
${baseInstructions}`;
        } else {
            prompt = `Generate a realistic and engaging one-day travel itinerary for ${city}. The plan should include popular and interesting locations or activities, logically ordered for a full day starting around 09:00.
It is mandatory to include a stop for lunch at a restaurant around 12:00 and another stop for dinner at a restaurant around 20:00.
The very first location's transport mode must be 'start'.
${baseInstructions}`;
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
    if (!ai) return Promise.reject("AI Service is not initialized. Check API Key.");
    try {
        const itemIndex = fullItinerary.findIndex(item => item.id === itemToReplace.id);
        const previousItem = itemIndex > 0 ? fullItinerary[itemIndex - 1] : null;

        const otherItineraryItems = fullItinerary.filter(item => item.id !== itemToReplace.id).map(item => item.name);
        const placesToExclude = [...new Set([...completedActivities, ...otherItineraryItems])];

        const prompt = `Generate a single, alternative travel itinerary item for a trip in ${city}. This new item is intended to replace an existing one in the user's schedule.

Original Item to Replace:
- Name: "${itemToReplace.name}" at ${itemToReplace.time} (${itemToReplace.category})
- Description: "${itemToReplace.description}"

The new suggestion must follow these strict rules:
1. It must be a suitable alternative for the time slot around ${itemToReplace.time}.
2. It must be geographically logical, considering the previous location was "${previousItem?.name ?? 'the starting point'}".
3. It must NOT be any of the following places: ${placesToExclude.join(', ') || 'None'}. This is because the user has either already visited them or they are already part of the current trip plan. This is a critical instruction.

Provide a response with a new name, a brief one-sentence description, precise latitude and longitude, a suggested time (in 24-hour HH:mm format, close to the original), the best mode of transport from the previous location, a category (activity, landmark, restaurant, shop, or other), an estimated travel time from the previous location, and a publicly accessible imageUrl for a high-quality, royalty-free photograph. The full itinerary is provided for context of the day's flow: ${JSON.stringify(fullItinerary.map(i => ({name: i.name, time: i.time})))}.`;


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
        
        return parsedResponse as ItineraryItem;

    } catch (error) {
        console.error("Error generating alternative:", error);
        throw new Error("Failed to generate an alternative. The AI service may be unavailable. Please try again.");
    }
};

export const getPlaceDetails = async (placeName: string, city: string): Promise<Pick<ItineraryItem, 'name' | 'description' | 'lat' | 'lng' | 'imageUrl'>> => {
    if (!ai) return Promise.reject("AI Service is not initialized. Check API Key.");
    try {
        const prompt = `Provide the name, a brief one-sentence description, precise latitude and longitude, and a publicly accessible imageUrl for a high-quality, royalty-free photograph for the following location in ${city}: "${placeName}".`;

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

export const calculateTravelDetails = async (
    start: { lat: number; lng: number; },
    end: { lat: number; lng: number; },
    city: string
): Promise<{ transport: 'walk' | 'metro', travelTime: string }> => {
    if (!ai) return Promise.reject("AI Service is not initialized. Check API Key.");
    try {
        const prompt = `Given a starting point at latitude ${start.lat}, longitude ${start.lng} and an ending point at latitude ${end.lat}, longitude ${end.lng} in the city of ${city}, determine the most logical and efficient mode of transport. Choose ONLY between 'walk' and 'metro'. Also, provide an estimated travel time for the chosen mode (e.g., 'approx. 15 mins').`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: travelDetailsSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        if (!parsedResponse.transport || !parsedResponse.travelTime) {
            throw new Error("Invalid travel details format received from AI.");
        }
        return parsedResponse;

    } catch (error) {
        console.error("Error calculating travel details:", error);
        // Fallback in case of AI error
        return { transport: 'walk', travelTime: 'N/A' };
    }
};

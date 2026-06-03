// City/Area to coordinate mapping for heatmap visualization
// These are approximate coordinates for known locations

export interface LocationCoordinate {
  city: string;
  area?: string;
  lat: number;
  lng: number;
}

// Default center for India (can be adjusted based on deployment region)
export const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
export const DEFAULT_ZOOM = 5;

// City coordinates (approximate centers)
export const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  // Major Indian cities
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Delhi": { lat: 28.6139, lng: 77.2090 },
  "Bangalore": { lat: 12.9716, lng: 77.5946 },
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Chennai": { lat: 13.0827, lng: 80.2707 },
  "Kolkata": { lat: 22.5726, lng: 88.3639 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Jaipur": { lat: 26.9124, lng: 75.7873 },
  "Lucknow": { lat: 26.8467, lng: 80.9462 },
  "Surat": { lat: 21.1702, lng: 72.8311 },
  "Nagpur": { lat: 21.1458, lng: 79.0882 },
  "Indore": { lat: 22.7196, lng: 75.8577 },
  "Thane": { lat: 19.2183, lng: 72.9781 },
  "Bhopal": { lat: 23.2599, lng: 77.4126 },
  "Visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "Patna": { lat: 25.5941, lng: 85.1376 },
  "Vadodara": { lat: 22.3072, lng: 73.1812 },
  "Ghaziabad": { lat: 28.6692, lng: 77.4538 },
  "Ludhiana": { lat: 30.9010, lng: 75.8573 },
  "Agra": { lat: 27.1767, lng: 78.0081 },
  "Nashik": { lat: 19.9975, lng: 73.7898 },
  "Faridabad": { lat: 28.4089, lng: 77.3178 },
  "Meerut": { lat: 28.9845, lng: 77.7064 },
  "Rajkot": { lat: 22.3039, lng: 70.8022 },
  "Varanasi": { lat: 25.3176, lng: 82.9739 },
  "Srinagar": { lat: 34.0837, lng: 74.7973 },
  "Aurangabad": { lat: 19.8762, lng: 75.3433 },
  "Dhanbad": { lat: 23.7957, lng: 86.4304 },
  "Amritsar": { lat: 31.6340, lng: 74.8723 },
  "Navi Mumbai": { lat: 19.0330, lng: 73.0297 },
  "Allahabad": { lat: 25.4358, lng: 81.8463 },
  "Ranchi": { lat: 23.3441, lng: 85.3096 },
  "Howrah": { lat: 22.5958, lng: 88.2636 },
  "Coimbatore": { lat: 11.0168, lng: 76.9558 },
  "Jabalpur": { lat: 23.1815, lng: 79.9864 },
  "Gwalior": { lat: 26.2183, lng: 78.1828 },
  "Vijayawada": { lat: 16.5062, lng: 80.6480 },
  "Jodhpur": { lat: 26.2389, lng: 73.0243 },
  "Madurai": { lat: 9.9252, lng: 78.1198 },
  "Raipur": { lat: 21.2514, lng: 81.6296 },
  "Kota": { lat: 25.2138, lng: 75.8648 },
  "Chandigarh": { lat: 30.7333, lng: 76.7794 },
  "Guwahati": { lat: 26.1445, lng: 91.7362 },
  "Solapur": { lat: 17.6599, lng: 75.9064 },
  "Hubli": { lat: 15.3647, lng: 75.1240 },
  "Mysore": { lat: 12.2958, lng: 76.6394 },
  "Tiruchirappalli": { lat: 10.7905, lng: 78.7047 },
  "Bareilly": { lat: 28.3670, lng: 79.4304 },
  "Aligarh": { lat: 27.8974, lng: 78.0880 },
  "Thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "Moradabad": { lat: 28.8386, lng: 78.7733 },
  "Gorakhpur": { lat: 26.7606, lng: 83.3732 },
  "Jalandhar": { lat: 31.3260, lng: 75.5762 },
  "Bhubaneswar": { lat: 20.2961, lng: 85.8245 },
  "Salem": { lat: 11.6643, lng: 78.1460 },
  "Warangal": { lat: 17.9784, lng: 79.5941 },
  "Guntur": { lat: 16.3067, lng: 80.4365 },
  "Bikaner": { lat: 28.0229, lng: 73.3119 },
  "Noida": { lat: 28.5355, lng: 77.3910 },
  "Gurugram": { lat: 28.4595, lng: 77.0266 },
  "Kochi": { lat: 9.9312, lng: 76.2673 },
};

// Area offsets (small random offsets from city center for areas)
// In a production system, these would be actual area coordinates
export const getAreaOffset = (area: string): { lat: number; lng: number } => {
  // Generate deterministic offset based on area name
  let hash = 0;
  for (let i = 0; i < area.length; i++) {
    const char = area.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Small offset (within ~5km radius)
  const latOffset = ((hash % 100) - 50) * 0.001;
  const lngOffset = (((hash >> 8) % 100) - 50) * 0.001;
  
  return { lat: latOffset, lng: lngOffset };
};

export const getIncidentCoordinates = (city: string | null, area: string | null): { lat: number; lng: number } | null => {
  if (!city) return null;
  
  const cityCoord = cityCoordinates[city];
  if (!cityCoord) {
    // Unknown city, return null
    return null;
  }
  
  if (area) {
    const offset = getAreaOffset(area);
    return {
      lat: cityCoord.lat + offset.lat,
      lng: cityCoord.lng + offset.lng,
    };
  }
  
  return cityCoord;
};

// Get center coordinates for a city
export const getCityCenter = (city: string): { lat: number; lng: number } | null => {
  return cityCoordinates[city] || null;
};

// Get all known cities
export const getKnownCities = (): string[] => {
  return Object.keys(cityCoordinates);
};

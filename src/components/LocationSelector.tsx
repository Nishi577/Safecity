import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define cities and their areas/police stations
export const CITIES_AND_AREAS: Record<string, string[]> = {
  "Mumbai": [
    "Andheri",
    "Bandra",
    "Borivali",
    "Colaba",
    "Dadar",
    "Goregaon",
    "Juhu",
    "Kandivali - Mahavir Nagar",
    "Kurla",
    "Malad",
    "Powai",
    "Santacruz",
    "Thane",
    "Versova",
    "Worli",
  ],
  "Delhi": [
    "Connaught Place",
    "Dwarka",
    "Greater Kailash",
    "Hauz Khas",
    "Janakpuri",
    "Karol Bagh",
    "Lajpat Nagar",
    "Mayur Vihar",
    "Nehru Place",
    "Pitampura",
    "Rohini",
    "Saket",
    "Vasant Kunj",
  ],
  "Bangalore": [
    "BTM Layout",
    "Electronic City",
    "HSR Layout",
    "Indiranagar",
    "Jayanagar",
    "Koramangala",
    "Marathahalli",
    "Rajajinagar",
    "Whitefield",
  ],
  "Chennai": [
    "Adyar",
    "Anna Nagar",
    "Egmore",
    "Mylapore",
    "Nungambakkam",
    "T. Nagar",
    "Velachery",
  ],
  "Kolkata": [
    "Ballygunge",
    "Howrah",
    "New Town",
    "Park Street",
    "Salt Lake",
    "South Kolkata",
  ],
  "Hyderabad": [
    "Banjara Hills",
    "Gachibowli",
    "Hitech City",
    "Jubilee Hills",
    "Madhapur",
    "Secunderabad",
  ],
  "Pune": [
    "Baner",
    "Hinjewadi",
    "Kothrud",
    "Koregaon Park",
    "Shivaji Nagar",
    "Viman Nagar",
  ],
};

interface LocationSelectorProps {
  city: string;
  area: string;
  onCityChange: (city: string) => void;
  onAreaChange: (area: string) => void;
  required?: boolean;
  showLabels?: boolean;
}

const LocationSelector = ({
  city,
  area,
  onCityChange,
  onAreaChange,
  required = false,
  showLabels = true,
}: LocationSelectorProps) => {
  const cities = Object.keys(CITIES_AND_AREAS);
  const areas = city ? CITIES_AND_AREAS[city] || [] : [];

  const handleCityChange = (newCity: string) => {
    onCityChange(newCity);
    onAreaChange(""); // Reset area when city changes
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {showLabels && (
          <Label htmlFor="city">
            <MapPin className="h-4 w-4 inline mr-2" />
            City {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <Select value={city} onValueChange={handleCityChange}>
          <SelectTrigger id="city">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {showLabels && (
          <Label htmlFor="area">
            Area / Police Station {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <Select value={area} onValueChange={onAreaChange} disabled={!city}>
          <SelectTrigger id="area">
            <SelectValue placeholder={city ? "Select area" : "Select city first"} />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default LocationSelector;

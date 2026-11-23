import { DivIcon } from "leaflet";

const customIcon = (color: string) => new DivIcon({
    className: "custom-marker",
    html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});
const iconCache = new Map<string, DivIcon>();
export const getMemoIcon = (color: string) => {
    const key = color || 'default';
    if (!iconCache.has(key)) {
        iconCache.set(key, customIcon(color || '#ccc'));
    }
    return iconCache.get(key)!;
};
export function returnMarkerColor(c: CurrentHourValuesValue | null): string {
    if (!c || c.value === null || c.value === undefined || c.min === null || c.min === undefined || c.max === null || c.max === undefined) {
        return "grey";
    }

    const { value, min, max } = c;

    if (max === min) {
        return "#b7b7b7";
    }

    const ratio = (value - min) / (max - min);

    if (ratio <= 0.25) {
        return "#2DA6C1";
    } else if (ratio <= 0.5) {
        return "#178D7C";
    } else if (ratio <= 0.75) {
        return "#FFAD32";
    } else {
        return "#FF0000";
    }
}
export function getColorRanges({min,max}:{min:number,max: number}): {[key:string]:string}  {
    if (max === min) {
        return {
            [`${min}-${max}`]: "#2DA6C1" 
        };
    }

    const step = (max - min) / 4;

    const r1 = min;
    const r2 = min + step;
    const r3 = min + step * 2;
    const r4 = min + step * 3;
    const r5 = max;

    return {
        [`${r1.toFixed(2)} - ${r2.toFixed(2)}`]: "#2DA6C1",
        [`${r2.toFixed(2)} - ${r3.toFixed(2)}`]: "#178D7C",
        [`${r3.toFixed(2)} - ${r4.toFixed(2)}`]: "#FFAD32",
        [`${r4.toFixed(2)} - ${r5.toFixed(2)}`]: "#FF0000",
        
    };
}
export function formatString(input: string): string {
    if (!input) return "";
    const withSpaces = input.replace(/_/g, " ");
    return withSpaces[0].toUpperCase() + withSpaces.slice(1);
}

interface CurrentHourValuesValue{
    value: number;
    min: number;
    max: number;
} 
export function getCurrentHourString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:00`;
}
export interface AgroClimateData {
    location: Location;
    requestUrl: string
    forecast_info: ForecastInfo;
    static_data: StaticData;
    units: Units;
    currentHourValues: Record<string, CurrentHourValuesValue> | null;
    forecast_data: WeatherData;
    source: string;
}
interface Location {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
}
interface ForecastInfo {
    forecast_days: number;
    history_days: number;
    model_run: string;
    last_updated: Date;
}

interface StaticData {
    dataset: Dataset;
}
interface Dataset {
  landuse: string;
  water_body_percentage: number;
}
interface Units {
    time: Date;
    [key: string]: string | Date
    
}
interface WeatherData {
    time: Date[];
    [key: string]: number[] | string[] | Date[]
}
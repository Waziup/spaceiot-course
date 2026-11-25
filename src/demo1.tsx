import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";

const BACKEND_URL = "https://api.kijanispace.eu/v1";
const CENTER_POINT: [number, number] = [-0.769547, 32.996942];

interface CoordinatePoint {
  lat: number;
  lng: number;
}

// Sample grid of coordinates around Lake Victoria (expandable to full 40-point grid)
const COORDINATE_POINTS: CoordinatePoint[] = [
  { lat: -0.168594, lng: 34.813843 }, // Kisumu Bay
  { lat: -0.570309, lng: 34.08728 }, // Homa Bay / Rusinga
  { lat: -2.578883, lng: 32.634155 }, // Mwanza Gulf
  { lat: -1.373738, lng: 31.907593 }, // Bukoba Coast
  { lat: 0.233121, lng: 32.634155 }, // Entebbe / Kampala
  { lat: -0.972023, lng: 33.360718 }, // Central Lake
];

export interface AgroClimateData {
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  units: Record<string, string>;
  forecast_data: {
    time: string[];
    [key: string]: number[] | string[];
  };
  [key: string]: unknown;
}

interface AgroClimateResponse extends AgroClimateData {
  requestUrl: string;
}

type CurrentValues = Record<string, number>;

// Authenticated GET request helper
async function fetchAgroClimate(
  endpoint: string,
): Promise<AgroClimateData> {
  const credentials = btoa("admin:secret");
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  return response.json();
}

// Formats current time as "YYYY-MM-DD HH:00" to match API timestamps
function getCurrentHourString(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const hour = String(now.getHours()).padStart(2, "0");
  return `${date} ${hour}:00`;
}

// Converts "soil_moisture_0to10cm" -> "Soil moisture 0to10cm"
function formatLabel(key?: string): string {
  if (!key) return "";
  const clean = key.replace(/_/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

interface ForecastChartProps {
  label: string;
  unit?: string;
  times: string[];
  values: number[];
  requestUrl: string;
}

function ForecastChart({
  label,
  unit,
  times,
  values,
  requestUrl,
}: ForecastChartProps) {
  // Combine parallel API arrays into [{ time, value }] objects for Recharts
  const chartData = times.map((t, index) => ({
    time: t.slice(5, 16), // Shorten to "MM-DD HH:mm"
    value: values[index],
  }));

  return (
    <Box sx={{ width: 340, p: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>
        {label} ({unit})
      </Typography>

      <Box sx={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={35} />
            <ChartTooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#1976d2"
              fill="#90caf9"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Link href={requestUrl} target="_blank" rel="noopener" variant="caption">
        View Raw API JSON →
      </Link>
    </Box>
  );
}

export default function Demo1() {
  const [selectedMetric, setSelectedMetric] = useState("");
  const currentHour = useMemo(() => getCurrentHourString(), []);

  // 1. Fetch agroclimatic land data for all coordinate points in parallel
  const results = useQueries({
    queries: COORDINATE_POINTS.map((coord) => ({
      queryKey: ["agroclimatic-land-demo1", coord.lat, coord.lng],
      queryFn: async (): Promise<AgroClimateResponse> => {
        const endpoint = `/agro_climate/land?lat=${coord.lat}&lon=${coord.lng}`;
        const data = await fetchAgroClimate(endpoint);
        return { ...data, requestUrl: `${BACKEND_URL}${endpoint}` };
      },
      // Extract the value matching the current hour
      select: (res: AgroClimateResponse) => {
        const hourIndex = res.forecast_data.time.indexOf(currentHour);
        const currentValues: CurrentValues = {};
        if (hourIndex !== -1) {
          for (const [key, arr] of Object.entries(res.forecast_data)) {
            if (key === "time") continue;
            const value = (arr as number[])[hourIndex];
            if (value !== undefined) currentValues[key] = value;
          }
        }
        return { ...res, currentValues };
      },
      staleTime: 1000 * 60 * 5,
    })),
  });

  const isLoading = results.every((q) => q.isLoading);
  const firstSuccessfulData = results.find((q) => q.data)?.data;

  // 2. Build dropdown menu items dynamically from API keys
  const metricOptions = useMemo(() => {
    if (!firstSuccessfulData) return [];
    return Object.keys(firstSuccessfulData.forecast_data)
      .filter((key) => key !== "time")
      .map((key) => ({ key, label: formatLabel(key) }));
  }, [firstSuccessfulData]);

  // Default to the first available variable once loaded
  const activeMetric = selectedMetric || metricOptions[0]?.key || "";

  return (
    <Box sx={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Floating Control Panel */}
      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          top: 16,
          left: 60,
          zIndex: 1000,
          p: 2,
          width: 300,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>
          KijaniSpace EO Map
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a variable and click any Lake Victoria marker to inspect its
          5-day forecast.
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Forecast Variable</InputLabel>
          <Select
            value={activeMetric}
            label="Forecast Variable"
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            {metricOptions.map((opt) => (
              <MenuItem key={opt.key} value={opt.key}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Alert severity="info" sx={{ mt: 2, fontSize: "0.75rem" }}>
          Showing live coordinates across the Lake Victoria Basin.
        </Alert>
      </Paper>

      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.7)",
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Interactive Map */}
      <MapContainer
        center={CENTER_POINT}
        zoom={7}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={["mt1", "mt2", "mt3"]}
          attribution="Google Satellite"
        />

        {results.map((res, idx) => {
          const data = res.data;
          const value = data?.currentValues?.[activeMetric];
          const unit = data?.units?.[activeMetric];

          if (!data || value === undefined) return null;

          return (
            <Marker
              key={idx}
              position={[data.location.latitude, data.location.longitude]}
            >
              <Tooltip>{`${value} ${unit}`}</Tooltip>
              <Popup minWidth={360}>
                <ForecastChart
                  label={formatLabel(activeMetric)}
                  unit={unit}
                  times={data.forecast_data.time}
                  values={data.forecast_data[activeMetric] as number[]}
                  requestUrl={data.requestUrl}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </Box>
  );
}

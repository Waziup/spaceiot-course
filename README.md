# SpaceIoT App Course

A React + TypeScript + Vite application for visualizing agroclimatic land and water data on a map overlay.

## Overview

This app fetches agroclimatic data from a remote API and renders it on an interactive map with:
- Land and water mode toggles
- Satellite and OpenStreetMap base layers
- Marker tooltips and popup details
- Chart-based forecast visualization
- React Query caching for API requests

## Features

- Interactive Leaflet map with markers on predefined coordinates
- Land and water dataset selection
- Forecast chart popups for land data
- Static water data details via popups
- Material UI controls for filters and navigation

## Technologies

- React 19
- TypeScript
- Vite
- Material UI (`@mui/material`, `@mui/icons-material`)
- React Query (`@tanstack/react-query`)
- React Leaflet (`react-leaflet`, `leaflet`)
- ApexCharts (`react-apexcharts`, `apexcharts`)

## Install

```bash
pnpm install
```

If you do not use `pnpm`, install dependencies with:

```bash
npm install
```

## Run locally

```bash
pnpm dev
```

Then open the local URL shown in the terminal.

## Build

```bash
pnpm build
```

## Preview production build

```bash
pnpm preview
```

## Environment

The frontend uses a backend API endpoint at:

- `https://api.kijanispace.eu/v1`

The source code includes a helper that may append `VITE_API_KEY` from environment variables for request URLs.

Example `.env`:

```env
VITE_API_KEY=your_api_key_here
```

## Project structure

- `src/App.tsx` — root component and data mode switch
- `src/main.tsx` — React root, theme, and React Query provider
- `src/land-data.tsx` — land-focused map view and forecast chart popups
- `src/water-data.tsx` — water-focused map view and static data popups
- `src/graph.tsx` — chart rendering component

## Notes

- The app currently uses hardcoded credentials (`admin:secret`) for API requests in the source.
- Default map center coordinates are set near Uganda.
- The app relies on `react-leaflet` and Leaflet tile layers for map rendering.

## License

This repository does not define a license. Add one if this project is shared publicly.

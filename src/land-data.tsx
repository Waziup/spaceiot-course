import { useMemo, useState } from 'react'
import { MapContainer, Marker,Popup, TileLayer, Tooltip,LayersControl, } from 'react-leaflet'
import { ArrowLeft, ArrowRight,  ExpandMore } from '@mui/icons-material';
import { Alert, Box, CircularProgress, Radio, Collapse, FormControl, FormControlLabel, FormLabel, InputBase, InputLabel, MenuItem, RadioGroup, Select, Skeleton, styled, Typography } from '@mui/material'
import { useQueries } from '@tanstack/react-query';
import SimpleAreaChart from './graph';
import { getColorRanges, getMemoIcon, returnMarkerColor, formatString, getCurrentHourString, type AgroClimateData } from './utils';
import LegendItem from './legend-item';


const BACKEND_URL = "https://api.kijanispace.eu/v1"
async function getBaseQuery<T>(url: string): Promise<T> {
    // const BACKEND_URL = import.meta.env.VITE_API_BASE_URL + "/v1";
    const credentials = btoa("admin:secret");
    const response = await fetch(`${BACKEND_URL + url}`, {
        method: "GET",
        headers: {
            Authorization: `Basic ${credentials}`,
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    return response.json();
}
export default function LandData({setShownData,shownData}:{shownData:string,setShownData:(d:"land"| "water")=>void,}) {
    const currentHour = useMemo(() => getCurrentHourString(), []);
    const results = useQueries({
        queries: COORDINATE_POINTS.map((coord) => ({
            queryKey: ["agroclimatic-land", coord.lat, coord.lng],
            queryFn: async () => {
                const res = await getBaseQuery<AgroClimateData>(
                    `/agro_climate/land?lat=${coord.lat}&lon=${coord.lng}`
                );
                return {
                    ...res,
                    requestUrl: `${BACKEND_URL}/agro_climate/land?lat=${coord.lat}&lon=${coord.lng}`
                }
            },
            select: (res:AgroClimateData) => {
                const index = res.forecast_data.time.indexOf(currentHour as unknown as Date);
                if (index === -1) {
                    return { ...res, currentHourValues: null };
                }
                const values: Record<string, { value: number }> = {};
                for (const [key, arr] of Object.entries(res.forecast_data)) {
                    if (key === "time") continue;
                    values[key] = { value: (arr as number[])[index] };
                }
                return { ...res, currentHourValues: values };
            },
            staleTime: 1000 * 60 * 5,
            enabled: COORDINATE_POINTS.length>0,
            retry: false,
            retryOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        })),
    });
    const isOneFinished = results.some(q => q.isSuccess || q.isError);
    const isAllSuccess = results.every(q=>q.isFetched)
    
    const [menuItemValue, setMenuItemValue] = useState("")

    const forecastData  = results[0]?.data?.forecast_data ?? null;
    const menuItems = useMemo(() => {
        if (!forecastData) return [];
        return Object.keys(forecastData)
            .filter(k => k !== "time")
            .map(k => ({ key: k, value: formatString(k) }));
    }, [forecastData]);
    // Default to the first available variable once loaded
    const activeMenuItem = menuItemValue || menuItems[0]?.key || "";
    const [mapType,setMapType] = useState<'OpenStreetMap' | 'Satellite'>('Satellite')
    const [showNav,setShowNav] = useState(true)
    const validResultsData = useMemo(() => {
        return results
            .map(r => r.data)
            .filter((d): d is NonNullable<typeof d> => !!d);
    }, [results]); // Only re-run when results change

    const aggregatedData = useMemo(() => {

        if (!validResultsData.length) return null;
        
        const acc: Record<string, { min: number; max: number }> = {};

        for (const rd of validResultsData) {
            if (!rd) continue;

            const timeIndex = rd.forecast_data.time.indexOf(currentHour as unknown as Date);
            if (timeIndex === -1) continue;

            for (const [key, values] of Object.entries(rd.forecast_data)) {
                if (key === "time") continue;

                const val = (values as number[])[timeIndex];
                if (val == null) continue;

                if (!acc[key]) {
                    acc[key] = { min: val, max: val };
                } else {
                    acc[key].min = Math.min(acc[key].min, val);
                    acc[key].max = Math.max(acc[key].max, val);
                }
            }
        }

        return acc;
    }, [validResultsData, currentHour]);
    const legendRanges = useMemo(() => {
        if (!aggregatedData || !activeMenuItem || !aggregatedData[activeMenuItem]) return null;
        return getColorRanges(aggregatedData[activeMenuItem]);
    }, [aggregatedData, activeMenuItem]);
    return (
        <Box component={"main"} sx={{height:'100%', flex:1,flexGrow:1, position:'relative',width:'100%'}}>
            <Box sx={{height:'100%',bgcolor:'red',flex:1, position:'relative'}}>
                <MapContainer id='map' style={{height:'95vh',zIndex:1,}}  center={{lat:CENTE_POINT[0],lng:CENTE_POINT[1]}} zoom={8}  >
                    <LayersControl  position='topright' >
                        <LayersControl.BaseLayer checked={mapType==='Satellite'} name="Satellite">
                            <TileLayer
                                url='https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
                                maxZoom={20}
                                subdomains={['mt1','mt2','mt3']}
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer checked={mapType==='OpenStreetMap'} name="OpenStreetMap">
                            <TileLayer 
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>
                    {
                        isOneFinished ? results.map((res,i)=> (res && res.data && res.data.currentHourValues && res.data.currentHourValues[activeMenuItem]?.value && res.data.units[activeMenuItem])?(
                            <Marker 
                                key={i.toString()}
                                icon={
                                    res.data.currentHourValues
                                        ? getMemoIcon(
                                            returnMarkerColor({
                                                value: res.data.currentHourValues[activeMenuItem]?.value ?? 0,
                                                min: aggregatedData?.[activeMenuItem]?.min ?? 0,
                                                max: aggregatedData?.[activeMenuItem]?.max ?? 0
                                            })
                                        )
                                        : getMemoIcon('')
                                }
                                position={[res.data.location.latitude,res.data.location.longitude]}
                            >
                                {
                                    (res && res.data && res.data.currentHourValues && res.data.currentHourValues[activeMenuItem]?.value && res.data.units[activeMenuItem]) ?(
                                        <Box sx={{zIndex:1000}} >
                                            <Tooltip>{((res && res.data && res.data.currentHourValues && res.data.currentHourValues[activeMenuItem])?`${res.data.currentHourValues[activeMenuItem].value} ${res.data.units[activeMenuItem]} `:"").toString()}</Tooltip>
                                            <Popup
                                                closeOnClick={false}
                                                autoPan 
                                                maxHeight={700} 
                                                minWidth={700}
                                            >
                                                <SimpleAreaChart
                                                    requestUrl = {res.data.requestUrl}
                                                    xUnits={res.data?.units.time}
                                                    yUnits={res.data?.units[activeMenuItem]}
                                                    label={menuItems.find(i=>i.key===activeMenuItem)?.value??''}
                                                    xLabels={res.data?.forecast_data.time??[]}
                                                    uData={res.data?.forecast_data[activeMenuItem] ??[]}
                                                />
                                            </Popup>
                                        </Box>
                                    ):null
                                }
                            </Marker>
                            ):null
                        ):(
                            
                            <Box
                                sx={{
                                    width:'100%',
                                    height:'100%',
                                    position:'absolute',
                                    top:0,
                                    left:0,
                                    display:'flex',
                                    alignItems:'center',
                                    bgcolor:'rgba(0,0,0,.5)',
                                    zIndex:1000
                                }}
                            >
                                <CircularProgress/>
                            </Box>
                        )
                        
                    }
                </MapContainer>
            </Box>
            <LegendItem
                isLoading={(!isAllSuccess)} 
                legendRanges={legendRanges}
                menuItemValue={activeMenuItem}
                unit={`(${results && results[0] && results[0]?.data?.units?.[activeMenuItem] as string})`}
            />
            {
                showNav?(
                    <Box sx={{position:'absolute',display:'flex', width:{lg:'30%',sm:'75%',xs:'75%',md:'50%'},zIndex:99,m:0,top:10,left:50}}>
                        <Collapse orientation='horizontal'  in={showNav} sx={{py:3,px:2,borderRadius:'8px',bgcolor:'#fff',width:'100%',display:showNav?"block":"none", overflow:'hidden'}} >
                            {
                                (!isAllSuccess)?(
                                    <Box sx={{width:'100%'}}>
                                        <Skeleton variant="text" width={300} sx={{ width:'100%',  }}/>
                                        <Skeleton variant="rectangular" sx={{ borderWidth:.5,borderColor:'#000', height:50, width:'100%' }}/>
                                        <Skeleton variant="text" width={300} sx={{ width:'100%',  }}/>
                                        <Skeleton variant="rectangular" sx={{ borderWidth:.5,borderColor:'#000', height:50, width:'100%' }}/>
                                        <Skeleton variant="text" width={300} sx={{ width:'100%',  }}/>
                                        <Box sx={{display:'flex',mt:1,flexDirection:'row',alignItems:'center'}}>
                                            <Skeleton variant="circular" width={20} height={20} />
                                            <Skeleton variant="text" sx={{ml:1, width:'30%',  }} />
                                            <Skeleton variant="circular" width={20} height={20} sx={{ml:1,display:'inline'}} />
                                            <Skeleton variant="text"  sx={{ width:'30%', ml:1,  }}/>
                                        </Box>
                                    </Box>
                                ):(
                                    <>
                                        <FormControl fullWidth sx={{ my:1,border: '1px solid #ced4da', minWidth: 120 ,borderRadius:2}} size="small">
                                            <Select 
                                                IconComponent={()=><ExpandMore/>}
                                                input={<BootstrapInput />} 
                                                value={shownData} size='small' 
                                                label="Age" 
                                                variant='outlined' 
                                                onChange={(e)=>{setShownData(e.target.value as "land" | "water")}}
                                                >
                                                    {
                                                        [{key:'land',value:'Land'},{key:'water',value:'Water'}].map((i,idx)=>(
                                                            <MenuItem key={idx} value={i.key}>{(i.value)}</MenuItem>
                                                        ))
                                                    }
                                            </Select>
                                        </FormControl>
                                        <Typography>Click the data points on the map to find relative data or find the data using the filters.</Typography>
                                        <InputLabel sx={{fontSize:'15px',}} color='info'>Forecast information</InputLabel>
                                        <FormControl fullWidth sx={{ my:1,border: '1px solid #ced4da', minWidth: 120 ,borderRadius:2}} size="small">
                                            <Select 
                                                IconComponent={()=><ExpandMore/>} 
                                                input={<BootstrapInput />} 
                                                value={menuItemValue} size='small' 
                                                label="Age" 
                                                variant='outlined' 
                                                onChange={(e)=>{setMenuItemValue(e.target.value)}}
                                                renderValue={(selected) => {
                                                    const selectedItem = menuItems.find(i => i.key === selected);
                                                    return trimWithEllipsis(selectedItem?.value);
                                                }}
                                                >
                                                    {
                                                        menuItems.map((i,idx)=>(
                                                            <MenuItem key={idx} value={i.key}>{(i.value)}</MenuItem>
                                                        ))
                                                    }
                                            </Select>
                                        </FormControl>
                                        {/* <SelectElement
                                            value={menuItemValue}
                                            items={menuItems}
                                            handleChange={(e)=>{setMenuItemValue(e.target.value)}}
                                            label='Forecast information'
                                        /> */}
                                        <Typography>Refresh coordinates</Typography>
                                        <FormControl sx={{my:1,display:'block'}}>
                                            <FormLabel id="map-view">Map View</FormLabel>
                                            <RadioGroup
                                                row
                                                aria-labelledby="demo-row-radio-buttons-group-label"
                                                name="row-radio-buttons-group"
                                            >
                                                <FormControlLabel onClick={()=>setMapType('Satellite')} checked={mapType === 'Satellite'} value="female" control={<Radio onChange={()=>setMapType('Satellite')} />} label="Satellite" />
                                                <FormControlLabel onClick={()=>setMapType('OpenStreetMap')} checked={mapType === 'OpenStreetMap'} value="male" control={<Radio onChange={()=>setMapType('OpenStreetMap')} />} label="OpenStreetMap"/>
                                                
                                            </RadioGroup>
                                        </FormControl>
                                        <Alert severity="warning">Only points within the Lake Victoria region will be plotted on the map</Alert>
                                    </>
                                )
                            }
                        </Collapse>
                        <Box onClick={()=>setShowNav(!showNav)} sx={{px:2,py:1,mx:1, zIndex:99, cursor:'pointer', height:60,width:10, bgcolor:'red',color:'#fff', display:'flex', borderRadius:'4px',justifyContent:'center', alignItems:'center'}} >
                            <ArrowLeft
                                width={20}
                                onClick={()=>setShowNav(!showNav)}
                                sx={{ cursor: 'pointer' }}
                            />
                        </Box>
                    </Box>
                ):(
                    <Box onClick={() => setShowNav(!showNav)} sx={{px:2,py:1,mx:1,top:10, left:50, zIndex:99, cursor:'pointer', position:'absolute', height:60,width:10, bgcolor:'red',color:'#fff', display:'flex', borderRadius:'4px',justifyContent:'center', alignItems:'center'}} >
                        {showNav ? (
                            <ArrowLeft
                                width={20}
                                onClick={()=>setShowNav(!showNav)}
                                sx={{ cursor: 'pointer' }}
                            />
                        ) : (
                            <ArrowRight
                                width={20}
                                onClick={()=>setShowNav(!showNav)}
                                sx={{ cursor: 'pointer' }}
                            />
                        )}
                    </Box>
                )
            }
        </Box>
    )
}
const CENTE_POINT = [-0.769547,32.996942]
const COORDINATE_POINTS = [
    {
        "lat": -2.578883,
        "lng": 31.907593
    },
    {
        "lat": -2.578883,
        "lng": 32.634155
    },
    {
        "lat": -2.578883,
        "lng": 33.360718
    },
    {
        "lat": -2.578883,
        "lng": 34.08728
    },
    {
        "lat": -2.578883,
        "lng": 34.813843
    },
    {
        "lat": -2.177168,
        "lng": 31.907593
    },
    {
        "lat": -2.177168,
        "lng": 32.634155
    },
    {
        "lat": -2.177168,
        "lng": 33.360718
    },
    {
        "lat": -2.177168,
        "lng": 34.08728
    },
    {
        "lat": -2.177168,
        "lng": 34.813843
    },
    {
        "lat": -1.775453,
        "lng": 31.907593
    },
    {
        "lat": -1.775453,
        "lng": 32.634155
    },
    {
        "lat": -1.775453,
        "lng": 33.360718
    },
    {
        "lat": -1.775453,
        "lng": 34.08728
    },
    {
        "lat": -1.775453,
        "lng": 34.813843
    },
    {
        "lat": -1.373738,
        "lng": 31.907593
    },
    {
        "lat": -1.373738,
        "lng": 32.634155
    },
    {
        "lat": -1.373738,
        "lng": 33.360718
    },
    {
        "lat": -1.373738,
        "lng": 34.08728
    },
    {
        "lat": -1.373738,
        "lng": 34.813843
    },
    {
        "lat": -0.972023,
        "lng": 31.907593
    },
    {
        "lat": -0.972023,
        "lng": 32.634155
    },
    {
        "lat": -0.972023,
        "lng": 33.360718
    },
    {
        "lat": -0.972023,
        "lng": 34.08728
    },
    {
        "lat": -0.972023,
        "lng": 34.813843
    },
    {
        "lat": -0.570309,
        "lng": 31.907593
    },
    {
        "lat": -0.570309,
        "lng": 32.634155
    },
    {
        "lat": -0.570309,
        "lng": 33.360718
    },
    {
        "lat": -0.570309,
        "lng": 34.08728
    },
    {
        "lat": -0.570309,
        "lng": 34.813843
    },
    {
        "lat": -0.168594,
        "lng": 31.907593
    },
    {
        "lat": -0.168594,
        "lng": 32.634155
    },
    {
        "lat": -0.168594,
        "lng": 33.360718
    },
    {
        "lat": -0.168594,
        "lng": 34.08728
    },
    {
        "lat": -0.168594,
        "lng": 34.813843
    },
    {
        "lat": 0.233121,
        "lng": 31.907593
    },
    {
        "lat": 0.233121,
        "lng": 32.634155
    },
    {
        "lat": 0.233121,
        "lng": 33.360718
    },
    {
        "lat": 0.233121,
        "lng": 34.08728
    },
    {
        "lat": 0.233121,
        "lng": 34.813843
    }

]
function trimWithEllipsis( input?: string, maxLength: number = 40): string {
    if (!input) return "";

    const text = String(input).trim();

    if (!Number.isFinite(maxLength) || maxLength <= 0) {
        return "";
    }

    if (text.length <= maxLength) {
        return text;
    }

    const ellipsis = "...";
    const sliceLength = Math.max(0, maxLength - ellipsis.length);

    const slice = text.slice(0, sliceLength);

    const lastSpace = slice.lastIndexOf(" ");
    const safeSlice = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;

    return safeSlice + ellipsis;
}
const BootstrapInput = styled(InputBase)(({ theme }) => ({
  'label + &': {
    marginTop: theme.spacing(3),
  },
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: 'transparent',
    // border: '1px solid #ced4da',
    fontSize: 16,
    padding: '10px 26px 10px 12px',
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    // Use the system font instead of the default Roboto font.
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    '&:focus': {
      borderRadius: 4,
      borderColor: '#80bdff',
      boxShadow: '0 0 0 0.2rem rgba(0,123,255,.25)',
    },
  },
}));

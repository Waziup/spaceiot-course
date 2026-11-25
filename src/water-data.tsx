import { Alert, Box, CircularProgress, Collapse, FormControl, FormControlLabel, FormLabel, InputBase, InputLabel, Link, MenuItem, Paper, Radio, RadioGroup, Select, Skeleton, Stack, styled, Typography } from '@mui/material';
import { QueryClient, useQueries } from '@tanstack/react-query';
import  { useMemo, useState } from 'react'
import { LayersControl, TileLayer, MapContainer, Marker, Tooltip, Popup } from 'react-leaflet';
import { formatString } from './utils';
import { ArrowLeft, ArrowRight, ExpandMore } from '@mui/icons-material';
import { getColorRanges, getMemoIcon, returnMarkerColor } from './utils';
import LegendItem from './legend-item';
const BACKEND_URL = "https://api.kijanispace.eu/v1"
export interface Location {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
}
interface AgroClimaticWaterData {
    location: Location;
    requestUrl: string
    units: Units;
    static_data: {
        [key: string]: number | null;
    };
    forecast_data: WeatherData;
    source: string;
};
interface Units {
    time: Date;
    [key: string]: string | Date
    
}
interface WeatherData {
    time: Date[];
    [key: string]: number[] | string[] | Date[]
}
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
const getRequestPath = (url?:string) => {
    if (!url) {
        return ""
    }
    return url+`&api_key=sk_QGEuNlhUs24b2r5s59JIPCRGaE5Ic2JpDiqRTrfBlz8`
}
export default function WaterData({setShownData,shownData}:{shownData:string,setShownData:(d:"land"| "water")=>void,}) {
    const queries = useQueries({
        queries: COORDINATE_POINTS.map((coord) => ({
                queryKey: ["agro-climatic-water", coord],
                queryFn: async () => {
                        const res = await getBaseQuery<AgroClimaticWaterData>(
                    `/agro_climate/water?lat=${coord.lat}&lon=${coord.lng}`
                    );
                    return {
                        ...res,
                    requestUrl: `${BACKEND_URL}/agro_climate/water?lat=${coord.lat}&lon=${coord.lng}`,
                    };
                },
                staleTime: 1000 * 60 * 5,
                enabled: COORDINATE_POINTS.length>0,
                retry: false,
                retryOnMount: false,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
        })),
    },new QueryClient({defaultOptions:{queries:{retry:false}}}));
    const results = queries.filter((q) => q.isSuccess).map((q) => q.data);
    const staticData = results[0]? results[0].static_data:null
    const [menuItemValue,setMenuItemValue] = useState("")
    const menuItems = useMemo(()=>{
    if(!staticData) return []
    const items = Object.keys(staticData).map(k => ({ key: k, value: formatString(k) }))
    return items
    },[staticData])

    // Default to the first available variable once loaded
    const activeMenuItem = menuItemValue || menuItems[0]?.key || "";
        
        
    const isAllFetched = queries.every(qr=>qr.isFetched)
    const isOneFinished = results[0]
    const [showNav,setShowNav] = useState(true)
    const [mapType,setMapType] = useState<'OpenStreetMap' | 'Satellite'>('Satellite')

    const aggregatedData = useMemo(() => {
        if (!results.length) return null;

        const acc: Record<string, { min: number; max: number }> = {};

        for (const rd of results) {
            for (const [key, value] of Object.entries(rd.static_data)) {
                if (typeof value !== "number") continue;

                if (!acc[key]) {
                    acc[key] = { min: value, max: value };
                } else {
                    acc[key].min = Math.min(acc[key].min, value);
                    acc[key].max = Math.max(acc[key].max, value);
                }
            }
        }
        return acc;
    }, [results]);
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
                            isOneFinished ? results.map((res)=> (res && res.static_data[activeMenuItem])?(
                                <Marker 
                                    title={(res.static_data[activeMenuItem]??0).toString()}
                                    icon={
                                        res.static_data?
                                            getMemoIcon(
                                                returnMarkerColor({
                                                    value: res.static_data[activeMenuItem]??0,
                                                    min: (aggregatedData && aggregatedData?.[activeMenuItem])? aggregatedData?.[activeMenuItem].min:0,
                                                    max: (aggregatedData && aggregatedData?.[activeMenuItem])? aggregatedData?.[activeMenuItem].max:0,
                                                })
                                            )
                                            :getMemoIcon('')
                                    }
                                    position={[res.location.latitude ,res.location.longitude]}
                                >
                                    <Tooltip>{(res.static_data[activeMenuItem]??0).toString()}</Tooltip>
                                    {
                                        res ?(
                                            <Box sx={{zIndex:1000}} >
                                                <Popup
                                                    closeOnClick={false}
                                                    autoPan 
                                                    
                                                    maxHeight={700} 
                                                    minWidth={500}
                                                >

                                                    <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
                                                    <Stack spacing={1.5}>
                                                        
                                                        <Typography variant="h6" sx={{fontWeight:600}}>
                                                            {menuItems.find(i=>i.key===activeMenuItem)?.value??''}
                                                        </Typography>

                                                        <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Value
                                                        </Typography>
                                                        <Typography variant="body1" sx={{fontWeight:500}}>
                                                            {res.static_data[activeMenuItem]}
                                                        </Typography>
                                                        </Box>

                                                        <Box>
                                                            <Link
                                                                href={getRequestPath(res.requestUrl)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                underline="hover"
                                                            >
                                                                Open request URL
                                                            </Link>
                                                        </Box>

                                                    </Stack>
                                                    </Paper>
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
                isLoading={(!isAllFetched) || isOneFinished === undefined } 
                legendRanges={legendRanges}
                menuItemValue={activeMenuItem}
            />
            {
                showNav?(
                    <Box sx={{position:'absolute',display:'flex', width:{lg:'30%',sm:'75%',xs:'75%',md:'50%'},zIndex:99,m:0,top:10,left:50}}>
                        <Collapse orientation='horizontal'  in={showNav} sx={{py:3,px:2,borderRadius:'8px',bgcolor:'#fff',width:'100%',display:showNav?"block":"none", overflow:'hidden'}} >
                            {
                                (!isAllFetched)?(
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
                                        <InputLabel sx={{fontSize:'15px',}} color='info'>Agroclimatic Data</InputLabel>
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
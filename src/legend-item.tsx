import { Box, Skeleton, Typography } from '@mui/material';
import { formatString } from './utils';

interface Props{
    legendRanges: {
        [key: string]: string;
    } | null,
    isLoading:boolean
    menuItemValue: string,
    unit?:string
}
export default function LegendItem({legendRanges,menuItemValue,unit,isLoading}:Props) {
    return (
        <Box sx={{position:'absolute',zIndex:99,display:'flex',flexDirection:'column',bottom:100,right:10}}  >
            {
                isLoading?(
                    <Box sx={{bgcolor:'#fff', overflowY: "auto",borderRadius:2,px:4,py:1,width:'100%',  overflowX: "hidden", }}>
                        <Skeleton variant="text" width={300} sx={{ width:'100%',  }}/>
                        <Skeleton variant="text" width={300} sx={{ width:'100%',  }}/>
                        <Box sx={{display:'flex',mt:1, flexDirection:'row',alignItems:'center'}}>
                            <Skeleton variant="circular" width={20} height={20} />
                            <Skeleton variant="text" sx={{ml:1, width:'100%',  }} />
                        </Box>
                        <Box sx={{display:'flex',mt:1, flexDirection:'row',alignItems:'center'}}>
                            <Skeleton variant="circular" width={20} height={20} />
                            <Skeleton variant="text" sx={{ml:1, width:'100%',  }} />
                        </Box>
                        <Box sx={{display:'flex',mt:1, flexDirection:'row',alignItems:'center'}}>
                            <Skeleton variant="circular" width={20} height={20} />
                            <Skeleton variant="text" sx={{ml:1, width:'100%',  }} />
                        </Box>
                        <Box sx={{display:'flex',mt:1, flexDirection:'row',alignItems:'center'}}>
                            <Skeleton variant="circular" width={20} height={20} />
                            <Skeleton variant="text" sx={{ml:1, width:'100%',  }} />
                        </Box>
                    </Box>
                ):(

                    <Box sx={{bgcolor:'#fff', overflowY: "auto",  overflowX: "hidden",borderRadius:2,px:4,py:1,width:'100%' }}>
                        <Typography sx={{fontWeight:600,mb:1,}}>Legend</Typography>
                        {legendRanges && (
                            <Box sx={{mb:2}}>
                                <Box sx={{display:'flex'}} >
                                    <Typography sx={{fontSize:13,fontWeight:500,mx:.5}} >
                                        {formatString(menuItemValue)}
                                    </Typography>
                                    {
                                        unit?(
                                            <Typography sx={{fontSize:13,fontWeight:500}}>
                                                {unit}
                                            </Typography>
                                        ):null
                                    }
                                </Box>
        
                                {Object.entries(legendRanges).map(([range, color]) => (
                                    <Box key={range} sx={{display:'flex',alignItems:'center',gap:1}} >
                                        <Box
                                            sx={{
                                                width: 14,
                                                height: 14,
                                                bgcolor: color,
                                                borderRadius: 7,
                                                border: "1px solid rgba(0,0,0,0.1)"
                                            }}
                                        />
                                        <Typography sx={{fontSize:12}} color="text.secondary">
                                            {range}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        
                    </Box>
                )
            }
        </Box>
    )
}

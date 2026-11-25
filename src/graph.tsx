
import { Box, Link, Typography } from '@mui/material'
import Chart from 'react-apexcharts'
interface Props{
    label: string
    xUnits?: string | Date
    requestUrl?:string
    yUnits?: string | Date
    xLabels: string[]  | number[] | Date[]
    uData: number[] | string[] | Date[]
}
const getRequestPath = (url?:string) => {
    if (!url) {
        return ""
    }
    const apiKey = import.meta.env.VITE_API_KEY;
    return url+`&api_key=${apiKey}`
}

export default function SimpleAreaChart({xLabels,requestUrl,label,yUnits,uData}:Props) {
    return (
        <Box>
            <Chart
                width={700}
                series={[
                    {
                        name: label,
                        type:'line',
                        color:'#4592F6',
                        data: uData as number[]
                    }
                ]}
                options={{
                    annotations:{
                        xaxis:[]
                    },
                    tooltip:{
                        y: {
                            formatter: (value) => value + " "+yUnits
                        },
                        x:{
                            formatter: (value) => new Date(value).toUTCString()
                        }
                    },
                    grid:{
                        show: true,
                        borderColor: '#e0e0e0', 
                        strokeDashArray: 0,
                        position: 'back',
                        xaxis: {
                            lines: {
                                show: true
                            }
                        },
                        yaxis: {
                            lines: {
                                show: true,
                            }
                        }
                    },
                    title:{
                        text: label
                    },
                    chart: {
                        height: 500,
                        type: "area",
                        animations: {
                            enabled: true,
                            dynamicAnimation: {
                                speed: 1000
                            }
                        },
    
                    },
                    yaxis: {
                        title: {
                            text: label + (yUnits? ` (${yUnits})`:'')
                        }
                    },
                    dataLabels:{
                        enabled: false,
                    },
                    stroke: {
                        curve: 'smooth',
                        width: 2
                    },
                    xaxis:{
                        categories: xLabels as string[]  | number[],
                        tooltip:{
                            enabled: false
                        },
                        type:"datetime",
                        title:{
                            text: 'Time'
                        },
                        labels:{
                            hideOverlappingLabels: true,
                            trim: true,
                            offsetX: -10,
                        }
                    }
                }}
            />  
            <Typography>
                <Link href={getRequestPath(requestUrl)} target="_blank" rel="noopener noreferrer">
                    Request URL Click here.
                </Link>
            </Typography>
                  
        </Box>
    );
}



import { useState } from 'react';
import LandData from './land-data';
import WaterData from './water-data';
const page = {
    "land": LandData,
    "water": WaterData
}
export default function App() {
    const [shownData,setShownData] = useState<"land"|"water">("land")
    const PageData = page[shownData]
    return (
        <main style={{height:'100%'}}>
            <PageData shownData={shownData} setShownData={(i)=>{setShownData(i)}}/>
        </main>
    )
}



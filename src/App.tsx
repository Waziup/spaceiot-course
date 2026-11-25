

import { useState } from 'react';
import LandData from './land-data';
import WaterData from './water-data';
import Demo1 from './demo1';
const page = {
    "land": LandData,
    "water": WaterData,
    "demo1": Demo1
}
export default function App() {
    const [shownData,setShownData] = useState<"land"|"water"|"demo1">("demo1")
    const PageData = page[shownData]
    return (
        <main style={{height:'100%'}}>
            <PageData shownData={shownData} setShownData={(i)=>{setShownData(i)}}/>
        </main>
    )
}



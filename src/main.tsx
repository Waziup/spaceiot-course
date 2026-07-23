import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTheme, ThemeProvider } from '@mui/material';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false,
            retryOnMount: false,
        },
    },
})
const theme = createTheme({
    palette:{
        background:{
            paper:'#ECECEC',
            default:'#ffffff',
        },
        info: {
            main:'rgba(23,141,124, 1)',
        },
        secondary:{
            main:'#E8F4F2'
        },
        
    },
    typography: {

        h1:{
            color:'#7E94A9'
        },
        h3:{
            color:'#7E94A9'
        },
        h4:{
            color:'#7E94A9'
        },
        h5:{
            color:'rgba(23,141,124, 1)',
            fontWeight:'medium',
            fontSize:24
        },
        h6:{

        },
        subtitle1:{
            color:'#7E94A9'
        }, 
        subtitle2:{
            color:'#7E94A9',
            fontSize: 16
        }, 
    }
})
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </ThemeProvider>
    </StrictMode>,
)

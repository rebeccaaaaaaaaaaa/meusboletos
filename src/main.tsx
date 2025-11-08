import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Provider } from './components/ui/provider.tsx'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './routes/index.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <BrowserRouter>
        <AppRoutes />
       </BrowserRouter>
    </Provider>
  </StrictMode>,
)

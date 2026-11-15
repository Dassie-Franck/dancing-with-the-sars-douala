import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './infrastructure/maplibre/worker.js' // URL du worker MapLibre, pour toutes les cartes de l'application
import App from './App.jsx'
import { createContainer } from './app/container.js'
import { ServicesProvider } from './app/services.jsx'

// Les adaptateurs (données factices ou API) sont choisis une seule fois, ici.
const services = createContainer()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './infrastructure/maplibre/worker.js' // URL du worker MapLibre, pour toutes les cartes de l'application
import App from './App.jsx'
import { createContainer } from './app/container.js'
import { ServicesProvider } from './app/services.jsx'
import { I18nProvider } from './i18n/index.jsx'

// Les adaptateurs (fichiers statiques ou API) sont choisis une seule fois, ici.
const services = createContainer()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <ServicesProvider services={services}>
        <App />
      </ServicesProvider>
    </I18nProvider>
  </StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import posthog from 'posthog-js'

posthog.init('phc_DmbnP3CdVTFJEer32xhh3D2rQX2btPMBT6dMez6FVZ5w', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
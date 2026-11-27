/**
 * Module: main
 * Purpose: Entry point: load the theme, publish lane colours as CSS
 *          variables, and mount the app.
 * Owner: Full Stack team
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import './theme/index.js'
import { applyLaneColorTokens } from './theme/lanes.js'
import App from './App.jsx'

applyLaneColorTokens()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

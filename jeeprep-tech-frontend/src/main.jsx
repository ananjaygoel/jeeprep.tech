import React from 'react'
import ReactDOM from 'react-dom/client'
import AppContainer from './App.jsx' // Your main app component
import './index.css' // Your global styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppContainer />
  </React.StrictMode>,
)
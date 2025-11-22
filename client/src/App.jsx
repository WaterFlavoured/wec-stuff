import React from 'react'
import './App.css'
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Chapter1 from './pages/Chapter1.jsx';
import Chapter2 from './pages/Chapter2.jsx';

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chapter1" element={<Chapter1 />} />
        <Route path="/chapter2" element={<Chapter2 />} />
      </Routes>
    </>
  )
}

export default App
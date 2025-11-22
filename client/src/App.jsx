import React from 'react'
import './App.css'
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Chapter1 from './pages/Chapter1.jsx';
import Chapter3 from './pages/Chapter3.jsx';
import AbyssGame from './AbyssGame.jsx';

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chapter1" element={<Chapter1 />} />
        <Route path="/chapter2" element={<AbyssGame />} />
        <Route path="/chapter3" element={<Chapter3 />} />
      </Routes>
    </>
  )
}

export default App
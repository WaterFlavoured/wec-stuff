import React from 'react';
import './Home.css';
import { useNavigate } from 'react-router-dom';
import submarineImg from '../Assets/submarine.png';

const Home = () => {
  const navigate = useNavigate();
  return (
    // Base of Home Page
    <div className="home">
      {/* Bubble creation */}
      <div className="bubbles">
        <span className="bubble"></span>
        <span className="bubble"></span>
        <span className="bubble"></span>
        <span className="bubble"></span>
        <span className="bubble"></span>
        <span className="bubble"></span>
      </div>

      {/* Home Page Title */}
      <h1 className="title">Deep Sea Exploration</h1>

      {/* Submarine Image */}
      <img src={submarineImg} alt="submarine" className="submarine" />

      {/* Play Button ~ taking player to Chapter1 of the game*/}
      <button className="play-button" onClick={() => navigate('/Chapter1')}>Play Now</button>
    </div>
  );
};

export default Home;
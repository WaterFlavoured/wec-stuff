import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import "./Chapter1.css"; // Import the new CSS file
import SubmarineIMG from "../assets/submarine-clipart-xl.png";
import { useNavigate } from 'react-router-dom';

import Wave from "../components/Wave.jsx";
import StoryBlock from "../components/StoryBlock.jsx";
import Bubble from "../components/Bubble.jsx";
import Fish from "../components/Fish.jsx";

const Chapter1 = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001
  });

  // Dynamic background color must stay in JS to react to scroll
  const backgroundColor = useTransform(
    smoothScroll,
    [0, 0.15, 0.3, 1],
    ["#87CEEB", "#ff9f1c", "#006994", "#020204"]
  );

  const titleOpacity = useTransform(smoothScroll, [0, 0.15], [1, 0]);
  const titleScale = useTransform(smoothScroll, [0, 0.15], [1, 1.5]);

  return (
    <motion.div
      ref={containerRef}
      className="chapter-container"
      style={{ background: backgroundColor }} // Dynamic style
    >
      {/* TITLE CARD */}
      <div className="title-card">
        <motion.div 
            className="title-content"
            style={{ opacity: titleOpacity, scale: titleScale }} // Dynamic style
        >
            <h1 className="chapter-title">CHAPTER 1</h1>
            <h2 className="chapter-subtitle">The Descent</h2>
            <p className="scroll-hint">↓ Scroll to dive</p>
        </motion.div>
      </div>

      {/* THE SUBMARINE */}
      <div className="submarine-wrapper">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <img src={SubmarineIMG} alt="Submarine" className="submarine-image"/>
        </motion.div>
      </div>

      
      {/* STORY MARKERS */}
      <div className="story-layer">
        <StoryBlock top="20%" text="We left the surface at dawn..." color="#333" />
        <StoryBlock top="40%" text="The sunlight began to fade at 200 meters." color="#caf0f8" />
        <StoryBlock top="60%" text="By 1000 meters, we were alone in the dark." color="#90e0ef" />
        <StoryBlock top="93%" text="And eventually... seafloor." color="#fff" />
      </div>
      
      {/* PARTICLES */}
      <Wave top="6%"/>
      <Bubble top="15%" left="10%" speed={-100} scroll={smoothScroll} />
      <Bubble top="20%" left="50%" speed={-100} scroll={smoothScroll} />
      <Bubble top="23%" left="70%" speed={-100} scroll={smoothScroll} />
      <Bubble top="30%" left="30%" speed={-100} scroll={smoothScroll} />
      <Bubble top="20%" left="40%" speed={-100} scroll={smoothScroll} />
      <Bubble top="25%" left="150%" speed={-100} scroll={smoothScroll} />
      
      <Bubble top="45%" left="80%" speed={-200} scroll={smoothScroll} />
      <Bubble top="65%" left="20%" speed={-400} scroll={smoothScroll} />
      <Bubble top="90%" left="50%" speed={-600} scroll={smoothScroll} />

      <Fish top="25%" left="5%" speed={1000} scroll={smoothScroll} />
      <Fish top="25.4%" left="8%" speed={1000} scroll={smoothScroll} />
      <Fish top="26%" left="6%" speed={1000} scroll={smoothScroll} />

      <div className="chapter-buttons">
        <button className="play-button" onClick={() => navigate('/Chapter2')}>Venture the Abyss</button>
        <button className="play-button" onClick={() => navigate('/Chapter3')}>Explore Coral Reefs</button>
      </div>
    </motion.div>
  );
};

export default Chapter1;
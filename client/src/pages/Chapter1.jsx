import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const Chapter1 = () => {
  const containerRef = useRef(null);

  // 1. Track Scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // 2. Smooth Scroll Physics
  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001
  });

  // 3. Story Atmosphere: Sky -> Sunset -> Ocean -> Pitch Black
  const backgroundColor = useTransform(
    smoothScroll,
    [0, 0.15, 0.3, 1],
    ["#87CEEB", "#ff9f1c", "#006994", "#020204"]
  );

  // 4. Fade out the big title as we submerge
  const titleOpacity = useTransform(smoothScroll, [0, 0.15], [1, 0]);
  const titleScale = useTransform(smoothScroll, [0, 0.15], [1, 1.5]);

  return (
    <motion.div
      ref={containerRef}
      style={{
        height: "500vh", // Extra long for storytelling
        background: backgroundColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* --- TITLE CARD (Only visible at top) --- */}
      <div style={{ 
          position: "fixed", 
          top: 0, left: 0, right: 0, bottom: 0, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          pointerEvents: "none", // Let clicks pass through
          zIndex: 5
      }}>
        <motion.div style={{ opacity: titleOpacity, scale: titleScale, textAlign: "center" }}>
            <h1 style={{ fontSize: "5rem", marginBottom: "0", color: "#fff", textShadow: "0 5px 10px rgba(0,0,0,0.3)" }}>
                CHAPTER 1
            </h1>
            <h2 style={{ fontSize: "2rem", marginTop: "0", color: "#fff", fontWeight: "300" }}>
                The Descent
            </h2>
            <p style={{ color: "white", marginTop: "20px" }}>↓ Scroll to dive</p>
        </motion.div>
      </div>

      {/* --- THE SUBMARINE (The Protagonist) --- */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
        }}
      >
        <motion.div
          // Slight rotation based on scroll speed logic could go here
          animate={{ y: [0, -10, 0] }} // Idle floating
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <SubmarineSVG />
        </motion.div>
      </div>

      {/* --- STORY MARKERS (Narrative layers) --- */}
      <div style={{ width: "100%", position: "absolute", top: 0, height: "100%" }}>
        {/* These act as the background passing by */}
        <StoryBlock top="20%" text="We left the surface at dawn..." color="#333" />
        <StoryBlock top="40%" text="The sunlight began to fade at 200 meters." color="#caf0f8" />
        <StoryBlock top="60%" text="By 1000 meters, we were alone in the dark." color="#90e0ef" />
        <StoryBlock top="85%" text="And then... we saw it." color="#fff" />
      </div>
      
      {/* --- ATMOSPHERIC PARTICLES --- */}
      <Bubble top="15%" left="10%" speed={-100} scroll={smoothScroll} />
      <Bubble top="45%" left="80%" speed={-200} scroll={smoothScroll} />
      <Bubble top="65%" left="20%" speed={-400} scroll={smoothScroll} />
      <Bubble top="90%" left="50%" speed={-600} scroll={smoothScroll} />

    </motion.div>
  );
}

const StoryBlock = ({ top, text, color }) => (
  <div
    style={{
      position: "absolute",
      top: top,
      width: "100%",
      textAlign: "center",
      color: color,
      fontSize: "2rem",
      fontWeight: "bold",
      padding: "0 20px",
      boxSizing: "border-box"
    }}
  >
    {text}
  </div>
);

const Bubble = ({ top, left, speed, scroll }) => {
    const y = useTransform(scroll, [0, 1], [0, speed]);
    return (
        <motion.div 
            style={{ 
                position: 'absolute', 
                top, left, y, 
                width: 10, height: 10, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.4)' 
            }} 
        />
    )
}

const SubmarineSVG = () => (
  <svg width="200" height="200" viewBox="0 0 100 100" fill="none">
    {/* Simple Stylized Submarine */}
    <path d="M20 55 C 20 40, 80 40, 80 55 C 80 70, 20 70, 20 55 Z" fill="#FFD700" stroke="#111" strokeWidth="2" />
    <rect x="45" y="30" width="12" height="15" fill="#FFD700" stroke="#111" strokeWidth="2" />
    <circle cx="80" cy="55" r="6" fill="#FFD700" stroke="#111" strokeWidth="2" />
    <line x1="86" y1="55" x2="95" y2="55" stroke="#111" strokeWidth="2" />
    {/* Portholes */}
    <circle cx="35" cy="55" r="3" fill="#bde0fe" stroke="#111" strokeWidth="1" />
    <circle cx="50" cy="55" r="3" fill="#bde0fe" stroke="#111" strokeWidth="1" />
    <circle cx="65" cy="55" r="3" fill="#bde0fe" stroke="#111" strokeWidth="1" />
  </svg>
);

export default Chapter1
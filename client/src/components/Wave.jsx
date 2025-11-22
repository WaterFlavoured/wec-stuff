import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import './Wave.css';
const Wave = ({ top, height = 100, amplitude = 30, frequency = 0.05, speed = 0.05 }) => {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [phase, setPhase] = useState(0)

  // measure container width
  useEffect(() => {
      const onResize = () => setWidth(window.innerWidth || document.documentElement.clientWidth)
      onResize()
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
  }, [])

  // animation loop
  useEffect(() => {
    let animationFrameId
    const animate = () => {
      setPhase(p => p + speed)
      animationFrameId = requestAnimationFrame(animate)
    }
    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [speed])

  const generateSineWavePath = () => {
    const w = width || 0
    if (w === 0) return ''
    const step = Math.max(1, Math.floor(w / 800)) // reduce points on very wide screens
    let pathData = `M 0 ${height / 2}`
    for (let x = 0; x <= w; x += step) {
      const y = height / 2 + amplitude * Math.sin(frequency * x + phase)
      pathData += ` L ${x} ${y}`
    }
    return pathData
  }

  return (
    <motion.div style={{ top: top, position: 'absolute' }} ref={containerRef}>
        <div className="wave-width">
            <svg width={width} height={height} preserveAspectRatio="none">
                <defs>
                    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#007bff" />
                    </linearGradient>
                </defs>

                <path
                  d={generateSineWavePath()}
                  className="wave-path"
                  stroke="url(#waveGradient)"
                  fill="none"
                />
            </svg>
        </div>
    </motion.div>
  )
}

export default Wave
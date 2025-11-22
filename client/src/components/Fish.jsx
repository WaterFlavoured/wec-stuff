import React from 'react'
import { motion, useTransform } from "framer-motion";
import FishIMG from '../assets/clownfish-fish-transparent-free-png.png';
import './Fish.css';

const Fish = ({ top = "20%", left, speed = 300, scroll }) => {
  const x = useTransform(scroll, [0, 1], [0, speed]);

  return (
    <motion.div style={{ position: 'absolute', top, left, x }}>
        <img src={FishIMG} alt="Fish" className="fish-image" />
    </motion.div>
  )
}
export default Fish
import React from 'react'
import { motion, useTransform } from "framer-motion";
import './Bubble.css';

const Bubble = ({ top, left, speed, scroll }) => {
    const y = useTransform(scroll, [0, 1], [0, speed]);
    
    return (
        <motion.div 
            className="bubble"
            // 'y' is dynamic motion value, 'top/left' are instance specific
            style={{ top, left, y }} 
        />
    )
}

export default Bubble
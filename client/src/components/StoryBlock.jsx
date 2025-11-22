import React from 'react'

const StoryBlock = ({ top, text, color }) => {
  return (
    <div
        className="story-block"
        // We keep 'top' and 'color' inline because they vary per instance
        style={{ top: top, color: color }}
    >
        {text}
    </div>
  )
}

export default StoryBlock
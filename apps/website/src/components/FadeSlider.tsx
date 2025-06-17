import React, { useEffect, useState } from "react";

export interface FadeSliderProps {
  slides: React.ReactNode[];
  /** Interval between automatic slide changes in milliseconds */
  interval?: number;
}

const FadeSlider: React.FC<FadeSliderProps> = ({ slides, interval = 5000 }) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return; // nothing to cycle
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => clearInterval(id);
  }, [slides.length, interval]);

  return (
    <div className="fade-slider">
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className={"fade-slide" + (active === idx ? " active" : "")}
        >
          {slide}
        </div>
      ))}
      {slides.length > 1 && (
        <div className="fade-dots">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={"fade-dot" + (active === idx ? " active" : "")}
              onClick={() => setActive(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FadeSlider;

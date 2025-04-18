import { useState } from "react";

const ProductDescription = () => {
  const [expanded, setExpanded] = useState(false);

  const description = [
    "This non-greasy body lotion heals dry skin to reveal its natural glow - With micro-droplets of Vaseline jelly to lock in moisture - Best for dry skin, dull skin, rough skin - With 100% Pure Cocoa Butter (Reine Kakaobutter) and Shea Butter (Sheabutter)",
    "Vaseline Cocoa Radiant lotion helps heal dry skin while providing a natural glow. The formula contains micro-droplets of Vaseline jelly that lock in moisture, making it ideal for dry, dull, or rough skin conditions.",
    "The unique formula combines the healing power of Vaseline Jelly with rich moisturizers to provide deep hydration. It absorbs quickly without feeling greasy, leaving your skin soft, smooth, and naturally radiant throughout the day.",
  ];

  const visibleDescription = expanded ? description : description.slice(0, 1);

  return (
    <div className="space-y-3 sm:space-y-4">
      {visibleDescription.map((paragraph, index) => (
        <p key={index} className="text-xs sm:text-sm leading-relaxed">
          {paragraph}
        </p>
      ))}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
};

export default ProductDescription;

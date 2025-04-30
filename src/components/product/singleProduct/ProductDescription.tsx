import { useState } from "react";

const ProductDescription = ({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);

  const visibleDescription = expanded ? description : description.slice(0, 251);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* {visibleDescription.map((paragraph, index) => ( */}
      <p className="text-xs sm:text-sm leading-relaxed">{visibleDescription}</p>
      {/* ))} */}

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

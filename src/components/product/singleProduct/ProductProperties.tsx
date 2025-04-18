import { useState } from "react";
import { MdCheck } from "react-icons/md";

interface Property {
  id: string;
  name: string;
  options: {
    id: string;
    name: string;
    value?: string;
    hex?: string;
    disabled?: boolean;
  }[];
}

const ProductProperties = () => {
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({
    type: "Cream",
    color: "red",
    size: "250ml",
  });

  const properties: Property[] = [
    {
      id: "type",
      name: "Type",
      options: [
        { id: "cream", name: "Cream" },
        { id: "milk", name: "Milk" },
        { id: "almond", name: "Almond" },
      ],
    },
    {
      id: "size",
      name: "Size",
      options: [
        { id: "100ml", name: "100ml", value: "100ml" },
        { id: "250ml", name: "250ml", value: "250ml" },
        { id: "500ml", name: "500ml", value: "500ml", disabled: true },
      ],
    },
    {
      id: "color",
      name: "Color",
      options: [
        { id: "red", name: "Red", hex: "#ff343f" },
        { id: "blue", name: "Blue", hex: "#3e66fb" },
        { id: "yellow", name: "Yellow", hex: "#ffb800" },
        { id: "green", name: "Green", hex: "#4caf50" },
      ],
    },
  ];

  const handleOptionSelect = (propertyId: string, optionId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [propertyId]: optionId,
    }));
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {properties.map((property) => (
        <div key={property.id} className="space-y-2">
          <p className="text-white text-sm sm:text-base mb-2">
            {property.name}
          </p>

          {property.id === "color" ? (
            // Color selection
            <div className="flex gap-2 sm:gap-3">
              {property.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(property.id, option.id)}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full relative transition-all ${
                    option.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:scale-110"
                  } ${
                    selectedOptions[property.id] === option.id
                      ? "ring-2 ring-white ring-offset-1 ring-offset-[#212428]"
                      : ""
                  }`}
                  style={{ backgroundColor: option.hex }}
                  aria-label={`${option.name} color`}
                  disabled={option.disabled}
                >
                  {selectedOptions[property.id] === option.id && (
                    <span className="absolute inset-0 flex items-center justify-center text-white">
                      <MdCheck size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            // Text-based selection (Type, Size, etc.)
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {property.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(property.id, option.id)}
                  disabled={option.disabled}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    selectedOptions[property.id] === option.id
                      ? "bg-Red text-white"
                      : "text-white/70 hover:bg-gray-700/50"
                  } ${option.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {option.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProductProperties;

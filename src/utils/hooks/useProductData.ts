
import { useState, useEffect } from "react";

export const useProductData = (productId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        // API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock data
        setProduct({
          id: productId,
          name: "Vaseline Cocoa Radiant Lotion",
          price: "0.0002 ETH",
          description: "This non-greasy body lotion heals dry skin to reveal its natural glow...",
          properties: {
            availableTypes: ["Cream", "Milk", "Almond"],
            availableColors: ["red", "blue", "yellow", "green"]
          },
          seller: "DanBike",
          verified: true,
          availability: 300
        });
      } catch (err) {
        setError("Failed to load product data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { loading, product, error };
};
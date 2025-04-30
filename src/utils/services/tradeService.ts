import { fetchWithAuth } from "./apiService";

export const useTradeService = () => {
  const createTrade = async (tradeData: {
    orderId: string;
    buyer: string;
    seller: string;
    amount: number;
    status: string;
  }) => {
    const response = await fetchWithAuth("/contracts/trades", {
      method: "POST",
      body: JSON.stringify(tradeData),
    });
    return response;
  };

  const getTradeById = async (tradeId: string) => {
    const response = await fetchWithAuth(`/contracts/trades/${tradeId}`);
    return response;
  };

  return {
    createTrade,
    getTradeById,
  };
};

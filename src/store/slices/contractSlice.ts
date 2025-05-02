import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { CreateTradeParams, TradeResponse } from "../../utils/types";
import { api } from "../../utils/services/apiService";

interface ContractState {
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
  tradeResponse: TradeResponse | null;
  transactionPending: boolean;
  deliveryConfirmLoading: boolean;
  deliveryConfirmError: string | null;
}

const initialState: ContractState = {
  loading: "idle",
  error: null,
  tradeResponse: null,
  transactionPending: false,
  deliveryConfirmLoading: false,
  deliveryConfirmError: null,
};

export const createTrade = createAsyncThunk<
  TradeResponse,
  CreateTradeParams,
  { rejectValue: string }
>("contract/createTrade", async (tradeData, { rejectWithValue }) => {
  try {
    const response = await api.createTrade(tradeData);

    if (!response.ok) {
      return rejectWithValue(
        response.error || "Failed to create trade contract"
      );
    }

    return response.data as TradeResponse;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return rejectWithValue(message);
  }
});

export const confirmDelivery = createAsyncThunk<
  { status: string; message: string },
  string,
  { rejectValue: string }
>("contract/confirmDelivery", async (tradeId, { rejectWithValue }) => {
  try {
    const response = await api.confirmDelivery(tradeId);

    if (!response.ok) {
      return rejectWithValue(response.error || "Failed to confirm delivery");
    }

    return response.data as { status: string; message: string };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return rejectWithValue(message);
  }
});

const contractSlice = createSlice({
  name: "contract",
  initialState,
  reducers: {
    clearTradeResponse: (state) => {
      state.tradeResponse = null;
    },
    setTransactionPending: (state, action: PayloadAction<boolean>) => {
      state.transactionPending = action.payload;
    },
    clearDeliveryConfirmError: (state) => {
      state.deliveryConfirmError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTrade.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(
        createTrade.fulfilled,
        (state, action: PayloadAction<TradeResponse>) => {
          state.loading = "succeeded";
          state.tradeResponse = action.payload;
        }
      )
      .addCase(createTrade.rejected, (state, action) => {
        state.loading = "failed";
        state.error = (action.payload as string) || "Unknown error occurred";
      })
      .addCase(confirmDelivery.pending, (state) => {
        state.deliveryConfirmLoading = true;
        state.deliveryConfirmError = null;
      })
      .addCase(confirmDelivery.fulfilled, (state) => {
        state.deliveryConfirmLoading = false;
      })
      .addCase(confirmDelivery.rejected, (state, action) => {
        state.deliveryConfirmLoading = false;
        state.deliveryConfirmError =
          (action.payload as string) || "Failed to confirm delivery";
      });
  },
});

export const {
  clearTradeResponse,
  setTransactionPending,
  clearDeliveryConfirmError,
} = contractSlice.actions;
export default contractSlice.reducer;

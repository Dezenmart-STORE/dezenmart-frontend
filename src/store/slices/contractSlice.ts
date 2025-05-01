import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { CreateTradeParams, TradeResponse } from "../../utils/types";
import { api } from "../../utils/services/apiService";

interface ContractState {
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
  tradeResponse: TradeResponse | null;
}

const initialState: ContractState = {
  loading: "idle",
  error: null,
  tradeResponse: null,
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

const contractSlice = createSlice({
  name: "contract",
  initialState,
  reducers: {
    clearTradeResponse: (state) => {
      state.tradeResponse = null;
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
      });
  },
});

export const { clearTradeResponse } = contractSlice.actions;
export default contractSlice.reducer;

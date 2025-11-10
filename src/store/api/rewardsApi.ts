import { baseApi } from './baseApi';
import type { Reward, RewardSummary } from '../../utils/types';

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get reward summary
    getRewardSummary: builder.query<RewardSummary, void>({
      query: () => '/rewards/summary',
      providesTags: ['Rewards'],
    }),

    // Get reward history
    getRewardHistory: builder.query<Reward[], void>({
      query: () => '/rewards/history',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Rewards' as const, id: _id })),
              { type: 'Rewards', id: 'HISTORY' },
            ]
          : [{ type: 'Rewards', id: 'HISTORY' }],
    }),

    // Redeem rewards
    redeemRewards: builder.mutation<
      { success: boolean; message: string; newBalance: number },
      { points: number; rewardType: string }
    >({
      query: (data) => ({
        url: '/rewards/redeem',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Rewards', 'User'],
      // Optimistic update for reward summary
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          rewardsApi.util.updateQueryData('getRewardSummary', undefined, (draft) => {
            if (draft.availablePoints >= data.points) {
              draft.availablePoints -= data.points;
            }
          })
        );
        try {
          const { data: result } = await queryFulfilled;
          // Update with actual balance from server
          dispatch(
            rewardsApi.util.updateQueryData('getRewardSummary', undefined, (draft) => {
              draft.availablePoints = result.newBalance;
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetRewardSummaryQuery,
  useGetRewardHistoryQuery,
  useRedeemRewardsMutation,
} = rewardsApi;

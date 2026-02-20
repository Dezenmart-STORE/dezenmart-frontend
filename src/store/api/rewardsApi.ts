import { baseApi } from './baseApi';
import type { Reward, RewardSummary } from '../../utils/types';

export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get rewards summary
    getRewardsSummary: builder.query<RewardSummary, void>({
      query: () => '/rewards/summary',
      providesTags: [{ type: 'Rewards', id: 'SUMMARY' }],
    }),

    // Get rewards history
    getRewards: builder.query<Reward[], void>({
      query: () => '/rewards',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Rewards' as const, id: _id })),
              { type: 'Rewards', id: 'LIST' },
            ]
          : [{ type: 'Rewards', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetRewardsSummaryQuery,
  useGetRewardsQuery,
} = rewardsApi;

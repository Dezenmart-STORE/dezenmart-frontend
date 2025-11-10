import { baseApi } from './baseApi';
import type { Notification } from '../../utils/types';

interface NotificationCount {
  count: number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all notifications
    getUserNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),

    // Get unread notification count
    getUnreadNotificationCount: builder.query<NotificationCount, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notifications'],
    }),

    // Mark notifications as read
    markNotificationsAsRead: builder.mutation<{ success: boolean }, { notificationIds: string[] }>({
      query: (data) => ({
        url: '/notifications/mark-read',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
      }),
      invalidatesTags: ['Notifications'],
      // Optimistic update
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getUserNotifications', undefined, (draft) => {
            draft.forEach((notification) => {
              if (data.notificationIds.includes(notification._id)) {
                notification.read = true;
              }
            });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Mark all as read
    markAllRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Delete notification
    deleteNotification: builder.mutation<void, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetUserNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationsAsReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi;

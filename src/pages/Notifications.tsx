import { motion, AnimatePresence } from "framer-motion";
import { IoChevronBackOutline } from "react-icons/io5";
import { useGetUserNotificationsQuery, useMarkNotificationsAsReadMutation } from "../store/api/notificationsApi";
import { HiChevronRight } from "react-icons/hi";
import NotificationItem from "../components/notifications/NotificationItem";
import EmptyNotifications from "../components/notifications/EmptyNotifications";
import Container from "../components/common/Container";

const NotificationPage = () => {
  // RTK Query hooks
  const { data: notifications = [], isLoading } = useGetUserNotificationsQuery();
  const [markAsReadMutation] = useMarkNotificationsAsReadMutation();

  const hasUnread = notifications.some((n: any) => !n.read);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation({ notificationIds: [id] }).unwrap();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mark all notifications as read by passing all notification IDs
      const allNotificationIds = notifications.map((n: any) => n._id);
      await markAsReadMutation({ notificationIds: allNotificationIds }).unwrap();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-[#212428] min-h-screen"
      >
        <div className="p-4 my-12 relative">
          <IoChevronBackOutline
            className="h-6 w-6 text-white absolute top-1/2 -translate-y-1/2"
            onClick={() => window.history.back()}
          />
          <h1 className="w-fit mx-auto text-xl font-bold text-white text-[34px]">
            Notifications
          </h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 border-2 border-Red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          <div>
            <AnimatePresence>
              {hasUnread &&
                notifications.some((n) => n.type === "update" && !n.read) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="max-w-md mx-auto rounded-lg mb-4 bg-Red text-white p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center mr-3">
                        <span className="text-white text-sm">!</span>
                      </div>
                      <div>
                        <p className="font-medium">
                          We released some new Updates
                        </p>
                        <p className="text-sm opacity-80">Check them out!</p>
                      </div>
                    </div>
                    <HiChevronRight className="text-white text-xl" />
                  </motion.div>
                )}
            </AnimatePresence>

            {hasUnread && (
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={() => markAllAsRead()}
                  className="w-fit text-sm text-Red hover:text-red-400 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
            )}

            <div className="divide-y divide-white">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyNotifications />
        )}
      </motion.div>
    </Container>
  );
};

export default NotificationPage;

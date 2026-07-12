import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiChevronRight } from 'react-icons/hi';
import type { Notification } from '../../utils/types';
import {
  getNotificationRoute,
  formatRelativeTime,
  getNotificationMeta,
} from '../../utils/notifications';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

const NotificationItem = ({ notification, onRead }: NotificationItemProps) => {
  const navigate = useNavigate();
  const route = getNotificationRoute(notification);
  const { icon: Icon, color, bgColor } = getNotificationMeta(notification.type);

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification._id);
    }
    if (route) {
      navigate(route);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`flex items-start p-4 cursor-pointer hover:bg-[#333940] transition-colors duration-200 relative ${
        notification.read ? 'bg-[#22252b]' : 'bg-[#292B30]'
      }`}
    >
      {/* Unread left border accent */}
      {!notification.read && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-Red rounded-r-full" />
      )}

      {/* Icon bubble */}
      <div className={`flex-shrink-0 mr-3 w-10 h-10 rounded-full ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* Message + time */}
      <div className="flex-grow min-w-0">
        <p
          className={`text-sm leading-snug ${
            !notification.read ? 'font-medium text-white' : 'text-gray-300'
          }`}
        >
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Chevron - only shown when there is a route */}
      {route && (
        <HiChevronRight className="text-gray-500 flex-shrink-0 ml-2 text-lg self-center" />
      )}
    </motion.div>
  );
};

export default NotificationItem;

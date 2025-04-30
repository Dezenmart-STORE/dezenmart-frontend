import { motion } from "framer-motion";
// import { format } from "date-fns";
import { Link } from "react-router-dom";
import { HiChevronRight } from "react-icons/hi";
import { Notification } from "../../utils/types";

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

const NotificationItem = ({ notification, onRead }: NotificationItemProps) => {
  const getTimeString = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 1) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }
  };

  const itemContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start p-4 ${
        notification.isRead ? "bg-[#22252b]" : "bg-[#292B30]"
      }`}
      onClick={handleClick}
    >
      {notification.icon && (
        <div className="flex-shrink-0 mr-3">
          <img
            src={notification.icon}
            alt="Notification icon"
            className="w-10 h-10 rounded-full object-cover"
          />
        </div>
      )}

      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start">
          <p
            className={`text-sm ${
              !notification.isRead ? "text-white" : "text-gray-300"
            }`}
          >
            {notification.message}
          </p>
          {!notification.isRead && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 rounded-full bg-Red flex-shrink-0 ml-2 mt-1"
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {getTimeString(notification.timestamp)}
        </p>
      </div>

      {notification.type === "update" && (
        <HiChevronRight className="text-gray-400 flex-shrink-0 ml-2 text-lg" />
      )}
    </motion.div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} className="block">
        {itemContent}
      </Link>
    );
  }

  return itemContent;
};

export default NotificationItem;

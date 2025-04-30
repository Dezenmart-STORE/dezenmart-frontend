
import { useState, useEffect } from 'react';
import { Notification } from '../types';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    //  API call
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // Mock data
        const mockNotifications: Notification[] = [
        //   {
        //     id: '1',
        //     type: 'update',
        //     message: 'We released some new Updates\nCheck them out!',
        //     isRead: false,
        //     timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        //     link: '/updates'
        //   },
          {
            id: '1',
            type: 'funds',
            message: 'funds are released, is that you?',
            isRead: false,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
            icon: '/images/avatar2.png'
          },
          {
            id: '2',
            type: 'buyer',
            message: 'Hey Peter, we\'ve got a newb buyer for you. Adam from The Mayor\'s Office is looking for new product like yours.',
            isRead: true,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
            icon: '/images/logo.png'
          },
        ];
        
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true } 
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};
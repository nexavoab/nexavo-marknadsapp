import { useState, useEffect } from 'react'
import { Bell, Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  type Notification
} from '@/lib/notifications'

function getNotificationIcon(type: string) {
  switch (type) {
    case 'campaign_urgent':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'campaign_live':
      return <Check className="h-5 w-5 text-green-500" />;
    default:
      return <Bell className="h-5 w-5 text-blue-500" />;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function FranchiseNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await fetchNotifications(50);
      setNotifications(result.notifications);
      setLoading(false);
    }
    load();
  }, []);

  async function handleMarkAsRead(notificationId: string) {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
    }
  }

  async function handleMarkAllAsRead() {
    const success = await markAllAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/portal"
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Notifikationer</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} olästa` : 'Alla lästa'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-primary hover:underline"
          >
            Markera alla lästa
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            Laddar notifikationer...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-1">Inga notifikationer</h3>
            <p className="text-sm text-muted-foreground">
              Du kommer att se notifikationer om kampanjer här
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                  !notification.read_at && "bg-blue-50 dark:bg-blue-950/20"
                )}
                onClick={() => !notification.read_at && handleMarkAsRead(notification.id)}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className={cn(
                        "text-sm",
                        !notification.read_at && "font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      {!notification.read_at && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

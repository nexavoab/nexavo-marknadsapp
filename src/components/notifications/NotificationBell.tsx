import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification
} from '@/lib/notifications'

interface NotificationBellProps {
  className?: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'campaign_urgent':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'campaign_live':
      return <Check className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-blue-500" />;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just nu';
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours}h sedan`;
  if (diffDays < 7) return `${diffDays}d sedan`;
  return date.toLocaleDateString('sv-SE');
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [notifResult, count] = await Promise.all([
        fetchNotifications(5),
        fetchUnreadCount()
      ]);
      setNotifications(notifResult.notifications);
      setUnreadCount(count);
      setLoading(false);
    }
    load();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkAsRead(notificationId: string) {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }

  async function handleMarkAllAsRead() {
    const success = await markAllAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    }
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} olästa)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <h3 className="font-semibold text-sm">Notifikationer</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Markera alla lästa
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Laddar...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Inga notifikationer ännu</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer",
                      !notification.read_at && "bg-blue-50 dark:bg-blue-950/20"
                    )}
                    onClick={() => !notification.read_at && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.read_at && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read_at && (
                        <div className="flex-shrink-0">
                          <span className="h-2 w-2 rounded-full bg-blue-500 block" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/50">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary hover:underline w-full text-center"
              >
                Se alla notifikationer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

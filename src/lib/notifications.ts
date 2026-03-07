import { supabase } from './supabase'

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export type NotificationType =
  | 'campaign_ready_for_approval'   // T-25: campaign ready for approval
  | 'campaign_reminder'              // T-5: reminder
  | 'campaign_urgent'                // T-2: urgent
  | 'campaign_live'                  // published
  | 'campaign_auto_approved'         // auto-approved
  | 'general';                       // general notification

export interface NotificationPayload {
  franchiseeId: string;
  franchiseeName: string;
  franchiseeEmail: string;
  campaignTitle: string;
  campaignId: string;
  type: NotificationType;
  daysUntilStart?: number;
  approvalUrl: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  franchisee_id: string | null;
  type: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  sent_at: string;
  channel: 'in_app' | 'email' | 'sms';
  created_at: string;
}

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

/**
 * Generate notification title and message based on type
 */
function getNotificationContent(payload: NotificationPayload): { title: string; message: string } {
  switch (payload.type) {
    case 'campaign_ready_for_approval':
      return {
        title: `${payload.campaignTitle} är redo att godkännas`,
        message: `Kampanjen "${payload.campaignTitle}" är redo för granskning. ${payload.daysUntilStart ? `${payload.daysUntilStart} dagar kvar till start.` : ''}`
      };
    case 'campaign_reminder':
      return {
        title: `Påminnelse: Godkänn ${payload.campaignTitle}`,
        message: `Glöm inte att granska och godkänna "${payload.campaignTitle}". ${payload.daysUntilStart ? `${payload.daysUntilStart} dagar kvar.` : ''}`
      };
    case 'campaign_urgent':
      return {
        title: `⚠️ Urgent: ${payload.campaignTitle} väntar`,
        message: `Kampanjen "${payload.campaignTitle}" behöver godkännas snart! ${payload.daysUntilStart ? `Endast ${payload.daysUntilStart} dagar kvar.` : ''}`
      };
    case 'campaign_live':
      return {
        title: `🎉 ${payload.campaignTitle} är nu live!`,
        message: `Grattis! Din kampanj "${payload.campaignTitle}" är nu publicerad och aktiv.`
      };
    case 'campaign_auto_approved':
      return {
        title: `${payload.campaignTitle} har auto-godkänts`,
        message: `Kampanjen "${payload.campaignTitle}" har automatiskt godkänts eftersom godkännandefristen har passerat.`
      };
    default:
      return {
        title: payload.campaignTitle,
        message: `Uppdatering angående "${payload.campaignTitle}".`
      };
  }
}

/**
 * Send a notification to a franchisee
 * Logs to Supabase notifications table (graceful degradation if fails)
 */
export async function sendNotification(
  payload: NotificationPayload,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { title, message } = getNotificationContent(payload);

    const { error } = await supabase
      .from('notifications')
      .insert({
        organization_id: organizationId,
        franchisee_id: payload.franchiseeId,
        type: payload.type,
        title,
        message,
        payload: {
          campaignId: payload.campaignId,
          campaignTitle: payload.campaignTitle,
          franchiseeName: payload.franchiseeName,
          franchiseeEmail: payload.franchiseeEmail,
          daysUntilStart: payload.daysUntilStart,
          approvalUrl: payload.approvalUrl
        },
        channel: 'in_app'
      });

    if (error) {
      console.error('[notifications] Failed to insert notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    // Graceful degradation - log but don't throw
    console.error('[notifications] Error sending notification:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch notifications for the current user's organization
 */
export async function fetchNotifications(
  limit: number = 10
): Promise<{ notifications: Notification[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[notifications] Failed to fetch notifications:', error);
      return { notifications: [], error: error.message };
    }

    return { notifications: data || [] };
  } catch (err) {
    console.error('[notifications] Error fetching notifications:', err);
    return { notifications: [], error: String(err) };
  }
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);

    if (error) {
      console.error('[notifications] Failed to fetch unread count:', error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('[notifications] Failed to mark as read:', error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);

    if (error) {
      console.error('[notifications] Failed to mark all as read:', error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

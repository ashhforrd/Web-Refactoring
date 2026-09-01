import type { TicketListItem } from '@relaydesk/shared';

export function toListItem(row: any, commentCount: number): TicketListItem {
  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    requesterEmail: row.requester_email,
    assigneeName: row.assignee_name ?? null,
    commentCount,
    updatedAt: row.updated_at,
  };
}

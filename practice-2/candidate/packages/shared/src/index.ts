import { z } from 'zod';

export const ticketStatus = z.enum(['open', 'pending', 'closed']);
export const priority = z.enum(['low', 'normal', 'high', 'urgent']);

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(160),
  body: z.string().min(1).max(10_000),
  requesterEmail: z.string().email(),
  priority: priority.default('normal'),
});

export const updateTicketSchema = z.object({
  status: ticketStatus.optional(),
  assigneeId: z.string().nullable().optional(),
  priority: priority.optional(),
});

export const addCommentSchema = z.object({
  body: z.string().min(1).max(10_000),
  public: z.boolean().default(false),
});

export type TicketStatus = z.infer<typeof ticketStatus>;
export type Priority = z.infer<typeof priority>;
export type SessionUser = { id: string; email: string; name: string };

export type TicketListItem = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  requesterEmail: string;
  assigneeName: string | null;
  commentCount: number;
  updatedAt: string;
};

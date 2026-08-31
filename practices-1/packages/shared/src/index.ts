import { z } from "zod";

export const loginInput = z.object({ email: z.string().email(), password: z.string().min(1) });
export const createCardInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000).default("")
});
export const updateCardInput = createCardInput.partial();

export type User = { id: string; email: string; displayName: string };
export type Card = {
  id: string;
  boardId: string;
  title: string;
  description: string;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
};
export type Board = { id: string; name: string; cards: Card[] };

import type { SessionUser } from '@relaydesk/shared';

export type AccessScope = { user: SessionUser; workspaceId: string };

export function workspaceScope(user: SessionUser, workspaceHeader?: string): AccessScope {
  if (!workspaceHeader) {
    throw new Error('Workspace header is required');
  }

  return { user, workspaceId: workspaceHeader };
}

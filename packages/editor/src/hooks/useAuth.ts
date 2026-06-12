import { useSyncExternalStore } from 'react';

export interface EditorUser {
  id?: string | number;
  email?: string;
  name?: string;
  color?: string;
  avatarPath?: string;
}

let currentUser: EditorUser | null = null;
const listeners = new Set<() => void>();

/** Set the active user (used for comment authorship). Wired by EditorProvider. */
export function setCurrentUser(user: EditorUser | null): void {
  currentUser = user;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): EditorUser | null {
  return currentUser;
}

export function useAuth(): { user: EditorUser | null } {
  const user = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { user };
}

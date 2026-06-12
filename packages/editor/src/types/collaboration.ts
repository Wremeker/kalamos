/** Minimal connected-user shape consumed by the (inert) remote cursor view. */
export interface ConnectedUser {
  id: string | number;
  name: string;
  color: string;
  avatarPath?: string;
}

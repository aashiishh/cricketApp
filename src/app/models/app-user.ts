export type UserRole = 'super-admin' | 'admin' | 'player';

export interface UserProfile {
  uid: string;
  email: string;
  phone?: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
  playerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppUser extends UserProfile {
  idToken: string;
  refreshToken: string;
  tokenExpirationDate: string;
}

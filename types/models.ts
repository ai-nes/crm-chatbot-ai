export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string[];
  avatarUrl?: string;
}

export interface DecodedToken extends User {
  nbf?: number;
  exp?: number;
  iat?: number;
}

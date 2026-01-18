export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthDto {
  token: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

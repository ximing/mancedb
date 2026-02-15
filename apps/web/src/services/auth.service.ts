import { Service } from '@rabjs/react';
import { login as loginApi, register as registerApi } from '../api/auth';

interface User {
  uid: string;
  email?: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
}

export class AuthService extends Service {
  isAuthenticated = false;
  user: User | null = null;
  token: string | null = localStorage.getItem('token');

  constructor() {
    super();
    // Check if token exists on initialization
    if (this.token) {
      this.isAuthenticated = true;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    const response = await loginApi({ email, password });
    if (response.code === 0 && (response.data as any).token) {
      this.token = (response.data as any).token;
      this.isAuthenticated = true;
      localStorage.setItem('token', (response.data as any).token);
      return true;
    }
    return false;
  }

  async register(email: string, password: string, nickname?: string): Promise<boolean> {
    const response = await registerApi({ email, password, nickname });
    if (response.code === 0 && (response.data as any).token) {
      this.token = (response.data as any).token;
      this.isAuthenticated = true;
      localStorage.setItem('token', (response.data as any).token);
      return true;
    }
    return false;
  }

  logout(): void {
    this.token = null;
    this.isAuthenticated = false;
    this.user = null;
    localStorage.removeItem('token');
  }
}

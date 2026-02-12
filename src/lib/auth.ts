const AUTH_API_URL = 'https://functions.poehali.dev/7f5283a8-d73f-4630-82d9-49a08c177e47';

export interface User {
  id: number;
  user_id?: string;
  email: string;
  full_name: string;
  role?: string;
  is_active?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const auth = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
  }, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register',
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const result = await response.json();
    
    if (rememberMe) {
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('auth_expires', expiresAt.toString());
    } else {
      sessionStorage.setItem('auth_token', result.token);
      sessionStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  },

  async login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'login',
        email,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    
    if (rememberMe) {
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('auth_expires', expiresAt.toString());
    } else {
      sessionStorage.setItem('auth_token', result.token);
      sessionStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  },

  async verify(): Promise<User | null> {
    const expiresAt = localStorage.getItem('auth_expires');
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      this.logout();
      return null;
    }
    
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'verify',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
        }
        return null;
      }

      const result = await response.json();
      return result.user;
    } catch (error) {
      console.error('Verify error:', error);
      const storedUser = this.getStoredUser();
      return storedUser;
    }
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_expires');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!(localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'));
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  },

  async updateProfile(data: {
    full_name?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<{ user: User }> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'update_profile',
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Update failed');
    }

    const result = await response.json();
    
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(result.user));
      } else {
        sessionStorage.setItem('user', JSON.stringify(result.user));
      }
    }
    
    return result;
  },
};
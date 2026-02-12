const USERS_API_URL = 'https://functions.poehali.dev/348afac0-d112-4953-b5da-6eafc2cf5bec';

export interface UserManagement {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export const usersApi = {
  async getUsers(token: string, status: 'all' | 'active' | 'pending' = 'all'): Promise<UserManagement[]> {
    const url = status !== 'all' ? `${USERS_API_URL}?status=${status}` : USERS_API_URL;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    const result = await response.json();
    return result.users;
  },

  async activateUser(token: string, userId: number): Promise<void> {
    const response = await fetch(USERS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'activate',
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to activate user');
    }
  },

  async deactivateUser(token: string, userId: number): Promise<void> {
    const response = await fetch(USERS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'deactivate',
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to deactivate user');
    }
  },

  async updateUser(token: string, userId: number, data: {
    full_name?: string;
    role?: string;
  }): Promise<void> {
    const response = await fetch(USERS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'update',
        user_id: userId,
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }
  },

  async deleteUser(token: string, userId: number): Promise<void> {
    const response = await fetch(`${USERS_API_URL}?user_id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
  },
};
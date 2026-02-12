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
  async getUsers(status: 'all' | 'active' | 'pending' = 'all'): Promise<UserManagement[]> {
    const url = status !== 'all' ? `${USERS_API_URL}?status=${status}` : USERS_API_URL;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    const result = await response.json();
    return result.users;
  },

  async activateUser(userId: number): Promise<void> {
    const response = await fetch(USERS_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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

  async deactivateUser(userId: number): Promise<void> {
    const response = await fetch(USERS_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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

  async updateUser(userId: number, data: {
    full_name?: string;
    role?: string;
    email?: string;
    user_id?: string;
    password?: string;
  }): Promise<void> {
    const bodyData: Record<string, string | number> = {
      action: 'update',
      user_id: userId,
    };
    
    if (data.full_name !== undefined) bodyData.full_name = data.full_name;
    if (data.role !== undefined) bodyData.role = data.role;
    if (data.email !== undefined) bodyData.email = data.email;
    if (data.user_id !== undefined) bodyData.new_user_id = data.user_id;
    if (data.password !== undefined) bodyData.password = data.password;
    
    const response = await fetch(USERS_API_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }
  },

  async deleteUser(userId: number): Promise<void> {
    const response = await fetch(`${USERS_API_URL}?user_id=${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
  },
};
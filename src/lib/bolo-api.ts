const BOLO_API_URL = 'https://functions.poehali.dev/24bef935-864e-4498-ae86-abd74ff7bb01';

export interface Bolo {
  id: number;
  type: 'person' | 'vehicle';
  mainInfo: string;
  additionalInfo?: string;
  isArmed: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export const boloApi = {
  async getAll(token: string): Promise<Bolo[]> {
    const response = await fetch(BOLO_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch BOLOs');
    }

    return response.json();
  },

  async create(token: string, data: Omit<Bolo, 'id' | 'createdAt' | 'updatedAt' | 'createdByName'>): Promise<Bolo> {
    const response = await fetch(BOLO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create BOLO');
    }

    return response.json();
  },

  async update(token: string, id: number, data: Partial<Omit<Bolo, 'id' | 'createdAt' | 'updatedAt' | 'createdByName'>>): Promise<void> {
    const response = await fetch(BOLO_API_URL, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ id, ...data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update BOLO');
    }
  },

  async delete(token: string, id: number): Promise<void> {
    const response = await fetch(`${BOLO_API_URL}?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete BOLO');
    }
  },
};

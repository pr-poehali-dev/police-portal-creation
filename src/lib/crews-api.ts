import { auth } from './auth';

const CREWS_API_URL = 'https://functions.poehali.dev/f4f45aca-ba9d-4afa-b89b-d082668a4ee4';

export interface CrewMember {
  user_id: number;
  user_id_str: string;
  full_name: string;
  email: string;
}

export interface Crew {
  id: number;
  callsign: string;
  location: string;
  status: 'available' | 'busy' | 'delay' | 'need_help';
  creator_id: number;
  members: CrewMember[];
  created_at: string;
  updated_at: string;
}

export const crewsApi = {
  async getCrews(): Promise<Crew[]> {
    const response = await fetch(CREWS_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to fetch crews');
    }

    const result = await response.json();
    return result.crews || [];
  },

  async createCrew(data: {
    callsign: string;
    location?: string;
    second_member_id?: number;
  }): Promise<void> {
    const response = await fetch(CREWS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to create crew');
    }
  },

  async updateCrewStatus(crewId: number, status: string): Promise<void> {
    const response = await fetch(CREWS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify({ crew_id: crewId, action: 'update_status', status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update status');
    }
  },

  async updateCrewLocation(crewId: number, location: string): Promise<void> {
    const response = await fetch(CREWS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify({ crew_id: crewId, action: 'update_location', location }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update location');
    }
  },

  async deleteCrew(crewId: number): Promise<void> {
    const response = await fetch(`${CREWS_API_URL}?crew_id=${crewId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete crew');
    }
  },

  async getAvailableUsers(): Promise<{ id: number; user_id: string; full_name: string; email: string }[]> {
    const usersResponse = await fetch('https://functions.poehali.dev/348afac0-d112-4953-b5da-6eafc2cf5bec?status=active', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!usersResponse.ok) throw new Error('Failed to fetch users');

    const usersData = await usersResponse.json();

    const crewsResponse = await fetch(CREWS_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
    });

    if (!crewsResponse.ok) throw new Error('Failed to fetch crews');

    const crewsData = await crewsResponse.json();

    const usersInCrews = new Set();
    crewsData.crews.forEach((crew: Crew) => {
      crew.members.forEach((member: CrewMember) => {
        usersInCrews.add(member.user_id);
      });
    });

    return usersData.users.filter((user: { id: number }) => !usersInCrews.has(user.id));
  },
};

import { config } from '../config';
import { Sender } from '../types/db';

const BASE_URL = config.RTI_TRACKER_SERVER_URL;

export const sendersService = {

  /**
   * list senders
   */
  async listSenders(page: number, pageSize: number, httpClient?: any) {
    if (!httpClient) throw new Error('Asgardeo HTTP client is required');

    try {
      const response = await httpClient.request({
        url: `${BASE_URL}/api/v1/senders`,
        params: { page, pageSize },
        method: 'GET',
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  },

  /** 
   * create sender.
   */
  async create(payload: Partial<Sender>, httpClient?: any): Promise<Sender> {
    if (!httpClient) throw new Error('Asgardeo HTTP client is required');
    try {
      const response = await httpClient.request({
        url: `${BASE_URL}/api/v1/senders`,
        method: 'POST',
        data: payload
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  },

  /** 
   * updates an existing sender
   */
  async update(id: string, payload: Partial<Sender>, httpClient?: any): Promise<Sender> {
    if (!httpClient) throw new Error('Asgardeo HTTP client is required');

    try {
      const response = await httpClient.request({
        url: `${BASE_URL}/api/v1/senders/${id}`,
        method: 'PUT',
        data: payload
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  },

  /**
   * Deletes a sender.
   */
  async remove(id: string, httpClient?: any): Promise<void> {
    if (!httpClient) throw new Error('Asgardeo HTTP client is required');

    try {
      await httpClient.request({
        url: `${BASE_URL}/api/v1/senders/${id}`,
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  }

};


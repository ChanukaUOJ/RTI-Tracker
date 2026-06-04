import { toFormData } from '../utils/formUtils';
import { config } from '../config';

const BASE_URL = config.RTI_TRACKER_SERVER_URL;

export const rtiRequestsService = {
  async list(page: number, pageSize: number, search?: string, httpClient?: any) {
    const response = await httpClient.request({
      url: `${BASE_URL}/api/v1/rti_requests`,
      params: { page, pageSize, query: search },
      method: 'GET',
    });
    return response.data;
  },

  async getById(id: number, httpClient?: any) {
    const response = await httpClient.request({
      url: `${BASE_URL}/api/v1/rti_requests/${id}`,
      method: 'GET',
    });
    return response.data;
  },


  async create(payload: { title?: string, description?: string | null, senderId?: string, receiverId?: string, rtiTemplateId?: string, content?: string, file?: File, createdDate?: string }, httpClient?: any) {
    const formData = toFormData(
      {
        title: payload.title,
        description: payload.description,
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        rtiTemplateId: payload.rtiTemplateId,
        createdDate: payload.createdDate
      },
      payload.file
    );

    try {
      const response = await httpClient.request({
        url: `${BASE_URL}/api/v1/rti_requests`,
        method: 'POST',
        data: formData,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error('[POST] RTI Request Error Details:', error.response.data);
      }
      throw error;
    }
  },

  async remove(id: number, httpClient?: any) {
    await httpClient.request({
      url: `${BASE_URL}/api/v1/rti_requests/${id}`,
      method: 'DELETE',
    });
  },

};

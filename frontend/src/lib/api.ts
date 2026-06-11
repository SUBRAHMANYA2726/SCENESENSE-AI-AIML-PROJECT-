import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = {
  // Chat History & Sessions
  getSessions: async () => {
    const res = await axios.get(`${API_BASE_URL}/sessions`);
    return res.data;
  },

  getSession: async (sessionId: string) => {
    const res = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`);
    return res.data;
  },

  deleteSession: async (sessionId: string) => {
    const res = await axios.delete(`${API_BASE_URL}/sessions/${sessionId}`);
    return res.data;
  },

  // Upload File
  uploadFile: async (file: File, sessionId: string, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },

  // Chat stream
  streamChat: async (message: string, sessionId: string, onChunk: (chunk: string) => void) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'user',
        content: message,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    if (!reader) {
      throw new Error("Response body is not readable");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }
};

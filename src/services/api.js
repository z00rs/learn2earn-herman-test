import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const submitProof = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/submissions`, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to submit proof');
  }
};

export const checkSubmissionStatus = async (walletAddress) => {
  try {
    // Normalize address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase();
    const response = await axios.get(`${API_BASE_URL}/submissions/${normalizedAddress}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(error.response?.data?.message || 'Failed to check submission status');
  }
};

export const getApprovedSubmissions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/submissions/approved`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch approved submissions');
  }
};
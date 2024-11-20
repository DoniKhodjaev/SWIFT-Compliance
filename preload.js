const { contextBridge } = require('electron');
const axios = require('axios');

// Define the API base URL for the backend
const API_BASE_URL = 'http://localhost:3001/api';

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  // Search OrgInfo by company name
  searchOrgInfo: async (companyName) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/search-orginfo`, {
        params: { company_name: companyName },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching OrgInfo:', error);
      return { error: 'Failed to fetch OrgInfo data.' };
    }
  },

  // Search EGRUL by INN
  searchEgrul: async (inn) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/search-egrul`, {
        params: { inn: inn },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching EGRUL data:', error);
      return { error: 'Failed to fetch EGRUL data.' };
    }
  },

  // Get the SDN list
  getSdnList: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sdn-list`);
      return response.data;
    } catch (error) {
      console.error('Error fetching SDN List:', error);
      return { error: 'Failed to fetch SDN List.' };
    }
  },

  // Update the SDN list
  updateSdnList: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/update-sdn-list`);
      return response.data;
    } catch (error) {
      console.error('Error updating SDN List:', error);
      return { error: 'Failed to update SDN List.' };
    }
  },

  // Fetch parsed SWIFT files from the database
  getParsedSwiftFiles: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/parsed-swift-files`);
      return response.data;
    } catch (error) {
      console.error('Error fetching parsed SWIFT files:', error);
      return { error: 'Failed to fetch parsed SWIFT files.' };
    }
  },

  // Process a SWIFT message from the frontend
  processSwiftMessage: async (message) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/process-swift`, { message });
      return response.data;
    } catch (error) {
      console.error('Error processing SWIFT message:', error);
      return { error: 'Failed to process SWIFT message.' };
    }
  },

  // Delete a SWIFT message by ID
  deleteSwiftMessage: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/delete-message/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting SWIFT message:', error);
      return { error: 'Failed to delete SWIFT message.' };
    }
  }
});

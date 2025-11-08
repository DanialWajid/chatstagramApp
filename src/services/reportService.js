import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://192.168.0.110:8000/api";

class ReportService {
  async getAuthHeaders() {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      return {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };
    } catch (error) {
      console.error("Error getting auth headers:", error);
      throw error;
    }
  }

  async submitReport(reportData) {
    try {
      const config = await this.getAuthHeaders();
      const response = await axios.post(
        `${API_URL}/reports`,
        reportData,
        config
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error submitting report:",
        error.response?.data || error.message
      );

      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to submit report"
      );
    }
  }

  async getUserReports(page = 1, limit = 10) {
    try {
      const config = await this.getAuthHeaders();
      const response = await axios.get(
        `${API_URL}/reports/my-reports?page=${page}&limit=${limit}`,
        config
      );
      return response.data;
    } catch (error) {
      console.error("Error getting user reports:", error);
      throw new Error(error.response?.data?.message || "Failed to get reports");
    }
  }

  // Admin methods (for future admin panel)
  async getAllReports(filters = {}) {
    try {
      const config = await this.getAuthHeaders();
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(`${API_URL}/reports?${params}`, config);
      return response.data;
    } catch (error) {
      console.error("Error getting all reports:", error);
      throw new Error(error.response?.data?.message || "Failed to get reports");
    }
  }

  async getReportById(reportId) {
    try {
      const config = await this.getAuthHeaders();
      const response = await axios.get(
        `${API_URL}/reports/${reportId}`,
        config
      );
      return response.data;
    } catch (error) {
      console.error("Error getting report:", error);
      throw new Error(error.response?.data?.message || "Failed to get report");
    }
  }

  async updateReport(reportId, updateData) {
    try {
      const config = await this.getAuthHeaders();
      const response = await axios.put(
        `${API_URL}/reports/${reportId}`,
        updateData,
        config
      );
      return response.data;
    } catch (error) {
      console.error("Error updating report:", error);
      throw new Error(
        error.response?.data?.message || "Failed to update report"
      );
    }
  }

  async getReportStats() {
    try {
      const config = await this.getAuthHeaders();
      const response = await axios.get(`${API_URL}/reports/stats`, config);
      return response.data;
    } catch (error) {
      console.error("Error getting report stats:", error);
      throw new Error(
        error.response?.data?.message || "Failed to get report stats"
      );
    }
  }

  async downloadChatExport(reportId) {
    try {
      const config = await this.getAuthHeaders();
      const response = await axios.get(
        `${API_URL}/reports/${reportId}/download`,
        {
          ...config,
          responseType: "text",
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error downloading chat export:", error);
      throw new Error(
        error.response?.data?.message || "Failed to download chat export"
      );
    }
  }
}

export const reportService = new ReportService();

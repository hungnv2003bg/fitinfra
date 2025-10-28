import API_CONFIG from '../config/api';

class TimeService {
  constructor() {
    this.serverTimeOffset = null;
    this.lastSyncTime = null;
    this.syncInterval = 5 * 60 * 1000;
  }

  async getServerTime() {
    try {
      if (this.serverTimeOffset !== null && this.lastSyncTime && 
          (Date.now() - this.lastSyncTime) < this.syncInterval) {
        return new Date(Date.now() + this.serverTimeOffset);
      }

      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/server-time`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server time API failed: ${response.status}`);
      }

      const data = await response.json();
      const serverTime = new Date(data.serverTimeISO);
      const clientTime = new Date();
      
      this.serverTimeOffset = serverTime.getTime() - clientTime.getTime();
      this.lastSyncTime = Date.now();

      return serverTime;
    } catch (error) {
      return new Date();
    }
  }

  getServerTimeSync() {
    if (this.serverTimeOffset !== null) {
      return new Date(Date.now() + this.serverTimeOffset);
    }
    return new Date();
  }

  async refreshServerTime() {
    this.serverTimeOffset = null;
    this.lastSyncTime = null;
    return await this.getServerTime();
  }
}

export const timeService = new TimeService();
export default timeService;


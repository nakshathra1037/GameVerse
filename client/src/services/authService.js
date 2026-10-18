import api from './api';

export const authService = {
  /**
   * Registers a new user account.
   * @param {Object} userData - { username, email, password, avatar }
   * @returns {Promise<Object>} { access_token, refresh_token, token_type, user }
   */
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data?.data || response.data;
  },

  /**
   * Authenticates a player by username/email and password.
   * @param {Object} credentials - { login, password }
   * @returns {Promise<Object>} { access_token, refresh_token, token_type, user }
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data?.data || response.data;
  },

  /**
   * Renews access token using a refresh token.
   * @param {string} refreshToken
   * @returns {Promise<Object>} { access_token, refresh_token, token_type, user }
   */
  async refresh(refreshToken) {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data?.data || response.data;
  },

  /**
   * Revokes the active session on the backend.
   * @param {string} [refreshToken]
   */
  async logout(refreshToken) {
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch (err) {
      // Non-blocking: logout locally even if server is unreachable
      console.warn('Backend logout call failed:', err?.message);
    }
  },

  /**
   * Fetches current authenticated player data.
   * @returns {Promise<Object>} User profile object
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data?.data || response.data;
  },
};

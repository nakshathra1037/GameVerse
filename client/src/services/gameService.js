import api from './api';

export const gameService = {
  /**
   * Initializes a new Reflex Rush session on the server.
   * @returns {Promise<Object>} { session_id, delays, start_time }
   */
  async startReflex() {
    const response = await api.post('/games/reflex-rush/start');
    return response.data?.data || response.data;
  },

  /**
   * Submits 5 round reaction times for validation, score, XP, and coin computation.
   * @param {string} sessionId
   * @param {number[]} reactionTimes
   * @returns {Promise<Object>} { session_id, reaction_times, score, is_new_best, personal_best, xp_earned, coins_earned, level, total_xp, total_coins }
   */
  async finishReflex(sessionId, reactionTimes) {
    const response = await api.post('/games/reflex-rush/finish', {
      session_id: sessionId,
      reaction_times: reactionTimes,
    });
    return response.data?.data || response.data;
  },

  /**
   * Retrieves player's past Reflex Rush sessions and personal best.
   * @returns {Promise<Object>} { game_id, personal_best, total_played, sessions }
   */
  async getReflexHistory() {
    const response = await api.get('/games/reflex-rush/history');
    return response.data?.data || response.data;
  },

  /**
   * Retrieves player's recent sessions and personal bests across all 5 mini-games.
   * @returns {Promise<Object>} { sessions, personal_bests }
   */
  async getRecentHistory() {
    const response = await api.get('/games/recent-history');
    return response.data?.data || response.data;
  },

  /**
   * Initializes a session for any registered mini-game.
   * @param {string} gameSlug
   * @returns {Promise<Object>} { session_id, game_id, start_time, delays, is_daily_available }
   */
  async startGame(gameSlug) {
    const response = await api.post(`/games/${gameSlug}/start`);
    return response.data?.data || response.data;
  },

  /**
   * Submits a completed game session score.
   * @param {string} gameSlug
   * @param {Object} payload { sessionId, score, durationMs, meta, reactionTimes }
   * @returns {Promise<Object>} { session_id, score, is_new_best, personal_best, xp_earned, coins_earned, level, total_xp, total_coins, is_practice }
   */
  async finishGame(gameSlug, { sessionId, score, durationMs, meta, reactionTimes } = {}) {
    const response = await api.post(`/games/${gameSlug}/finish`, {
      session_id: sessionId,
      score,
      duration_ms: durationMs,
      meta,
      reaction_times: reactionTimes,
    });
    return response.data?.data || response.data;
  },

  /**
   * Alias for finishGame to standardize score submission across all games.
   */
  async submitScore(gameSlug, payload) {
    return this.finishGame(gameSlug, payload);
  },

  /**
   * Retrieves user session history and personal record for a game.
   * @param {string} gameSlug
   * @returns {Promise<Object>} { game_id, personal_best, total_played, sessions }
   */
  async getGameHistory(gameSlug) {
    const response = await api.get(`/games/${gameSlug}/history`);
    return response.data?.data || response.data;
  },

  /**
   * Retrieves the leaderboard for a game.
   * @param {string} gameSlug
   * @returns {Promise<Object>} { game_id, entries }
   */
  async getLeaderboard(gameSlug) {
    const response = await api.get(`/games/${gameSlug}/leaderboard`);
    return response.data?.data || response.data;
  },
};

export default gameService;

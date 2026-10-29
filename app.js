/**
 * ============================================================================
 * HABITISM - CLIENT APPLICATION CORE (app.js)
 * ============================================================================
 * Handles Auth, Facebook OAuth, Gamification, Companion Growth, Shop, and API calls.
 */

const Habitism = (() => {
  const API_BASE = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000';
  const CURRENT_USER_KEY = 'habitism_current_user';

  // 1. User Session Management
  function getCurrentUser() {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(CURRENT_USER_KEY);
    } else {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
  }

  function requireAuth(redirectCommitment = true) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    if (redirectCommitment && !user.committed) {
      window.location.href = 'rules.html';
      return null;
    }
    return user;
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'login.html';
  }

  // 2. Authentication API (Server + Client fallback)
  async function register(name, email, password) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setCurrentUser(data.user);
      return data.user;
    } catch (err) {
      console.warn('Backend unavailable, using local session:', err.message);
      const user = {
        id: Date.now(),
        name,
        email,
        committed: 0,
        coins: 100,
        streak: 0,
        streak_freezes: 1,
        task_mode: 'presets'
      };
      setCurrentUser(user);
      return user;
    }
  }

  async function login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      setCurrentUser(data.user);
      return data.user;
    } catch (err) {
      console.warn('Backend unavailable, using local mock auth:', err.message);
      let user = getCurrentUser();
      if (!user || user.email !== email) {
        user = {
          id: Date.now(),
          name: email.split('@')[0],
          email,
          committed: 0,
          coins: 100,
          streak: 0,
          streak_freezes: 1,
          task_mode: 'presets'
        };
      }
      setCurrentUser(user);
      return user;
    }
  }

  async function facebookLogin(fbName = 'Facebook Champion') {
    const fbId = 'fb_' + Math.floor(100000 + Math.random() * 900000);
    const fbEmail = `fb_user_${fbId}@facebook.com`;

    try {
      const res = await fetch(`${API_BASE}/api/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fbName, email: fbEmail, facebookId: fbId })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        return data.user;
      }
    } catch (err) {
      console.warn('Offline FB auth simulation:', err.message);
    }

    const user = {
      id: Date.now(),
      name: fbName,
      email: fbEmail,
      facebook_id: fbId,
      committed: 0,
      coins: 150, // Bonus starter coins for FB connection
      streak: 0,
      streak_freezes: 1,
      task_mode: 'presets'
    };
    setCurrentUser(user);
    return user;
  }

  async function commitRules() {
    const user = getCurrentUser();
    if (!user) return;
    user.committed = 1;
    setCurrentUser(user);

    try {
      await fetch(`${API_BASE}/api/user/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
    } catch (e) {}

    window.location.href = 'dashboard.html';
  }

  // 3. Rewards & Shop
  async function buyStreakFreeze() {
    const user = getCurrentUser();
    if (!user) return { success: false, message: 'Please log in' };

    if (user.coins < 50) {
      return { success: false, message: 'Not enough coins! You need 50 coins to purchase a Streak Freeze.' };
    }

    user.coins -= 50;
    user.streak_freezes = (user.streak_freezes || 0) + 1;
    setCurrentUser(user);

    try {
      await fetch(`${API_BASE}/api/shop/buy-freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
    } catch (e) {}

    return {
      success: true,
      coins: user.coins,
      streakFreezes: user.streak_freezes,
      message: '❄️ Streak Freeze acquired! Your streak is protected from 1 missed day.'
    };
  }

  function addCoins(amount) {
    const user = getCurrentUser();
    if (!user) return;
    user.coins = (user.coins || 0) + amount;
    setCurrentUser(user);
    return user.coins;
  }

  // 4. Companion Visual Evolution (Seed -> Sprout -> Plant -> Flower -> Golden Phoenix)
  function getCompanionStage(streak = 0) {
    if (streak >= 14) {
      return { name: 'Radiant Lotus Phoenix', icon: '🪷', stage: 'Stage 5 (Ascended)' };
    } else if (streak >= 7) {
      return { name: 'Full Glowing Bloom', icon: '🌸', stage: 'Stage 4 (Bloomed)' };
    } else if (streak >= 4) {
      return { name: 'Budding Stem', icon: '🌿', stage: 'Stage 3 (Growing)' };
    } else if (streak >= 2) {
      return { name: 'Young Sprout', icon: '🌱', stage: 'Stage 2 (Sprout)' };
    } else {
      return { name: 'Nurturing Seed', icon: '🌰', stage: 'Stage 1 (Seed)' };
    }
  }

  // 5. Accountability & Punishment Simulation (Calls FB Graph API)
  async function simulateAccountabilityCheck(dateStr) {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const res = await fetch(`${API_BASE}/api/accountability/trigger-penalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, dateStr })
      });
      const data = await res.json();
      
      if (data.shielded) {
        user.streak_freezes = Math.max(0, (user.streak_freezes || 1) - 1);
        setCurrentUser(user);
      } else {
        user.streak = 0;
        setCurrentUser(user);
      }
      return data;
    } catch (err) {
      // Offline fallback simulation
      if (user.streak_freezes > 0) {
        user.streak_freezes -= 1;
        setCurrentUser(user);
        return {
          success: true,
          shielded: true,
          message: '❄️ Streak Freeze used! Your streak was saved from breaking.'
        };
      } else {
        user.streak = 0;
        setCurrentUser(user);
        return {
          success: true,
          shielded: false,
          streakReset: true,
          message: '⚠️ Accountability Alert Triggered: Graph API message logged to Facebook Page.'
        };
      }
    }
  }

  return {
    getCurrentUser,
    setCurrentUser,
    requireAuth,
    logout,
    register,
    login,
    facebookLogin,
    commitRules,
    buyStreakFreeze,
    addCoins,
    getCompanionStage,
    simulateAccountabilityCheck
  };
})();


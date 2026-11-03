/**
 * ============================================================================
 * HABITISM - CLIENT APPLICATION CORE (app.js)
 * ============================================================================
 * Handles Auth, Role-based Routing (Admin / User), Multi-user State Isolation,
 * Facebook Integration, Gamification, Living Companion, Shop, and Admin API.
 */

const Habitism = (() => {
  const API_BASE = (() => {
    try {
      const loc = window.location;
      if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
        if (loc.port === '3000') return loc.origin;
        return `${loc.protocol}//${loc.hostname}:3000`;
      }
      if (loc.protocol === 'file:') return 'http://localhost:3000';
      return loc.origin;
    } catch (e) {
      return 'http://localhost:3000';
    }
  })();

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Non-JSON response from server (HTTP ${res.status}). Ensure backend is active on port 3000.`);
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request failed (HTTP ${res.status})`);
    }
    return data;
  }
  const CURRENT_USER_KEY = 'habitism_current_user';

  // ==========================================================================
  // 1. User Session & Multi-User State Isolation
  // ==========================================================================
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

  // Scoped key generator to prevent account bleed across logins
  function getUserKey(key, userObj = null) {
    const user = userObj || getCurrentUser();
    const uid = user ? (user.id || user.username || user.email) : 'guest';
    return `u_${uid}_${key}`;
  }

  function getUserStorage(key, defaultValue = null) {
    const fullKey = getUserKey(key);
    const data = localStorage.getItem(fullKey);
    if (data === null) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }

  function setUserStorage(key, value) {
    const fullKey = getUserKey(key);
    if (value === null || value === undefined) {
      localStorage.removeItem(fullKey);
    } else {
      localStorage.setItem(fullKey, typeof value === 'string' ? value : JSON.stringify(value));
    }

    // Background sync to server if user is logged in
    const user = getCurrentUser();
    if (user && user.id) {
      return fetch(`${API_BASE}/api/user/state/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, stateKey: key, stateValue: value })
      }).catch((err) => {
        console.warn('setUserStorage sync failed:', err);
      });
    }
    return Promise.resolve();
  }

  function requireAuth(redirectCommitment = true, adminOnly = false) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }

    // If page requires Admin privileges
    if (adminOnly && user.role !== 'admin') {
      alert('Access restricted: Administrator privileges required.');
      window.location.href = 'dashboard.html';
      return null;
    }

    // If user has not committed to the accountability policy yet (admins bypass)
    if (redirectCommitment && !user.committed && user.role !== 'admin') {
      window.location.href = 'rules.html';
      return null;
    }

    return user;
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'login.html';
  }

  // ==========================================================================
  // 2. Authentication API (Server + Client fallback)
  // ==========================================================================
  async function register(name, username, email, password) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setCurrentUser(data.user);
      return data.user;
    } catch (err) {
      console.warn('Backend unavailable, using isolated local registration:', err.message);
      if (err.message.includes('already registered') || err.message.includes('already taken')) {
        throw err;
      }
      const user = {
        id: Date.now(),
        name,
        username: username || email.split('@')[0],
        email,
        password,
        role: 'user',
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

  async function login(identifier, password) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      setCurrentUser(data.user);
      return data.user;
    } catch (err) {
      // Fallback pre-seeded offline accounts if server offline
      const idClean = (identifier || '').trim().toLowerCase();
      if (idClean === 'admin' && password === 'admin123') {
        const adminUser = {
          id: 1,
          name: 'Habitism Administrator',
          username: 'admin',
          email: 'admin@habitism.app',
          role: 'admin',
          committed: 1,
          coins: 999,
          streak: 15,
          streak_freezes: 5,
          task_mode: 'presets'
        };
        setCurrentUser(adminUser);
        return adminUser;
      } else if (idClean === 'user' && password === 'user123') {
        const standardUser = {
          id: 2,
          name: 'Habit Champion',
          username: 'user',
          email: 'user@habitism.app',
          role: 'user',
          committed: 1,
          coins: 150,
          streak: 3,
          streak_freezes: 2,
          task_mode: 'presets'
        };
        setCurrentUser(standardUser);
        return standardUser;
      }
      throw err;
    }
  }

  async function forgotPassword(identifier, newPassword) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      return data;
    } catch (err) {
      console.warn('Offline fallback for password reset:', err.message);
      return { success: true, message: `Password for ${identifier} updated successfully (local simulation).` };
    }
  }

  const FB_APP_ID = '1065830853203139';

  // --------------------------------------------------------------------------
  // Meta Facebook JavaScript SDK Integration (App ID: 1065830853203139)
  // --------------------------------------------------------------------------
  function initFacebookSDK() {
    if (window.FB) return;

    window.fbAsyncInit = function() {
      try {
        window.FB.init({
          appId: FB_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        console.log('✅ Meta Facebook SDK Initialized (App ID: ' + FB_APP_ID + ')');
      } catch (e) {
        console.warn('Facebook SDK init note:', e.message);
      }
    };

    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      js.async = true;
      js.defer = true;
      js.crossOrigin = 'anonymous';
      document.head.appendChild(js);
    }
  }

  async function loginWithFacebook() {
    initFacebookSDK();

    return new Promise((resolve, reject) => {
      // If window.FB is available and initialized, open real OAuth dialog
      if (window.FB && typeof window.FB.login === 'function') {
        window.FB.login((response) => {
          if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;
            window.FB.api('/me', { fields: 'id,name,email' }, async (userInfo) => {
              try {
                const user = await facebookLogin(userInfo.name, userInfo.email, userInfo.id, accessToken);
                resolve(user);
              } catch (err) {
                resolve(createOfflineFbUser(userInfo.name, userInfo.email, userInfo.id));
              }
            });
          } else {
            // Cancelled or blocked by domain whitelist in local dev
            fallbackFbPrompt(resolve, reject);
          }
        }, { scope: 'public_profile,email' });
      } else {
        fallbackFbPrompt(resolve, reject);
      }
    });
  }

  function fallbackFbPrompt(resolve, reject) {
    const fbName = prompt('Facebook Login (App ID: ' + FB_APP_ID + '):\nEnter your Facebook profile name for social accountability:', 'Accountability Champion');
    if (!fbName) return reject(new Error('Facebook login cancelled.'));
    facebookLogin(fbName).then(resolve).catch(err => {
      const fallback = createOfflineFbUser(fbName);
      resolve(fallback);
    });
  }

  function createOfflineFbUser(name, email = null, id = null) {
    const finalId = id || ('fb_' + Math.floor(100000 + Math.random() * 900000));
    const user = {
      id: Date.now(),
      name: name,
      username: 'fb_' + name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10),
      email: email || `fb_${finalId}@habitism.app`,
      facebook_id: finalId,
      facebook_name: name,
      role: 'user',
      committed: 0,
      coins: 150,
      streak: 0,
      streak_freezes: 1,
      task_mode: 'presets'
    };
    setCurrentUser(user);
    return user;
  }

  async function facebookLogin(fbName = 'Facebook Champion', fbEmail = null, fbId = null, accessToken = null) {
    const finalId = fbId || ('fb_' + Math.floor(100000 + Math.random() * 900000));
    const finalEmail = fbEmail || `fb_${finalId}@habitism.app`;

    try {
      const res = await fetch(`${API_BASE}/api/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fbName, email: finalEmail, facebookId: finalId, accessToken })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        return data.user;
      }
    } catch (err) {
      console.warn('Offline FB auth fallback:', err.message);
    }

    return createOfflineFbUser(fbName, finalEmail, finalId);
  }

  async function linkFacebook(userId, fbId, fbName) {
    try {
      const res = await fetch(`${API_BASE}/api/user/link-facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, facebookId: fbId, facebookName: fbName })
      });
      const data = await res.json();
      if (data.user) setCurrentUser(data.user);
      return data;
    } catch (e) {
      const user = getCurrentUser();
      if (user) {
        user.facebook_id = fbId;
        user.facebook_name = fbName;
        setCurrentUser(user);
      }
      return { success: true, user };
    }
  }

  async function unlinkFacebook(userId) {
    try {
      const res = await fetch(`${API_BASE}/api/user/unlink-facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.user) setCurrentUser(data.user);
      return data;
    } catch (e) {
      const user = getCurrentUser();
      if (user) {
        user.facebook_id = null;
        user.facebook_name = null;
        setCurrentUser(user);
      }
      return { success: true, user };
    }
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

    window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
  }

  // ==========================================================================
  // 3. Rewards & Shop
  // ==========================================================================
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
    // Route coins to piggybank first (claimable at end of day)
    user.piggybank_coins = (user.piggybank_coins || 0) + amount;
    setCurrentUser(user);
    return user.piggybank_coins;
  }

  // ==========================================================================
  // 4. Living Companion Stages (Seed -> Sprout -> Stem -> Bloom -> Phoenix)
  // ==========================================================================
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

  // ==========================================================================
  // 5. Accountability & Penalty Simulation (Facebook Graph API)
  // ==========================================================================
  async function simulateAccountabilityCheck(dateStr, failedTasks = [], allTasks = []) {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const res = await fetch(`${API_BASE}/api/accountability/trigger-penalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, dateStr, failedTasks, allTasks })
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
      console.warn('Offline accountability fallback:', err.message);
      user.streak = 0;
      setCurrentUser(user);
      return {
        success: true,
        shielded: false,
        streakReset: true,
        postMessage: `⚠️ HABITISM SOCIAL ACCOUNTABILITY NOTICE:\n\nUser ${user.name} failed daily habits for ${dateStr}!\n\n"This person made this commitment but did not complete it."`,
        message: 'Accountability penalty executed (Offline simulated mode).'
      };
    }
  }

  // ==========================================================================
  
  // --------------------------------------------------------------------------
  // Calendar & Full State Cloud Persistence
  // --------------------------------------------------------------------------
  async function getUserFullState(userId) {
    try {
      const res = await fetch(`${API_BASE}/api/user/full-state/${userId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('Could not fetch full state from server:', e.message);
      return null;
    }
  }

  async function getUserCalendar(userId) {
    try {
      const res = await fetch(`${API_BASE}/api/user/calendar/${userId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('Could not fetch calendar from server:', e.message);
      return null;
    }
  }

  async function setUserCalendarDay(userId, dateStr, count) {
    try {
      const res = await fetch(`${API_BASE}/api/user/calendar/set-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dateStr, count })
      });
      return await res.json();
    } catch (e) {
      console.warn('Could not save calendar day to server:', e.message);
      return null;
    }
  }

  // 6. Admin API Helpers
  // ==========================================================================
  async function adminGetUsers() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/users`, {
        headers: { 'x-admin-id': user.id }
      });
    } catch (err) {
      console.warn('Backend unavailable for admin users, using local simulation:', err.message);
      return {
        success: true,
        isOffline: true,
        users: [
          {
            id: 1,
            name: 'Habitism Administrator',
            username: 'admin',
            email: 'admin@habitism.app',
            role: 'admin',
            committed: 1,
            coins: 999,
            streak: 15,
            streak_freezes: 5,
            task_mode: 'presets',
            facebook_id: null,
            facebook_name: null,
            todayCompleted: 5,
            todayTotal: 5,
            todayStatus: 'completed'
          },
          {
            id: 2,
            name: 'Habit Champion',
            username: 'user',
            email: 'user@habitism.app',
            role: 'user',
            committed: 1,
            coins: 150,
            streak: 3,
            streak_freezes: 2,
            task_mode: 'presets',
            facebook_id: '1496888330165860',
            facebook_name: 'Habitism Champion',
            todayCompleted: 3,
            todayTotal: 5,
            todayStatus: 'in_progress'
          }
        ]
      };
    }
  }

  async function adminGetUserDetails(targetUserId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/user-details/${targetUserId}`, {
        headers: { 'x-admin-id': user.id }
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating user details inspection:', err.message);
      const isTargetAdmin = String(targetUserId) === '1';
      return {
        success: true,
        isOffline: true,
        user: {
          id: targetUserId,
          name: isTargetAdmin ? 'Habitism Administrator' : 'Habit Champion',
          username: isTargetAdmin ? 'admin' : 'user',
          email: isTargetAdmin ? 'admin@habitism.app' : 'user@habitism.app',
          role: isTargetAdmin ? 'admin' : 'user',
          coins: isTargetAdmin ? 999 : 150,
          streak: isTargetAdmin ? 15 : 3,
          streak_freezes: isTargetAdmin ? 5 : 2,
          task_mode: 'presets'
        },
        dailyLogs: [
          { date_str: new Date().toDateString(), completed_count: isTargetAdmin ? 5 : 3, total_count: 5, status: isTargetAdmin ? 'completed' : 'in_progress' }
        ],
        accountabilityLogs: [],
        taskStates: [
          { state_key: 'active_level', state_value: '3' },
          { state_key: 'checks_lvl_3', state_value: '{"0":true,"1":true,"2":true}' }
        ]
      };
    }
  }

  async function adminResetPassword(targetUserId, newPassword) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': user.id },
        body: JSON.stringify({ adminUserId: user.id, targetUserId, newPassword })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating password reset:', err.message);
      return { success: true, message: `Password updated to "${newPassword}" (simulated mode).` };
    }
  }

  async function adminDeleteUser(targetUserId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/user/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': user.id }
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating user deletion:', err.message);
      return { success: true, message: 'User deleted (simulated mode).' };
    }
  }

  async function adminGetAccountabilityFeed() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/accountability-feed`, {
        headers: { 'x-admin-id': user.id }
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating accountability feed:', err.message);
      return {
        success: true,
        isOffline: true,
        posts: [
          {
            created_at: new Date().toLocaleTimeString(),
            user_name: 'Habit Champion',
            fb_page_id: '1496888330165860',
            status: 'simulated_fallback',
            fb_post_id: 'post_demo_1496888',
            message: 'This person made this commitment on Habitism but did not complete it.'
          }
        ]
      };
    }
  }

  async function adminCoins(targetUserId, amount) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/users/${targetUserId}/coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': user.id },
        body: JSON.stringify({ amount })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating admin coins:', err.message);
      return { success: true, message: 'Coins updated (simulated mode).' };
    }
  }

  async function adminPostPunishment(userId, dateStr, failedTasks, allTasks, message) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/accountability/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': user.id },
        body: JSON.stringify({ userId, dateStr, failedTasks, allTasks, message })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating admin post punishment:', err.message);
      return { success: true, message: 'Punishment posted (simulated mode).' };
    }
  }

  async function adminDeletePunishment(postId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/accountability/${postId}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': user.id }
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating admin delete punishment:', err.message);
      return { success: true, message: 'Punishment deleted (simulated mode).' };
    }
  }

  async function adminSetDeadline(targetUserId, deadlineTime) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/settings/deadline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': user.id },
        body: JSON.stringify({ targetUserId, deadlineTime })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating admin deadline:', err.message);
      return { success: true, message: 'Deadline updated (simulated mode).' };
    }
  }

  async function syncPiggybank(userId, piggybankCoins) {
    const user = getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/user/piggybank/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, piggybankCoins })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating piggybank sync:', err.message);
      return { success: true, piggybank_coins: piggybankCoins };
    }
  }

  async function claimPiggybank(userId) {
    const user = getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/user/claim-piggybank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating claim piggybank:', err.message);
      return { success: true, coins: user.coins, claimed: 0, message: 'Piggybank claimed (simulated mode).' };
    }
  }

  async function restoreUserChecks(userId) {
    // Checks are already synced to server via setUserStorage on every toggle.
    // On login, localStorage already has the user's checks (scoped by user ID via getUserKey).
    // Return empty so the dashboard uses whatever is already in localStorage.
    return {};
  }

  async function adminCalendar(targetUserId, dateStr, completedCount, totalCount, status) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/users/${targetUserId}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': user.id },
        body: JSON.stringify({ dateStr, completedCount, totalCount, status })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating admin calendar:', err.message);
      return { success: true, message: 'Calendar updated (simulated mode).' };
    }
  }

  async function adminStreak(targetUserId, streak) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/users/${targetUserId}/streak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': user.id },
        body: JSON.stringify({ streak })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating admin streak:', err.message);
      return { success: true, message: 'Streak updated (simulated mode).' };
    }
  }

  async function adminStreakFreeze(targetUserId, amount) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    try {
      return await fetchJson(`${API_BASE}/api/admin/users/${targetUserId}/streak-freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': user.id },
        body: JSON.stringify({ amount })
      });
    } catch (err) {
      console.warn('Backend unavailable, simulating admin streak freeze:', err.message);
      return { success: true, message: 'Streak freeze updated (simulated mode).' };
    }
  }

  return {
    API_BASE,
    getCurrentUser,
    setCurrentUser,
    getUserKey,
    getUserStorage,
    setUserStorage,
    requireAuth,
    logout,
    register,
    login,
    forgotPassword,
    FB_APP_ID,
    initFacebookSDK,
    loginWithFacebook,
    facebookLogin,
    linkFacebook,
    unlinkFacebook,
    commitRules,
    buyStreakFreeze,
    addCoins,
    getCompanionStage,
    simulateAccountabilityCheck,
    adminGetUsers,
    adminGetUserDetails,
    adminResetPassword,
    adminDeleteUser,
    adminGetAccountabilityFeed,
    adminStreakFreeze,
    adminCoins,
    adminStreak,
    adminCalendar,
    adminPostPunishment,
    adminDeletePunishment,
    adminSetDeadline,
    claimPiggybank,
    restoreUserChecks,
    syncPiggybank,
    setUserStorage,
    getUserFullState,
    getUserCalendar,
    setUserCalendarDay
  };
})();

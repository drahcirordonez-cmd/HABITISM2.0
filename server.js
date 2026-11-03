/**
 * ============================================================================
 * HABITISM - FULL-STACK BACKEND SERVER
 * ============================================================================
 * Node.js + Express + Native SQLite (node:sqlite) + Facebook Graph API Integration
 * Multi-user isolation, Role-based auth (Admin & User), Admin Dashboard API
 */

try { if (typeof process.loadEnvFile === 'function') process.loadEnvFile(); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Native SQLite from Node.js 22+
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ============================================================================
// 1. DATABASE INITIALIZATION & SCHEMA
// ============================================================================
const dataDir = process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : __dirname);
if (!fs.existsSync(dataDir)) {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
}
const dbPath = path.join(dataDir, 'habitism.db');
const db = new DatabaseSync(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    facebook_id TEXT,
    facebook_name TEXT,
    committed INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 100,
    piggybank_coins INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    streak_freezes INTEGER DEFAULT 1,
    task_mode TEXT DEFAULT 'presets',
    deadline_time TEXT DEFAULT '23:59',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    info TEXT,
    level_id INTEGER DEFAULT 1,
    is_custom INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date_str TEXT NOT NULL,
    completed_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date_str)
  );

  CREATE TABLE IF NOT EXISTS accountability_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    date_str TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    fb_page_id TEXT,
    fb_post_id TEXT,
    post_id TEXT,
    response_payload TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_task_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    state_key TEXT NOT NULL,
    state_value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, state_key)
  );
`);

// Safe column migrations in case existing habitism.db lacks columns
try { db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN facebook_name TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN piggybank_coins INTEGER DEFAULT 0;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN deadline_time TEXT DEFAULT '23:59';`); } catch (e) {}
try { db.exec(`ALTER TABLE accountability_posts ADD COLUMN fb_page_id TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE accountability_posts ADD COLUMN fb_post_id TEXT;`); } catch (e) {}

console.log('✅ SQLite Database initialized at habitism.db');

// ============================================================================
// PRE-SEEDED ACCOUNTS (Admin & User)
// ============================================================================
function seedDefaultAccounts() {
  // 1. Admin Account: admin / admin123
  let admin = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get('admin', 'admin@habitism.app');
  if (!admin) {
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, committed, coins, streak, streak_freezes)
      VALUES ('Habitism Administrator', 'admin', 'admin@habitism.app', 'admin123', 'admin', 1, 999, 15, 5)
    `).run();
    console.log('👑 Pre-seeded Admin account created: admin / admin123');
  } else {
    // Ensure password and role are synchronized
    db.prepare(`UPDATE users SET username = 'admin', password = 'admin123', role = 'admin' WHERE id = ?`).run(admin.id);
  }

  // 2. Standard User Account: user / user123
  let user = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get('user', 'user@habitism.app');
  if (!user) {
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, committed, coins, streak, streak_freezes)
      VALUES ('Habit Champion', 'user', 'user@habitism.app', 'user123', 'user', 1, 150, 3, 2)
    `).run();
    console.log('👤 Pre-seeded User account created: user / user123');
  } else {
    // Ensure password and role are synchronized
    db.prepare(`UPDATE users SET username = 'user', password = 'user123', role = 'user' WHERE id = ?`).run(user.id);
  }
}
seedDefaultAccounts();

// ============================================================================
// 2. FACEBOOK GRAPH API CONFIGURATION
// ============================================================================
const FB_CONFIG = {
  appId: process.env.FB_APP_ID || '992807423129946',
  pageName: process.env.FB_PAGE_NAME || 'Habitism',
  pageId: process.env.FB_PAGE_ID || '1496888330165860',
  accessToken: process.env.FB_ACCESS_TOKEN || 'EAAOG8ZC3JOVoBS1mky8moJgoOLWDy5GpSIkGZAP8FYN7CRgz3V4qYUgrqKAzK85b8HerrPK0qGpUS3kc2tnBPsKWv2RkhaRycngCWfr5gXkVFK4o0Uign1KG7f6RJbeIm6Hp5XZA9YXCSyanseiEQOMZAA5oKDcBS7Di18HRXgHo7hthufu1m9ExOPy7QS5gEuiPg3ZCTf8i3FGvu1d8E9fHHt7LwhJym2VS0yezAPDoZD'
};

/**
 * Triggers Facebook Graph API post on failed commitment for a specific active user
 */
async function triggerFacebookAccountabilityPost(userId, userName, dateStr, userFbName = null, failedTasks = [], allTasks = []) {
  const targetLabel = userFbName ? `${userName} (FB: ${userFbName})` : userName;
  
  // Format the to-do list highlighting unfulfilled tasks
  let taskListText = '';
  if (failedTasks && failedTasks.length > 0) {
    taskListText = '\n\n📋 COMMITTED DAILY TO-DO LIST (UNFULFILLED):\n' + 
      failedTasks.map((t, i) => `  ❌ [FAILED] ${typeof t === 'string' ? t : (t.text || t.title || 'Habit #' + (i + 1))}`).join('\n');

    const completedTasks = (allTasks || []).filter(t => {
      const text = typeof t === 'string' ? t : (t.text || t.title);
      return !failedTasks.some(f => (typeof f === 'string' ? f : (f.text || f.title)) === text);
    });

    if (completedTasks.length > 0) {
      taskListText += '\n\nCompleted Habits:\n' + 
        completedTasks.map((t, i) => `  ✅ [Finished] ${typeof t === 'string' ? t : (t.text || t.title || 'Habit #' + (i + 1))}`).join('\n');
    }
  } else if (allTasks && allTasks.length > 0) {
    taskListText = '\n\n📋 COMMITTED DAILY TO-DO LIST:\n' + 
      allTasks.map((t, i) => `  ❌ [Not Fulfilled] ${typeof t === 'string' ? t : (t.text || t.title || 'Habit #' + (i + 1))}`).join('\n');
  }

  const message = `⚠️ HABITISM SOCIAL ACCOUNTABILITY NOTICE:

User ${targetLabel} made a solemn discipline commitment on Habitism for ${dateStr}, but failed to complete their daily habits before the 11:59 PM deadline!
${taskListText}

"This person made this commitment but did not complete it."

Discipline Penalty: Daily streak has been broken and reset to 0 days.

#Habitism #Accountability #Discipline #HabitTracker #Consistency`;

  try {
    const url = `https://graph.facebook.com/v19.0/${FB_CONFIG.pageId}/feed`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        access_token: FB_CONFIG.accessToken
      })
    });

    const data = await response.json();
    const isSuccess = response.ok && data.id;

    try {
      const stmt = db.prepare(`
        INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, fb_page_id, fb_post_id, post_id, response_payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        userName,
        dateStr,
        message,
        isSuccess ? 'published' : 'api_error_fallback',
        FB_CONFIG.pageId,
        data.id || 'simulated_post_' + Date.now(),
        data.id || null,
        JSON.stringify(data)
      );
    } catch (dbErr) {
      console.warn('Could not record accountability post in SQLite:', dbErr.message);
    }

    return {
      success: isSuccess,
      postId: data.id || null,
      data: data,
      formattedMessage: message,
      message: isSuccess 
        ? `Published accountability post to Facebook Page: ${FB_CONFIG.pageName} (Post ID: ${data.id})`
        : `Facebook API notice: ${data.error ? data.error.message : 'Fallback logged in database'}`
    };
  } catch (error) {
    console.error('FB Graph API call error:', error.message);

    const stmt = db.prepare(`
      INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, fb_page_id, response_payload)
      VALUES (?, ?, ?, ?, 'network_error_fallback', ?, ?)
    `);
    stmt.run(userId, userName, dateStr, message, FB_CONFIG.pageId, error.message);

    return {
      success: false,
      error: error.message,
      formattedMessage: message,
      message: 'Accountability penalty recorded in database (Network fallback).'
    };
  }
}

// ============================================================================
// 3. API ROUTES
// ============================================================================

// --- Authentication: Registration (Dedicated for Sign-Up Page) ---
app.post('/api/auth/register', (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const cleanUsername = (username || email.split('@')[0]).trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const insert = db.prepare(`
      INSERT INTO users (name, username, email, password, role, committed, coins, streak, streak_freezes)
      VALUES (?, ?, ?, ?, 'user', 0, 100, 0, 1)
    `);
    const result = insert.run(name.trim(), cleanUsername, cleanEmail, password);

    const user = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.json({ success: true, user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      if (err.message.includes('username')) {
        return res.status(400).json({ error: 'That username is already taken. Please choose another.' });
      }
      return res.status(400).json({ error: 'Email already registered. Please log in.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// --- Authentication: Secure Login (Username OR Email + Password) ---
app.post('/api/auth/login', (req, res) => {
  const { identifier, email, username, password } = req.body;
  const loginId = (identifier || username || email || '').trim().toLowerCase();
  
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  const user = db.prepare(`
    SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name 
    FROM users 
    WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND password = ?
  `).get(loginId, loginId, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  return res.json({ success: true, user });
});

// --- Authentication: Forgot / Reset Password Workflow ---
app.post('/api/auth/forgot-password', (req, res) => {
  const { identifier, newPassword } = req.body;
  const loginId = (identifier || '').trim().toLowerCase();

  if (!loginId || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Valid username/email and a new password (min 4 chars) are required.' });
  }

  const user = db.prepare('SELECT id, name, username, email FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(loginId, loginId);
  if (!user) {
    return res.status(404).json({ error: 'No account found with that username or email.' });
  }

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, user.id);
  console.log(`🔑 Password reset for user: ${user.username} (${user.email})`);

  return res.json({ success: true, message: `Password for ${user.username} has been reset successfully! You can now log in.` });
});

// --- Authentication: Facebook OAuth Linking / Login ---
app.post('/api/auth/facebook', (req, res) => {
  const { name, email, facebookId } = req.body;
  const fbId = facebookId || 'fb_' + Date.now();
  const userName = name || 'Facebook Champion';
  const userEmail = email ? email.trim().toLowerCase() : `fb_${fbId}@habitism.app`;

  try {
    let user = db.prepare(`
      SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name 
      FROM users 
      WHERE facebook_id = ? OR LOWER(email) = ?
    `).get(fbId, userEmail);

    if (!user) {
      const generatedUsername = 'fb_' + Math.floor(1000 + Math.random() * 9000);
      const insert = db.prepare(`
        INSERT INTO users (name, username, email, facebook_id, facebook_name, password, role, committed, coins, streak, streak_freezes)
        VALUES (?, ?, ?, ?, ?, 'facebook_oauth', 'user', 0, 150, 0, 1)
      `);
      const result = insert.run(userName, generatedUsername, userEmail, fbId, userName);
      user = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name FROM users WHERE id = ?').get(result.lastInsertRowid);
    } else {
      // Update facebook ID and name if linking existing account
      db.prepare('UPDATE users SET facebook_id = ?, facebook_name = ? WHERE id = ?').run(fbId, userName, user.id);
      user.facebook_id = fbId;
      user.facebook_name = userName;
    }

    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Link active user account with Facebook
app.post('/api/user/link-facebook', (req, res) => {
  const { userId, facebookId, facebookName } = req.body;
  if (!userId || !facebookId) return res.status(400).json({ error: 'User ID and Facebook ID required.' });

  db.prepare('UPDATE users SET facebook_id = ?, facebook_name = ? WHERE id = ?').run(facebookId, facebookName || 'Facebook User', userId);
  const user = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name FROM users WHERE id = ?').get(userId);
  return res.json({ success: true, user });
});

// Unlink Facebook account
app.post('/api/user/unlink-facebook', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID required.' });

  db.prepare('UPDATE users SET facebook_id = NULL, facebook_name = NULL WHERE id = ?').run(userId);
  const user = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name FROM users WHERE id = ?').get(userId);
  return res.json({ success: true, user });
});

// --- User Profile & Commitment Policy ---
app.post('/api/user/commit', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required.' });

  db.prepare('UPDATE users SET committed = 1 WHERE id = ?').run(userId);
  const user = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name FROM users WHERE id = ?').get(userId);
  return res.json({ success: true, user });
});

app.get('/api/user/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ success: true, user });
});

app.post('/api/user/task-mode', (req, res) => {
  const { userId, mode } = req.body;
  db.prepare('UPDATE users SET task_mode = ? WHERE id = ?').run(mode, userId);
  return res.json({ success: true, mode });
});

// --- Multi-User State Synchronization ---
app.post('/api/user/state/save', (req, res) => {
  const { userId, stateKey, stateValue } = req.body;
  if (!userId || !stateKey) return res.status(400).json({ error: 'Missing parameters' });

  db.prepare(`
    INSERT INTO user_task_states (user_id, state_key, state_value, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, state_key) DO UPDATE SET
      state_value = excluded.state_value,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, stateKey, JSON.stringify(stateValue));

  return res.json({ success: true });
});

app.get('/api/user/state/get/:userId/:stateKey', (req, res) => {
  const row = db.prepare('SELECT state_value FROM user_task_states WHERE user_id = ? AND state_key = ?').get(req.params.userId, req.params.stateKey);
  return res.json({ success: true, stateValue: row ? JSON.parse(row.state_value) : null });
});


// --- Calendar & Full State Persistence Across Browsers ---

// 1. Set Calendar Day count (clicked dates or completed tasks)
app.post('/api/user/calendar/set-day', (req, res) => {
  const { userId, dateStr, count } = req.body;
  if (!userId || !dateStr) return res.status(400).json({ error: 'Missing userId or dateStr' });

  const completedCount = parseInt(count, 10) || 0;
  const status = completedCount >= 5 ? 'completed' : (completedCount > 0 ? 'in_progress' : 'empty');

  if (completedCount <= 0) {
    db.prepare('DELETE FROM daily_logs WHERE user_id = ? AND date_str = ?').run(userId, dateStr);
  } else {
    db.prepare(`
      INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
      VALUES (?, ?, ?, 5, ?)
      ON CONFLICT(user_id, date_str) DO UPDATE SET
        completed_count = excluded.completed_count,
        status = excluded.status
    `).run(userId, dateStr, completedCount, status);
  }

  // Recalculate streak from continuous completed days
  const user = db.prepare('SELECT id, coins, streak, streak_freezes, piggybank_coins FROM users WHERE id = ?').get(userId);

  return res.json({
    success: true,
    userId,
    dateStr,
    completedCount,
    status
  });
});

// 2. Get User's Entire Calendar History
app.get('/api/user/calendar/:userId', (req, res) => {
  const userId = req.params.userId;
  const rows = db.prepare('SELECT date_str, completed_count, total_count, status FROM daily_logs WHERE user_id = ?').all(userId);

  const calendarMap = {};
  rows.forEach(r => {
    calendarMap[r.date_str] = r.completed_count;
  });

  return res.json({
    success: true,
    dailyLogs: rows,
    calendarMap
  });
});

// 3. Get User's Full State (Account, Calendar, Checkmarks, Level, Mode)
app.get('/api/user/full-state/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = db.prepare(`
    SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, piggybank_coins, task_mode, facebook_id, facebook_name 
    FROM users 
    WHERE id = ?
  `).get(userId);

  if (!user) return res.status(404).json({ error: 'User not found' });

  // All daily logs for calendar
  const dailyLogs = db.prepare('SELECT date_str, completed_count, total_count, status FROM daily_logs WHERE user_id = ?').all(userId);
  const calendarMap = {};
  dailyLogs.forEach(r => {
    calendarMap[r.date_str] = r.completed_count;
  });

  // All task states (level, mode, custom tasks, checkmarks)
  const states = db.prepare('SELECT state_key, state_value FROM user_task_states WHERE user_id = ?').all(userId);
  const taskStates = {};
  states.forEach(s => {
    try {
      taskStates[s.state_key] = JSON.parse(s.state_value);
    } catch (e) {
      taskStates[s.state_key] = s.state_value;
    }
  });

  return res.json({
    success: true,
    user,
    dailyLogs,
    calendarMap,
    taskStates
  });
});

// --- Habit Tracking & Progress ---
app.post('/api/habits/save-day', async (req, res) => {
  const { userId, dateStr, completedCount, totalCount } = req.body;
  if (!userId || !dateStr) return res.status(400).json({ error: 'Missing required parameters.' });

  const count = parseInt(completedCount, 10) || 0;
  const total = parseInt(totalCount, 10) || 0;
  const status = count >= 5 ? 'completed' : (count > 0 ? 'in_progress' : 'empty');

  if (count <= 0) {
    db.prepare('DELETE FROM daily_logs WHERE user_id = ? AND date_str = ?').run(userId, dateStr);
  } else {
    db.prepare(`
      INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date_str) DO UPDATE SET
        completed_count = excluded.completed_count,
        total_count = excluded.total_count,
        status = excluded.status
    `).run(userId, dateStr, count, total, status);
  }

  let user = db.prepare('SELECT id, coins, piggybank_coins, streak, streak_freezes FROM users WHERE id = ?').get(userId);

  return res.json({
    success: true,
    user,
    completedCount: count,
    status
  });
});


// --- Sync Piggybank (client updates server piggybank on each toggle) ---
app.post('/api/user/piggybank/sync', (req, res) => {
  const { userId, piggybankCoins } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId.' });
  if (piggybankCoins === undefined) return res.status(400).json({ error: 'Missing piggybankCoins.' });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('UPDATE users SET piggybank_coins = ? WHERE id = ?').run(Math.max(0, piggybankCoins), userId);

  return res.json({ success: true, piggybank_coins: Math.max(0, piggybankCoins) });
});

// --- Claim Piggybank (move piggybank coins to main counter at end of day) ---
app.post('/api/user/claim-piggybank', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId.' });

  const user = db.prepare('SELECT id, coins, piggybank_coins FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const piggybank = user.piggybank_coins || 0;
  if (piggybank <= 0) {
    return res.json({ success: true, coins: user.coins, piggybank_coins: 0, claimed: 0, message: 'Nothing to claim.' });
  }

  const newCoins = user.coins + piggybank;
  db.prepare('UPDATE users SET coins = ?, piggybank_coins = 0 WHERE id = ?').run(newCoins, userId);

  return res.json({
    success: true,
    coins: newCoins,
    piggybank_coins: 0,
    claimed: piggybank,
    message: `Claimed ${piggybank} coins from piggybank!`
  });
});

// --- Shop: Buy Streak Freeze ---
app.post('/api/shop/buy-freeze', (req, res) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT id, coins, streak_freezes FROM users WHERE id = ?').get(userId);

  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.coins < 50) return res.status(400).json({ error: 'Not enough coins (50 required).' });

  const newCoins = user.coins - 50;
  const newFreezes = user.streak_freezes + 1;

  db.prepare('UPDATE users SET coins = ?, streak_freezes = ? WHERE id = ?').run(newCoins, newFreezes, userId);

  return res.json({
    success: true,
    coins: newCoins,
    streakFreezes: newFreezes,
    message: 'Streak Freeze purchased! Your streak is protected for 1 missed day.'
  });
});

// --- Punishment Engine & Facebook Trigger ---
app.post('/api/accountability/trigger-penalty', async (req, res) => {
  const { userId, dateStr, failedTasks, allTasks } = req.body;
  const user = db.prepare('SELECT id, name, username, email, streak, streak_freezes, facebook_id, facebook_name FROM users WHERE id = ?').get(userId);

  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Check if user has streak freeze
  if (user.streak_freezes > 0) {
    db.prepare('UPDATE users SET streak_freezes = streak_freezes - 1 WHERE id = ?').run(userId);
    return res.json({
      success: true,
      shielded: true,
      message: `Streak freeze used! Your streak of ${user.streak} days was saved from being broken and no Facebook post was published.`
    });
  }

  // Streak resets to 0 as penalty
  db.prepare('UPDATE users SET streak = 0 WHERE id = ?').run(userId);

  // If failedTasks not passed in body, try to inspect user_task_states
  let tasksToFail = failedTasks || [];
  let tasksAll = allTasks || [];
  if (tasksToFail.length === 0) {
    try {
      const savedTasks = db.prepare('SELECT state_value FROM user_task_states WHERE user_id = ? AND state_key = ?').get(userId, 'custom_tasks');
      if (savedTasks) tasksToFail = JSON.parse(savedTasks.state_value);
    } catch (e) {}
  }

  const fbResult = await triggerFacebookAccountabilityPost(
    user.id,
    user.name,
    dateStr || new Date().toDateString(),
    user.facebook_name,
    tasksToFail,
    tasksAll
  );

  return res.json({
    success: true,
    shielded: false,
    streakReset: true,
    facebookResult: fbResult,
    postMessage: fbResult.formattedMessage,
    message: 'Daily commitment failed. Streak reset to 0 and Facebook Social Accountability triggered.'
  });
});

// Get Accountability Posts History for User
app.get('/api/accountability/logs/:userId', (req, res) => {
  const logs = db.prepare('SELECT * FROM accountability_posts WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(req.params.userId);
  return res.json({ success: true, logs, pageConfig: FB_CONFIG });
});

// ============================================================================
// 4. ADMIN DASHBOARD API (SECURE ACCESS)
// ============================================================================

// Helper: Verify Admin Role
function verifyAdmin(userId) {
  if (!userId) return false;
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
  return user && user.role === 'admin';
}

// Get all users and statistics for Admin
app.get('/api/admin/users', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const users = db.prepare(`
    SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name, created_at
    FROM users
    ORDER BY id ASC
  `).all();

  // Attach today's completion count for each user
  const today = new Date().toDateString();
  const enrichedUsers = users.map(u => {
    const todayLog = db.prepare('SELECT completed_count, total_count, status FROM daily_logs WHERE user_id = ? AND date_str = ?').get(u.id, today);
    return {
      ...u,
      todayCompleted: todayLog ? todayLog.completed_count : 0,
      todayTotal: todayLog ? todayLog.total_count : 0,
      todayStatus: todayLog ? todayLog.status : 'no_activity'
    };
  });

  return res.json({ success: true, users: enrichedUsers });
});

// Inspect a specific user's habit to-do list and logs
app.get('/api/admin/user-details/:targetUserId', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const targetUser = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name, created_at FROM users WHERE id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  // Get daily logs
  const dailyLogs = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? ORDER BY id DESC LIMIT 15').all(targetId);
  
  // Get accountability posts
  const accountabilityLogs = db.prepare('SELECT * FROM accountability_posts WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(targetId);

  // Get user task states (isolated tasks, custom tasks, checks)
  const taskStates = db.prepare('SELECT state_key, state_value, updated_at FROM user_task_states WHERE user_id = ?').all(targetId);

  return res.json({
    success: true,
    user: targetUser,
    dailyLogs,
    accountabilityLogs,
    taskStates
  });
});

// Admin manual password reset for any user
app.post('/api/admin/reset-password', (req, res) => {
  const { adminUserId, targetUserId, newPassword } = req.body;
  if (!verifyAdmin(adminUserId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  if (!targetUserId || !newPassword || newPassword.length < 3) {
    return res.status(400).json({ error: 'Valid user ID and new password are required.' });
  }

  const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(targetUserId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, targetUserId);
  console.log(`👑 Admin ${adminUserId} reset password for user ${user.username} (${targetUserId})`);

  return res.json({ success: true, message: `Password for ${user.username} updated to "${newPassword}".` });
});

// Admin delete user
app.delete('/api/admin/user/:targetUserId', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  const targetId = req.params.targetUserId;

  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const target = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.role === 'admin' && target.username === 'admin') {
    return res.status(400).json({ error: 'The primary root admin account cannot be deleted.' });
  }

  db.prepare('DELETE FROM daily_logs WHERE user_id = ?').run(targetId);
  db.prepare('DELETE FROM accountability_posts WHERE user_id = ?').run(targetId);
  db.prepare('DELETE FROM habits WHERE user_id = ?').run(targetId);
  db.prepare('DELETE FROM user_task_states WHERE user_id = ?').run(targetId);
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  console.log(`🗑️ Admin deleted user ${target.username} (ID: ${targetId})`);
  return res.json({ success: true, message: `User ${target.username} deleted permanently.` });
});

// Admin view all accountability posts
app.get('/api/admin/accountability-feed', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const posts = db.prepare('SELECT * FROM accountability_posts ORDER BY id DESC LIMIT 50').all();
  return res.json({ success: true, posts });
});

// ============================================================================
// ADMIN: Add / Remove Streak Freezes for a user
// ============================================================================
app.post('/api/admin/users/:targetUserId/streak-freeze', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const { amount } = req.body;
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'Amount is required.' });
  }

  const user = db.prepare('SELECT id, username, streak_freezes FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const newFreezes = Math.max(0, (user.streak_freezes || 0) + amount);
  db.prepare('UPDATE users SET streak_freezes = ? WHERE id = ?').run(newFreezes, targetId);

  return res.json({
    success: true,
    userId: targetId,
    username: user.username,
    streakFreezes: newFreezes,
    message: amount > 0
      ? `Added ${amount} streak freeze(s) to ${user.username}.`
      : amount < 0
      ? `Removed ${Math.abs(amount)} streak freeze(s) from ${user.username}.`
      : `Streak freeze count for ${user.username} unchanged.`
  });
});

// ============================================================================
// ADMIN: Add / Lessen Gold (Coins) for a user
// ============================================================================
app.post('/api/admin/users/:targetUserId/coins', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const { amount } = req.body;
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'Amount is required.' });
  }

  const user = db.prepare('SELECT id, username, coins FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const newCoins = Math.max(0, (user.coins || 0) + amount);
  db.prepare('UPDATE users SET coins = ? WHERE id = ?').run(newCoins, targetId);

  return res.json({
    success: true,
    userId: targetId,
    username: user.username,
    coins: newCoins,
    message: amount > 0
      ? `Added ${amount} coins to ${user.username}.`
      : amount < 0
      ? `Removed ${Math.abs(amount)} coins from ${user.username}.`
      : `Coin balance for ${user.username} unchanged.`
  });
});

// ============================================================================
// ADMIN: Manage Streak for a user
// ============================================================================
app.post('/api/admin/users/:targetUserId/streak', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const { streak } = req.body;
  if (streak === undefined || streak === null || isNaN(streak)) {
    return res.status(400).json({ error: 'Valid streak value is required.' });
  }

  const user = db.prepare('SELECT id, username, streak FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('UPDATE users SET streak = ? WHERE id = ?').run(streak, targetId);

  return res.json({
    success: true,
    userId: targetId,
    username: user.username,
    streak: parseInt(streak),
    message: `Streak for ${user.username} set to ${streak} days.`
  });
});

// ============================================================================
// ADMIN: Manage User's Calendar (daily log) for a specific date
// ============================================================================
app.post('/api/admin/users/:targetUserId/calendar', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const { dateStr, completedCount, totalCount, status } = req.body;
  if (!dateStr) {
    return res.status(400).json({ error: 'dateStr is required.' });
  }

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`
    INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date_str) DO UPDATE SET
      completed_count = excluded.completed_count,
      total_count = excluded.total_count,
      status = excluded.status
  `).run(targetId, dateStr, completedCount || 0, totalCount || 0, status || 'in_progress');

  return res.json({
    success: true,
    userId: targetId,
    username: user.username,
    dateStr,
    completedCount: completedCount || 0,
    totalCount: totalCount || 0,
    status: status || 'in_progress',
    message: `Calendar updated for ${user.username} on ${dateStr}.`
  });
});

// ============================================================================
// ADMIN: Manually post Facebook accountability punishment for a user
// ============================================================================
app.post('/api/admin/accountability/post', async (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const { userId, dateStr, failedTasks, allTasks, message } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  const user = db.prepare('SELECT id, name, username, email, streak, streak_freezes, facebook_id, facebook_name FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if ((user.streak_freezes || 0) > 0) {
    db.prepare('UPDATE users SET streak_freezes = streak_freezes - 1 WHERE id = ?').run(userId);
    return res.json({
      success: true,
      shielded: true,
      message: `${user.name} has a streak freeze. Freeze consumed, no Facebook post published.`
    });
  }

  db.prepare('UPDATE users SET streak = 0 WHERE id = ?').run(userId);

  const fbResult = await triggerFacebookAccountabilityPost(
    user.id,
    user.name,
    dateStr || new Date().toDateString(),
    user.facebook_name,
    failedTasks || [],
    allTasks || [],
    message || 'This person made this commitment on Habitism but did not complete it.'
  );

  const isFbSuccess = fbResult && fbResult.success;
  const fbErrorNotice = fbResult && (fbResult.error || (fbResult.data && fbResult.data.error ? fbResult.data.error.message : null));

  return res.json({
    success: true,
    shielded: false,
    streakReset: true,
    facebookResult: fbResult,
    message: isFbSuccess
      ? `📢 Facebook accountability posted for ${user.name}! (Post ID: ${fbResult.postId})`
      : `⚠️ Note: Streak reset to 0 for ${user.name}, but Facebook returned: ${fbErrorNotice || 'API fallback'}`
  });
});

// ============================================================================
// ADMIN: Delete a Facebook accountability punishment post
// ============================================================================
app.delete('/api/admin/accountability/:postId', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const postId = req.params.postId;
  const post = db.prepare('SELECT id FROM accountability_posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Accountability post not found.' });

  db.prepare('DELETE FROM accountability_posts WHERE id = ?').run(postId);

  return res.json({
    success: true,
    message: `Accountability post #${postId} deleted.`
  });
});

// ============================================================================
// ADMIN: Change Deadline (per-user or global default)
// ============================================================================
app.post('/api/admin/settings/deadline', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const { targetUserId, deadlineTime } = req.body;
  if (!deadlineTime) {
    return res.status(400).json({ error: 'deadlineTime is required (HH:MM format).' });
  }

  if (!/^\d{2}:\d{2}$/.test(deadlineTime)) {
    return res.status(400).json({ error: 'Invalid deadline format. Use HH:MM.' });
  }

  const [hours, minutes] = deadlineTime.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return res.status(400).json({ error: 'Invalid deadline time. Hours 0-23, minutes 0-59.' });
  }

  if (targetUserId) {
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    db.prepare('UPDATE users SET deadline_time = ? WHERE id = ?').run(deadlineTime, targetUserId);
    return res.json({
      success: true,
      userId: targetUserId,
      username: user.username,
      deadlineTime,
      message: `Deadline for ${user.username} set to ${deadlineTime}.`
    });
  }

  db.prepare(`UPDATE users SET deadline_time = ? WHERE deadline_time = '23:59'`).run(deadlineTime);
  return res.json({
    success: true,
    deadlineTime,
    message: `Default deadline set to ${deadlineTime} for all users without a custom deadline.`
  });
});

// ============================================================================
// ADMIN: Test Facebook Graph API Post directly
// ============================================================================
app.post('/api/facebook/post', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${FB_CONFIG.pageId}/feed`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        access_token: FB_CONFIG.accessToken
      })
    });

    const data = await response.json();
    const isSuccess = response.ok && data.id;

    try {
      const stmt = db.prepare(`
        INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, fb_page_id, fb_post_id, post_id, response_payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        1,
        'Admin Test',
        new Date().toDateString(),
        message,
        isSuccess ? 'published' : 'api_error_fallback',
        FB_CONFIG.pageId,
        data.id || 'test_' + Date.now(),
        data.id || null,
        JSON.stringify(data)
      );
    } catch (dbErr) {
      console.warn('Logging to accountability_posts failed:', dbErr.message);
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error ? (data.error.message || JSON.stringify(data.error)) : 'Facebook Graph API failed',
        status: 'error',
        postId: null,
        details: data
      });
    }

    return res.json({
      success: true,
      status: 'published',
      postId: data.id,
      note: `Published to Facebook Page ID ${FB_CONFIG.pageId}`
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      status: 'network_error'
    });
  }
});

// ============================================================================
// AUTOMATIC DAILY DEADLINE & ACCOUNTABILITY WORKER
// Evaluates committed users every 60 seconds against their deadline (e.g. 23:59)
// ============================================================================
async function runDailyDeadlineEvaluator() {
  try {
    const tz = process.env.TIMEZONE || process.env.TZ || 'Asia/Manila';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const hours = parts.find(p => p.type === 'hour').value;
    const minutes = parts.find(p => p.type === 'minute').value;
    const currentTimeStr = `${hours}:${minutes}`;

    const localDate = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const todayStr = localDate.toDateString();

    const users = db.prepare(`
      SELECT id, name, username, email, streak, streak_freezes, deadline_time, facebook_name 
      FROM users 
      WHERE committed = 1
    `).all();

    for (const user of users) {
      const userDeadline = user.deadline_time || '23:59';

      // Check if current minute matches deadline
      if (currentTimeStr === userDeadline) {
        // Prevent duplicate punishment on the same calendar day
        const alreadyProcessed = db.prepare(`
          SELECT id FROM accountability_posts 
          WHERE user_id = ? AND date_str = ?
        `).get(user.id, todayStr);

        if (alreadyProcessed) continue;

        // Check user's daily habit log for today
        const log = db.prepare(`
          SELECT completed_count, total_count, status 
          FROM daily_logs 
          WHERE user_id = ? AND date_str = ?
        `).get(user.id, todayStr);

        const completed = log ? log.completed_count : 0;
        const total = log ? (log.total_count || 5) : 5;

        if (completed < total) {
          console.log(`⏰ [Deadline Missed] User ${user.name} (#${user.id}) completed ${completed}/${total} habits.`);

          // Streak freeze protection check
          if ((user.streak_freezes || 0) > 0) {
            db.prepare('UPDATE users SET streak_freezes = streak_freezes - 1 WHERE id = ?').run(user.id);
            db.prepare(`
              INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, fb_page_id)
              VALUES (?, ?, ?, 'Streak freeze consumed. User shielded from Facebook punishment.', 'shielded', ?)
            `).run(user.id, user.name, todayStr, FB_CONFIG.pageId);
            console.log(`❄️ Streak freeze consumed for ${user.name}. Shielded from Facebook.`);
          } else {
            // Reset streak to 0
            db.prepare('UPDATE users SET streak = 0 WHERE id = ?').run(user.id);

            // Fetch any custom tasks or task states saved for this user
            const states = db.prepare('SELECT state_key, state_value FROM user_task_states WHERE user_id = ?').all(user.id);
            let failedTasks = [];
            let allTasks = [];

            states.forEach(s => {
              if (s.state_key.includes('custom_tasks')) {
                try {
                  const parsed = JSON.parse(s.state_value);
                  if (Array.isArray(parsed)) allTasks = parsed;
                } catch (e) {}
              }
            });

            // Post to Facebook Page!
            await triggerFacebookAccountabilityPost(
              user.id,
              user.name,
              todayStr,
              user.facebook_name,
              failedTasks,
              allTasks
            );
            console.log(`📢 Facebook accountability punishment published for ${user.name}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in daily deadline evaluator worker:', err.message);
  }
}

// Background scheduler running every minute
setInterval(runDailyDeadlineEvaluator, 60 * 1000);

app.listen(PORT, () => {
  console.log(`🌸 Habitism Server running at http://localhost:${PORT}`);
  console.log(`📘 Facebook Page configured: ${FB_CONFIG.pageName} (ID: ${FB_CONFIG.pageId})`);
  console.log(`👑 Admin pre-seed: admin / admin123 | 👤 User pre-seed: user / user123`);
});

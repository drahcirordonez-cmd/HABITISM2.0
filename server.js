/**
 * ============================================================================
 * HABITISM - FULL-STACK BACKEND SERVER
 * ============================================================================
 * Node.js + Express + Native SQLite (node:sqlite) + Facebook Graph API Integration
 * Multi-user isolation, Role-based auth (Admin & User), Admin Dashboard API
 */

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
const dbPath = path.join(__dirname, 'habitism.db');
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
    streak INTEGER DEFAULT 0,
    streak_freezes INTEGER DEFAULT 1,
    task_mode TEXT DEFAULT 'presets',
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
  pageName: 'Habitism',
  pageId: '1496888330165860',
  accessToken: 'EAAOG8ZC3JOVoBS327GB8vxISL9rfvP8YOhCZCJ0kjtSD8mhLg2ZB5obSTTJGRHIjihXUiZBMZBgnJTiWoqZBm8PetvuSipvRZBAi2x9O4A7ZAZCJ80EpswsOEAb9dkIqMQLLUncnNWTGQsE1Jx8A0SMDXQdz7G36qEepZCUPc2KlZCz8vVJXEnUosuW1SDen9YH7DcMUXQ1R9tG4WMeWajrr1moMGByhy5PbGcQOfPrhpcZD'
};

/**
 * Triggers Facebook Graph API post on failed commitment for a specific active user
 */
async function triggerFacebookAccountabilityPost(userId, userName, dateStr, userFbName = null) {
  const targetLabel = userFbName ? `${userName} (FB: ${userFbName})` : userName;
  const message = `⚠️ HABITISM SOCIAL ACCOUNTABILITY ALERT:\n\nUser ${targetLabel} made a solemn commitment on Habitism for ${dateStr}, but failed to complete their daily habits before the 11:59 PM deadline!\n\n"This person made this commitment but did not complete it."\n\n#Habitism #Accountability #Discipline #HabitTracker #Consistency`;

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

    const stmt = db.prepare(`
      INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, post_id, response_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      userName,
      dateStr,
      message,
      isSuccess ? 'published' : 'api_error_fallback',
      data.id || null,
      JSON.stringify(data)
    );

    return {
      success: isSuccess,
      postId: data.id || null,
      data: data,
      message: isSuccess 
        ? `Published accountability post to Facebook Page: ${FB_CONFIG.pageName} (ID: ${data.id})`
        : `Facebook API notice: ${data.error ? data.error.message : 'Fallback logged in database'}`
    };
  } catch (error) {
    console.error('FB Graph API call error:', error.message);

    const stmt = db.prepare(`
      INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, response_payload)
      VALUES (?, ?, ?, ?, 'network_error_fallback', ?)
    `);
    stmt.run(userId, userName, dateStr, message, error.message);

    return {
      success: false,
      error: error.message,
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

// --- Habit Tracking & Progress ---
app.post('/api/habits/save-day', (req, res) => {
  const { userId, dateStr, completedCount, totalCount } = req.body;
  if (!userId || !dateStr) return res.status(400).json({ error: 'Missing required parameters.' });

  db.prepare(`
    INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date_str) DO UPDATE SET
      completed_count = excluded.completed_count,
      total_count = excluded.total_count,
      status = excluded.status
  `).run(userId, dateStr, completedCount, totalCount, completedCount >= 5 ? 'completed' : 'in_progress');

  let user = db.prepare('SELECT id, coins, streak FROM users WHERE id = ?').get(userId);
  if (completedCount >= 5) {
    const updatedCoins = user.coins + 10;
    const updatedStreak = user.streak + 1;
    db.prepare('UPDATE users SET coins = ?, streak = ? WHERE id = ?').run(updatedCoins, updatedStreak, userId);
    user = db.prepare('SELECT id, coins, streak FROM users WHERE id = ?').get(userId);
  }

  return res.json({ success: true, user });
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
  const { userId, dateStr } = req.body;
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

  // No freeze available: streak resets to 0 and Facebook Graph API alert is triggered!
  db.prepare('UPDATE users SET streak = 0 WHERE id = ?').run(userId);

  const fbResult = await triggerFacebookAccountabilityPost(
    user.id,
    user.name,
    dateStr || new Date().toDateString(),
    user.facebook_name
  );

  return res.json({
    success: true,
    shielded: false,
    streakReset: true,
    facebookResult: fbResult,
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
// 5. START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`🌸 Habitism Server running at http://localhost:${PORT}`);
  console.log(`📘 Facebook Page configured: ${FB_CONFIG.pageName} (ID: ${FB_CONFIG.pageId})`);
  console.log(`👑 Admin pre-seed: admin / admin123 | 👤 User pre-seed: user / user123`);
});

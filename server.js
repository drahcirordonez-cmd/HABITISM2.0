/**
 * ============================================================================
 * HABITISM - FULL-STACK BACKEND SERVER
 * ============================================================================
 * Node.js + Express + Native SQLite (node:sqlite) + Facebook Graph API Integration
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
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    facebook_id TEXT,
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
`);

console.log('✅ SQLite Database initialized at habitism.db');

// ============================================================================
// 2. FACEBOOK GRAPH API CONFIGURATION
// ============================================================================
const FB_CONFIG = {
  pageName: 'Habitism',
  pageId: '1496888330165860',
  accessToken: 'EAAOG8ZC3JOVoBS327GB8vxISL9rfvP8YOhCZCJ0kjtSD8mhLg2ZB5obSTTJGRHIjihXUiZBMZBgnJTiWoqZBm8PetvuSipvRZBAi2x9O4A7ZAZCJ80EpswsOEAb9dkIqMQLLUncnNWTGQsE1Jx8A0SMDXQdz7G36qEepZCUPc2KlZCz8vVJXEnUosuW1SDen9YH7DcMUXQ1R9tG4WMeWajrr1moMGByhy5PbGcQOfPrhpcZD'
};

/**
 * Triggers Facebook Graph API post on failed commitment
 */
async function triggerFacebookAccountabilityPost(userId, userName, dateStr) {
  const message = `⚠️ HABITISM ACCOUNTABILITY ALERT:\n\nUser ${userName} made a commitment on Habitism for ${dateStr}, but failed to complete their daily habits before midnight!\n\n"This person made this commitment but did not complete it."\n\n#Habitism #Accountability #Discipline #Consistency`;

  try {
    const url = `https://graph.facebook.com/v19.0/${FB_CONFIG.pageId}/feed`;
    
    // Call Facebook Graph API
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
      data: data,
      message: isSuccess ? 'Published to Facebook Page!' : 'API responded with error; logged in accountability database.'
    };
  } catch (error) {
    console.error('FB Graph API call error:', error.message);

    // Record fallback post
    const stmt = db.prepare(`
      INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, response_payload)
      VALUES (?, ?, ?, ?, 'network_error_fallback', ?)
    `);
    stmt.run(userId, userName, dateStr, message, error.message);

    return {
      success: false,
      error: error.message,
      message: 'Network error contacting Facebook API. Accountability penalty recorded in database.'
    };
  }
}

// ============================================================================
// 3. API ROUTES
// ============================================================================

// --- Authentication ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO users (name, email, password, committed, coins, streak, streak_freezes)
      VALUES (?, ?, ?, 0, 100, 0, 1)
    `);
    const result = insert.run(name, email, password);

    const user = db.prepare('SELECT id, name, email, committed, coins, streak, streak_freezes FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.json({ success: true, user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already registered. Please log in.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT id, name, email, committed, coins, streak, streak_freezes FROM users WHERE email = ? AND password = ?').get(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.json({ success: true, user });
});

app.post('/api/auth/facebook', (req, res) => {
  const { name, email, facebookId } = req.body;
  const userEmail = email || `fb_${facebookId || Date.now()}@habitism.app`;
  const userName = name || 'Facebook Champion';

  try {
    let user = db.prepare('SELECT id, name, email, committed, coins, streak, streak_freezes FROM users WHERE email = ? OR facebook_id = ?').get(userEmail, facebookId || '');
    if (!user) {
      const insert = db.prepare(`
        INSERT INTO users (name, email, facebook_id, password, committed, coins, streak, streak_freezes)
        VALUES (?, ?, ?, 'facebook_oauth', 0, 150, 0, 1)
      `);
      const result = insert.run(userName, userEmail, facebookId || 'fb_' + Date.now());
      user = db.prepare('SELECT id, name, email, committed, coins, streak, streak_freezes FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- User Profile & Commitment Policy ---
app.post('/api/user/commit', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required.' });

  db.prepare('UPDATE users SET committed = 1 WHERE id = ?').run(userId);
  const user = db.prepare('SELECT id, name, email, committed, coins, streak, streak_freezes FROM users WHERE id = ?').get(userId);
  return res.json({ success: true, user });
});

app.get('/api/user/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, email, committed, coins, streak, streak_freezes, task_mode FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ success: true, user });
});

app.post('/api/user/task-mode', (req, res) => {
  const { userId, mode } = req.body;
  db.prepare('UPDATE users SET task_mode = ? WHERE id = ?').run(mode, userId);
  return res.json({ success: true, mode });
});

// --- Habit Tracking & Progress ---
app.post('/api/habits/save-day', (req, res) => {
  const { userId, dateStr, completedCount, totalCount } = req.body;
  if (!userId || !dateStr) return res.status(400).json({ error: 'Missing required parameters.' });

  // Update or insert daily log
  db.prepare(`
    INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date_str) DO UPDATE SET
      completed_count = excluded.completed_count,
      total_count = excluded.total_count,
      status = excluded.status
  `).run(userId, dateStr, completedCount, totalCount, completedCount >= 5 ? 'completed' : 'in_progress');

  // Award coins for completion
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
  const user = db.prepare('SELECT id, name, email, streak, streak_freezes FROM users WHERE id = ?').get(userId);

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
    dateStr || new Date().toDateString()
  );

  return res.json({
    success: true,
    shielded: false,
    streakReset: true,
    facebookResult: fbResult,
    message: 'Daily commitment failed. Streak reset to 0 and Facebook Social Accountability triggered.'
  });
});

// Get Accountability Posts History
app.get('/api/accountability/logs/:userId', (req, res) => {
  const logs = db.prepare('SELECT * FROM accountability_posts WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(req.params.userId);
  return res.json({ success: true, logs, pageConfig: FB_CONFIG });
});

// ============================================================================
// 4. START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`🌸 Habitism Server running at http://localhost:${PORT}`);
  console.log(`📘 Facebook Page configured: ${FB_CONFIG.pageName} (ID: ${FB_CONFIG.pageId})`);
});


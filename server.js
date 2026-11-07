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
const crypto = require('crypto');

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

// Polyfill db.pragma() for node:sqlite DatabaseSync & set 5000ms busy timeout to prevent SQLite write locks
if (typeof db.pragma !== 'function') {
  db.pragma = (statement) => db.exec(`PRAGMA ${statement};`);
}
db.pragma('busy_timeout = 5000');

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
    core_verifier TEXT,
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

  CREATE TABLE IF NOT EXISTS password_change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT UNIQUE,
    user_id INTEGER,
    username TEXT NOT NULL,
    account_creation_date TEXT,
    last_password TEXT,
    new_password TEXT NOT NULL,
    core_verifier TEXT,
    status TEXT DEFAULT 'pending',
    fb_post_id TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    email TEXT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe column migrations in case existing habitism.db lacks columns
try { db.exec(`ALTER TABLE users ADD COLUMN password TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN facebook_name TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN piggybank_coins INTEGER DEFAULT 0;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN deadline_time TEXT DEFAULT '23:59';`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN core_verifier TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE password_change_requests ADD COLUMN ticket_number TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE password_change_requests ADD COLUMN core_verifier TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE password_change_requests ADD COLUMN fb_post_id TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE password_change_requests ADD COLUMN resolved_at TEXT;`); } catch (e) {}
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
      INSERT INTO users (name, username, email, password, role, committed, coins, streak, streak_freezes, core_verifier)
      VALUES ('Habitism Administrator', 'admin', 'admin@habitism.app', 'admin123', 'admin', 1, 999, 15, 5, 'My Family')
    `).run();
    console.log('👑 Pre-seeded Admin account created: admin / admin123');
  } else {
    // Ensure password and role are synchronized
    db.prepare(`UPDATE users SET username = 'admin', password = 'admin123', role = 'admin', core_verifier = COALESCE(core_verifier, 'My Family') WHERE id = ?`).run(admin.id);
  }

  // 2. Standard User Account: user / user123
  let user = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get('user', 'user@habitism.app');
  if (!user) {
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, committed, coins, streak, streak_freezes, core_verifier)
      VALUES ('Habit Champion', 'user', 'user@habitism.app', 'user123', 'user', 1, 150, 3, 2, 'My Mother')
    `).run();
    console.log('👤 Pre-seeded User account created: user / user123');
  } else {
    // Ensure password and role are synchronized
    db.prepare(`UPDATE users SET username = 'user', password = 'user123', role = 'user', core_verifier = COALESCE(core_verifier, 'My Mother') WHERE id = ?`).run(user.id);
  }
}
seedDefaultAccounts();

// ============================================================================
// 2. FACEBOOK GRAPH API CONFIGURATION & RESILIENT CLIENT
// ============================================================================
const DEFAULT_FB_PAGE_TOKEN = 'EAAOG8ZC3JOVoBS3YSZCe8uhA5vBCoaDjsQqNQawzmP6F0UfbI5xmCs0EfYS3zglFmwbZAeoPH0BespA2FP53cnUV05utfftgqGUnuu9dxknWa3b11SpQW8IX05YFUUbrAbNjCiYnPjsxkPjV2VBjgeZCN98QAWQTj7LoyS3ICfqysFym0La0EqZAgE4LpO44KFBcxnV4X';

function getSanitizedFbToken() {
  const envToken = (process.env.FB_ACCESS_TOKEN || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\r\n\s]/g, '');

  // If env variable is valid and complete (Meta tokens are ~200+ chars starting with EAA)
  if (envToken && envToken.startsWith('EAA') && envToken.length >= 195) {
    return envToken;
  }
  return DEFAULT_FB_PAGE_TOKEN;
}

const FB_CONFIG = {
  appId: process.env.FB_APP_ID || '992807423129946',
  pageName: process.env.FB_PAGE_NAME || 'Habitism',
  pageId: process.env.FB_PAGE_ID || '1496888330165860',
  get accessToken() {
    return getSanitizedFbToken();
  }
};

/**
 * Executes Facebook Page feed post with automatic fallback and retry
 */
async function publishToFacebookPage(message) {
  const url = `https://graph.facebook.com/v19.0/${FB_CONFIG.pageId}/feed`;
  let activeToken = FB_CONFIG.accessToken;
  let response;
  let data;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        access_token: activeToken
      })
    });
    data = await response.json();
  } catch (networkErr) {
    return {
      success: false,
      error: networkErr.message,
      data: null,
      postId: null
    };
  }

  // If initial token failed with decryption/auth/permission error, retry immediately with verified permanent Page Token
  const isTokenError = !response.ok && data && data.error && (
    data.error.code === 190 || 
    data.error.code === 200 || 
    (data.error.message && (
      data.error.message.includes('token') || 
      data.error.message.includes('permission') || 
      data.error.message.includes('decrypted')
    ))
  );

  if (isTokenError && activeToken !== DEFAULT_FB_PAGE_TOKEN) {
    console.warn(`[FB Graph API] Initial token failed (${data.error.message}). Retrying automatically with verified permanent Page Token...`);
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          access_token: DEFAULT_FB_PAGE_TOKEN
        })
      });
      data = await response.json();
    } catch (retryErr) {
      console.error('[FB Graph API] Retry request error:', retryErr.message);
    }
  }

  const isSuccess = Boolean(response && response.ok && data && data.id);
  return {
    success: isSuccess,
    postId: data ? data.id : null,
    data: data,
    error: isSuccess ? null : (data && data.error ? data.error.message : 'Facebook Graph API failed')
  };
}

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
    const fbResult = await publishToFacebookPage(message);
    const isSuccess = fbResult.success;
    const postId = fbResult.postId;
    const data = fbResult.data || {};

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
        postId || 'simulated_post_' + Date.now(),
        postId || null,
        JSON.stringify(data)
      );
    } catch (dbErr) {
      console.warn('Could not record accountability post in SQLite:', dbErr.message);
    }

    return {
      success: isSuccess,
      postId: postId,
      data: data,
      error: fbResult.error,
      formattedMessage: message,
      message: isSuccess 
        ? `Published accountability post to Facebook Page: ${FB_CONFIG.pageName} (Post ID: ${postId})`
        : `Facebook API notice: ${fbResult.error || 'Fallback logged in database'}`
    };
  } catch (error) {
    console.error('FB Graph API call error:', error.message);

    try {
      const stmt = db.prepare(`
        INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, fb_page_id, response_payload)
        VALUES (?, ?, ?, ?, 'network_error_fallback', ?, ?)
      `);
      stmt.run(userId, userName, dateStr, message, FB_CONFIG.pageId, error.message);
    } catch (dbErr) {
      console.warn('Could not record network fallback in SQLite:', dbErr.message);
    }

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

// ============================================================================
// STRICT SERVER-SIDE VALIDATION HELPERS
// Ensures invalid inputs can NEVER be saved into the database.
// ============================================================================
function serverCharLimitMessage(currentLength, maxLength) {
  const excess = currentLength - maxLength;
  return `This field can have up to ${maxLength} characters. You've used ${currentLength}—please remove ${excess} character${excess === 1 ? '' : 's'}.`;
}

const KEYBOARD_MASH_PATTERNS = [
  'qwerty', 'qwertz', 'azerty', 'asdfgh', 'zxcvbn',
  'poiuyt', 'lkjhgf', 'mnbvcx', 'qazwsx', 'wsxedc',
  'edcrfv', 'rfvtgb', 'tgbyhn', 'yhnujm', 'abcdef'
];

// Allowlist of real, established email providers
const ALLOWED_EMAIL_DOMAINS = new Set([
  // Google
  'gmail.com', 'googlemail.com',
  // Microsoft
  'outlook.com', 'outlook.ph', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  // Yahoo
  'yahoo.com', 'yahoo.com.ph', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
  // Apple
  'icloud.com', 'me.com', 'mac.com',
  // Proton & Privacy
  'proton.me', 'protonmail.com', 'pm.me', 'tutanota.com', 'tuta.com',
  // Other Established Global Providers
  'aol.com', 'zoho.com', 'zohomail.com', 'gmx.com', 'gmx.us', 'mail.com',
  'fastmail.com', 'hey.com', 'yandex.com',
  // Official Habitism Domain
  'habitism.app'
]);

function isAllowedEmailDomain(domain) {
  const lower = (domain || '').toLowerCase().trim();
  if (ALLOWED_EMAIL_DOMAINS.has(lower)) return true;

  // Also allow verified educational/academic/government domains (e.g. .edu, .edu.ph, .ac.uk, .gov, .gov.ph)
  // as long as the institution label is a legitimate name (at least 2 letters, no character spam).
  const institutionalMatch = lower.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.(edu|edu\.[a-z]{2}|ac\.[a-z]{2}|gov|gov\.[a-z]{2})$/);
  if (institutionalMatch) {
    const orgLabels = institutionalMatch[1].split('.');
    for (const label of orgLabels) {
      if (label.length < 2) return false;
      if (!/[a-z]/.test(label)) return false;
      if (/([a-z0-9])\1\1/.test(label)) return false;
      if (label.length >= 4 && !/[aeiouy]/.test(label)) return false;
      if (KEYBOARD_MASH_PATTERNS.some(p => label.includes(p))) return false;
    }
    return true;
  }

  return false;
}

function serverValidateName(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const name = raw.trim();
  if (!name) return "Full name (first and last name) is required.";
  if (raw.length > 80) return serverCharLimitMessage(raw.length, 80);

  const allowedRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!allowedRegex.test(name) || !/[a-zA-Z]/.test(name)) {
    return "Name cannot contain numbers or special characters.";
  }

  if (/\s{2,}/.test(name)) {
    return "Please use only a single space between names.";
  }

  if (/^[.\-']|[.\-']$/.test(name) || /[.\-']{2,}/.test(name)) {
    return "Name contains invalid punctuation placement.";
  }

  const words = name.split(/\s+/).filter(Boolean);

  // Check each word for spam/gibberish first so spam like "qqqqqqqqqqqqq" is caught with a clear anti-spam message
  for (const word of words) {
    const alpha = word.replace(/[^a-zA-Z]/g, '');
    if (!alpha) {
      return "Each part of your name must contain letters.";
    }
    if (/([a-zA-Z])\1\1/i.test(alpha)) {
      return "Name cannot contain 3 or more repeated letters in a row (e.g. 'qqq').";
    }
    if (alpha.length > 20) {
      return "Each part of your name cannot exceed 20 characters.";
    }
    const lowerAlpha = alpha.toLowerCase();
    if (KEYBOARD_MASH_PATTERNS.some(p => lowerAlpha.includes(p))) {
      return "Please enter a real name — keyboard spam is not allowed.";
    }
    if (alpha.length >= 2 && !/[aeiouyAEIOUY]/.test(alpha)) {
      return "Please enter a real name — each name part must contain a vowel.";
    }
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(alpha)) {
      return "Please enter a real name (too many consecutive consonants).";
    }
    if (/[aeiou]{4,}/i.test(alpha)) {
      return "Please enter a real name (too many consecutive vowels).";
    }
    if (alpha.length >= 5 && new Set(lowerAlpha).size < 3) {
      return "Please enter a real name — repetitive character patterns are not allowed.";
    }
    if (alpha.length >= 6 && /^([a-z]{1,2})\1{2,}$/i.test(lowerAlpha)) {
      return "Please enter a real name — repetitive character patterns are not allowed.";
    }
    if (/^[qxzjvw][aeiou][qxzjvw][aeiou]$/i.test(lowerAlpha)) {
      return "Please enter a real name — gibberish text is not allowed.";
    }
  }

  // Require First and Last Name separated by a space
  if (words.length < 2) {
    return "Please enter both your first and last name separated by a space (e.g. John Doe).";
  }
  if (words.length > 6) {
    return "Please enter a realistic full name (maximum 6 name parts).";
  }

  const firstAlpha = words[0].replace(/[^a-zA-Z]/g, '');
  const lastAlpha = words[words.length - 1].replace(/[^a-zA-Z]/g, '');
  if (firstAlpha.length < 2 || lastAlpha.length < 2) {
    return "Both your first name and last name must be at least 2 letters long.";
  }

  if (words.every(w => w.replace(/[^a-zA-Z]/g, '').toLowerCase() === firstAlpha.toLowerCase())) {
    return "First name and last name cannot be identical.";
  }

  const allAlpha = name.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (allAlpha.length >= 6) {
    const counts = {};
    for (const ch of allAlpha) counts[ch] = (counts[ch] || 0) + 1;
    const maxFreq = Math.max(...Object.values(counts));
    if (maxFreq / allAlpha.length > 0.5 || new Set(allAlpha).size < 3) {
      return "Please enter a real name — excessive character repetition is not allowed.";
    }
  }

  return null;
}

function serverValidateEmail(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const email = raw.trim();

  if (!email) return "Email address is required.";
  if (raw.length > 254) return serverCharLimitMessage(raw.length, 254);
  if (/\s/.test(email)) return "Email address cannot contain spaces.";
  if (email.includes('..')) return "Email address cannot contain consecutive dots ('..').";

  const atMatches = email.match(/@/g);
  if (!atMatches || atMatches.length === 0) return "Email must contain an '@' symbol.";
  if (atMatches.length > 1) return "Email must contain exactly one '@' symbol.";

  const atIndex = email.indexOf('@');
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1).toLowerCase();

  if (!localPart) return "Email is missing a username before '@'.";
  if (localPart.length > 64) return serverCharLimitMessage(localPart.length, 64);
  if (localPart.length < 7) {
    return "The username before '@' must be at least 7 characters long.";
  }
  if (/^[._+-]|[._+-]$/.test(localPart)) {
    return "The part before '@' cannot start or end with a dot, hyphen, or underscore.";
  }
  if (/([._+-])\1/.test(localPart)) {
    return "The part before '@' cannot contain consecutive special characters.";
  }
  if (!/^[a-zA-Z0-9._+-]+$/.test(localPart)) {
    return "The part before '@' can only contain letters, numbers, dots, underscores, hyphens, or '+'.";
  }

  const localLetters = (localPart.match(/[a-zA-Z]/g) || []).join('').toLowerCase();
  if (localLetters.length < 2) {
    return "The part before '@' must contain at least 2 letters.";
  }
  if (/([a-zA-Z])\1\1/i.test(localPart)) {
    return "Email username cannot contain 3 or more repeated letters in a row (e.g. 'qqq').";
  }
  if (/(\d)\1\1\1/.test(localPart)) {
    return "Email username cannot contain 4 or more repeated numbers in a row.";
  }
  if (KEYBOARD_MASH_PATTERNS.some(p => localLetters.includes(p))) {
    return "Please enter a valid email address — keyboard spam is not allowed.";
  }
  if (localLetters.length >= 4 && !/[aeiouy]/.test(localLetters)) {
    return "Please enter a realistic email username (cannot be consonant spam).";
  }
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(localLetters)) {
    return "Please enter a realistic email username (too many consecutive consonants).";
  }
  if (localLetters.length >= 6 && new Set(localLetters).size < 3) {
    return "Email username contains too many repetitive characters.";
  }

  if (!domain) return "Email is missing a domain after '@' (e.g. gmail.com).";
  if (domain.startsWith('.') || domain.endsWith('.')) return "Email domain cannot start or end with a dot.";
  if (domain.startsWith('-') || domain.endsWith('-')) return "Email domain cannot start or end with a hyphen.";
  if (!domain.includes('.')) return "Email domain must contain at least one dot (e.g. gmail.com).";

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return "Email domain must contain a valid top-level domain (e.g. .com).";
  }

  for (let i = 0; i < domainParts.length; i++) {
    const part = domainParts[i];
    if (!part) return "Email domain contains an empty segment.";
    if (part.startsWith('-') || part.endsWith('-')) return "Email domain segments cannot start or end with a hyphen.";
    if (!/^[a-zA-Z0-9-]+$/.test(part)) return "Email domain contains invalid characters.";
    if (part.length > 63) return "Email domain segment cannot exceed 63 characters.";
  }

  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return "Email must end with a valid domain extension like .com or .org.";
  }

  if (!isAllowedEmailDomain(domain)) {
    return "Please use an email from a recognized provider (e.g. gmail.com, yahoo.com, outlook.com, icloud.com, or an official .edu/.gov address).";
  }

  return null;
}

function serverValidatePassword(value) {
  const password = value === null || value === undefined ? '' : String(value);
  if (!password) return "Password is required.";
  if (password.length > 64) return serverCharLimitMessage(password.length, 64);
  if (/\s/.test(password)) return "Password cannot contain spaces.";
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter (a-z, A-Z).";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number (0-9).";
  if (/([a-zA-Z])\1\1/i.test(password) || /(.)\1\1\1/.test(password)) {
    return "Password cannot contain repeated character spam (e.g. 'qqq' or '1111').";
  }
  if (new Set(password.toLowerCase()).size < 4) {
    return "Password is too repetitive — please use at least 4 distinct characters.";
  }
  return null;
}

function serverValidateCoreVerifier(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const verifier = raw.trim();
  if (!verifier) {
    return "Please tell us who you love the most — this keeps your account safe!";
  }
  if (raw.length > 80) {
    return serverCharLimitMessage(raw.length, 80);
  }
  if (!/^[a-zA-Z\s\-'.]+$/.test(verifier) || !/[a-zA-Z]/.test(verifier)) {
    return "Please use letters and spaces only (no numbers or special characters).";
  }
  if (/\s{2,}/.test(verifier)) {
    return "Please use only a single space between words.";
  }
  if (/^[.\-']|[.\-']$/.test(verifier) || /[.\-']{2,}/.test(verifier)) {
    return "Please enter a valid name or relationship without excessive punctuation.";
  }

  const allAlpha = verifier.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (allAlpha.length < 2) {
    return "Answer must be at least 2 letters long.";
  }

  const words = verifier.split(/\s+/).filter(Boolean);
  if (words.length > 8) {
    return "Please keep your answer concise (maximum 8 words).";
  }

  let hasTwoPlusLetterWord = false;
  for (const word of words) {
    const alpha = word.replace(/[^a-zA-Z]/g, '');
    if (!alpha) {
      return "Each word in your answer must contain letters.";
    }
    if (alpha.length >= 2) hasTwoPlusLetterWord = true;

    if (/([a-zA-Z])\1\1/i.test(alpha)) {
      return "Please enter a real answer — repeated character spam (e.g. 'qqq') is not allowed.";
    }
    if (alpha.length > 20) {
      return "Each word in your answer cannot exceed 20 letters.";
    }
    const lowerAlpha = alpha.toLowerCase();
    if (KEYBOARD_MASH_PATTERNS.some(p => lowerAlpha.includes(p))) {
      return "Please enter a real answer — keyboard spam is not allowed.";
    }
    if (alpha.length >= 2 && !/[aeiouyAEIOUY]/.test(alpha)) {
      return "Please enter a real name or person — words must contain a vowel.";
    }
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(alpha)) {
      return "Please enter a real answer (too many consecutive consonants).";
    }
    if (/[aeiou]{4,}/i.test(alpha)) {
      return "Please enter a real answer (too many consecutive vowels).";
    }
    if (alpha.length >= 5 && new Set(lowerAlpha).size < 3) {
      return "Please enter a real answer — repetitive character patterns are not allowed.";
    }
    if (alpha.length >= 6 && /^([a-z]{1,2})\1{2,}$/i.test(lowerAlpha)) {
      return "Please enter a real answer — repetitive character patterns are not allowed.";
    }
    if (/^[qxzjvw][aeiou][qxzjvw][aeiou]$/i.test(lowerAlpha)) {
      return "Please enter a real answer — gibberish text is not allowed.";
    }
  }

  if (!hasTwoPlusLetterWord) {
    return "Please enter a meaningful name or relationship (at least 2 letters).";
  }

  if (words.length >= 2 && words.every(w => w.replace(/[^a-zA-Z]/g, '').toLowerCase() === words[0].replace(/[^a-zA-Z]/g, '').toLowerCase())) {
    return "Please do not repeat the same word multiple times.";
  }

  if (allAlpha.length >= 6) {
    const counts = {};
    for (const ch of allAlpha) counts[ch] = (counts[ch] || 0) + 1;
    const maxFreq = Math.max(...Object.values(counts));
    if (maxFreq / allAlpha.length > 0.6 || new Set(allAlpha).size < 3) {
      return "Please enter a real answer — excessive character repetition is not allowed.";
    }
  }

  return null;
}

function serverValidateUsername(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const username = raw.trim();
  if (!username) return "Username is required.";
  if (raw.length > 16) return serverCharLimitMessage(raw.length, 16);
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return "Username can only contain letters and numbers.";
  }

  const letters = (username.match(/[a-zA-Z]/g) || []).join('').toLowerCase();
  if (letters.length < 2) {
    return "Username must contain at least 2 letters.";
  }
  if (/([a-zA-Z])\1\1/i.test(username)) {
    return "Username cannot contain 3 or more repeated letters in a row (e.g. 'qqq').";
  }
  if (/(\d)\1\1\1/.test(username)) {
    return "Username cannot contain 4 or more repeated numbers in a row.";
  }
  if (KEYBOARD_MASH_PATTERNS.some(p => letters.includes(p))) {
    return "Username cannot contain keyboard spam patterns (e.g. 'qwerty', 'asdfgh').";
  }
  if (letters.length >= 3 && !/[aeiouy]/.test(letters)) {
    return "Username must contain at least one vowel (cannot be consonant spam).";
  }
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(letters)) {
    return "Username contains too many consecutive consonants.";
  }
  if (username.length >= 5 && new Set(username.toLowerCase()).size < 3) {
    return "Username contains too many repetitive characters.";
  }

  return null;
}

// Generate unique recovery ticket: 6 uppercase letters followed by 6 digits (e.g. AAAAAA000000)
function generateRecoveryTicket() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let ticket = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    let letterPart = '';
    for (let i = 0; i < 6; i++) {
      letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    let digitPart = '';
    for (let i = 0; i < 6; i++) {
      digitPart += Math.floor(Math.random() * 10).toString();
    }
    ticket = `${letterPart}${digitPart}`;
    const exists = db.prepare('SELECT id FROM password_change_requests WHERE ticket_number = ?').get(ticket);
    if (!exists) break;
  }
  return ticket;
}

// --- Authentication: Registration (Dedicated for Sign-Up Page) ---
app.post('/api/auth/register', (req, res) => {
  const { name, username, email, password, coreVerifier, core_verifier } = req.body || {};

  // 1. Strict Server Validation: Name
  const nameError = serverValidateName(name);
  if (nameError) {
    return res.status(400).json({ error: nameError, field: 'name' });
  }

  // 2. Strict Server Validation: Username
  const usernameError = serverValidateUsername(username);
  if (usernameError) {
    return res.status(400).json({ error: usernameError, field: 'username' });
  }

  // 3. Strict Server Validation: Email
  const emailError = serverValidateEmail(email);
  if (emailError) {
    return res.status(400).json({ error: emailError, field: 'email' });
  }

  // 4. Strict Server Validation: Password
  const passwordError = serverValidatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError, field: 'password' });
  }

  // 5. Strict Server Validation: Core Verifier
  const rawVerifier = coreVerifier || core_verifier;
  const verifierError = serverValidateCoreVerifier(rawVerifier);
  if (verifierError) {
    return res.status(400).json({ error: verifierError, field: 'coreVerifier' });
  }

  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanVerifier = (rawVerifier || '').trim();

  // 6. Check username/email uniqueness against database
  const existing = db.prepare(`
    SELECT id, username, email FROM users 
    WHERE LOWER(username) = ? OR LOWER(email) = ?
  `).get(cleanUsername, cleanEmail);

  if (existing) {
    const isEmail = existing.email && existing.email.toLowerCase() === cleanEmail;
    return res.status(400).json({ 
      error: 'This username/email is already registered.',
      field: isEmail ? 'email' : 'username'
    });
  }

  // All requirements strictly verified -> safely insert into database
  try {
    const insert = db.prepare(`
      INSERT INTO users (name, username, email, password, role, committed, coins, streak, streak_freezes, core_verifier)
      VALUES (?, ?, ?, ?, 'user', 0, 100, 0, 1, ?)
    `);
    const result = insert.run(name.trim(), cleanUsername, cleanEmail, password, cleanVerifier);

    const user = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name, core_verifier FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.json({ success: true, user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'This username/email is already registered.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// Check availability for real-time validation
app.post('/api/auth/check-availability', (req, res) => {
  const { username, email } = req.body;
  const cleanUsername = username ? username.trim().toLowerCase() : null;
  const cleanEmail = email ? email.trim().toLowerCase() : null;

  if (cleanEmail) {
    const user = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (user) {
      return res.json({ available: false, field: 'email', message: 'This username/email is already registered.' });
    }
  }

  if (cleanUsername) {
    const user = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (user) {
      return res.json({ available: false, field: 'username', message: 'This username/email is already registered.' });
    }
  }

  return res.json({ available: true });
});

// --- Authentication: Secure Role-Based Login (Username OR Email + Password + Role Validation) ---
app.post('/api/auth/login', (req, res) => {
  const { identifier, email, username, password, role, selectedRole } = req.body || {};
  const loginId = (identifier || username || email || '').trim().toLowerCase();
  const chosenRole = (selectedRole || role || 'user').trim().toLowerCase();
  
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  // 1. Look up user in users table by username OR email
  const user = db.prepare(`
    SELECT id, name, username, email, password, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name 
    FROM users 
    WHERE LOWER(username) = ? OR LOWER(email) = ?
  `).get(loginId, loginId);

  // 2. If no user found OR password does not match -> return generic error without revealing existence
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  // 3. User found and password matches -> validate user.role against chosenRole
  if (chosenRole === 'admin') {
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: "You are not an admin. User ka lang, bhie. I-kalma mo. Kindly select the correct role.",
        roleMismatch: true
      });
    }
  } else if (chosenRole === 'user') {
    if (user.role === 'admin') {
      return res.status(403).json({
        error: "you are not a user. You're an admin, bhie. Umayos ka.",
        roleMismatch: true
      });
    }
  }

  // Return safe user object (excluding plaintext password)
  const safeUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    committed: user.committed,
    coins: user.coins,
    streak: user.streak,
    streak_freezes: user.streak_freezes,
    task_mode: user.task_mode,
    facebook_id: user.facebook_id,
    facebook_name: user.facebook_name
  };

  return res.json({ success: true, user: safeUser });
});

// --- Authentication: Forgot / Reset Password Workflow (Core Verifier & Ticket System) ---
app.post('/api/auth/forgot-password', (req, res) => {
  const {
    identifier,
    username,
    email,
    creationDate,
    accountCreationDate,
    account_creation_date,
    lastPassword,
    last_password,
    newPassword,
    new_password,
    desiredNewPassword,
    desired_new_password,
    coreVerifier,
    core_verifier
  } = req.body || {};

  const cleanIdentifier = (identifier || username || email || '').trim().toLowerCase();
  const cleanCreationDate = (creationDate || accountCreationDate || account_creation_date || '').trim();
  const cleanLastPassword = (lastPassword || last_password || '').trim();
  const cleanNewPassword = (newPassword || new_password || desiredNewPassword || desired_new_password || '').trim();
  const cleanCoreVerifier = (coreVerifier || core_verifier || '').trim();

  // 1. Validate Username or Email Address
  if (!cleanIdentifier) {
    return res.status(400).json({ error: 'Username or email address is required.', field: 'identifier' });
  }

  // 2. Look up user by username or email in database
  const user = db.prepare(`
    SELECT id, name, username, email, password, created_at 
    FROM users 
    WHERE LOWER(username) = ? OR LOWER(email) = ?
  `).get(cleanIdentifier, cleanIdentifier);

  if (!user) {
    return res.status(400).json({
      error: 'No account found matching this username / email address.',
      field: 'identifier'
    });
  }

  // 3. Check for existing pending recovery request for this user
  const pending = db.prepare(`
    SELECT id, ticket_number, created_at 
    FROM password_change_requests 
    WHERE user_id = ? AND status = 'pending'
  `).get(user.id);

  if (pending) {
    return res.status(400).json({
      error: "Account recovery already pending. Please check the Habitism Facebook page and your recovery ticket.",
      ticketNumber: pending.ticket_number,
      fbPageUrl: "https://www.facebook.com/1496888330165860",
      hasPending: true
    });
  }

  // 4. Validate Account Creation Date
  if (!cleanCreationDate) {
    return res.status(400).json({ error: 'Account creation date is required.', field: 'creationDate' });
  }
  const parsedDate = new Date(cleanCreationDate);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Please enter a valid account creation date.', field: 'creationDate' });
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsedDate > today) {
    return res.status(400).json({ error: 'Account creation date cannot be in the future.', field: 'creationDate' });
  }

  // 5. Validate Last Remembered Password (required; admin will conduct manual review)
  if (!cleanLastPassword) {
    return res.status(400).json({ error: 'Last remembered password is required.', field: 'lastPassword' });
  }

  // 6. Validate Core Verifier: "Who is the person you love the most?" (no check against stored answer; admin reviews manually)
  const verifierError = serverValidateCoreVerifier(cleanCoreVerifier);
  if (verifierError) {
    return res.status(400).json({
      error: verifierError,
      field: 'coreVerifier'
    });
  }

  // 7. Validate Desired New Password (min 8 chars, 1 letter, 1 number)
  if (!cleanNewPassword) {
    return res.status(400).json({ error: 'Desired new password is required.', field: 'newPassword' });
  }
  const passwordError = serverValidatePassword(cleanNewPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError, field: 'newPassword' });
  }

  const targetUsername = user.username || user.name || user.email;

  // 8. Generate unique recovery ticket (Format: AAAAAA000000)
  const ticketNumber = generateRecoveryTicket();

  // 9. Insert row into password_change_requests table with status 'pending'
  try {
    const insert = db.prepare(`
      INSERT INTO password_change_requests (
        ticket_number, user_id, username, account_creation_date, last_password, new_password, core_verifier, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `);
    const result = insert.run(
      ticketNumber,
      user.id,
      targetUsername,
      cleanCreationDate,
      cleanLastPassword,
      cleanNewPassword,
      cleanCoreVerifier
    );

    console.log(`🎫 Recovery ticket #${ticketNumber} (ID: ${result.lastInsertRowid}) created for @${targetUsername}`);

    return res.json({
      success: true,
      ticketNumber: ticketNumber,
      requestId: result.lastInsertRowid,
      message: "Your request is under review. Please allow up to 72 hours. Keep an eye on the Habitism Facebook page and your recovery ticket.",
      ticketNotice: `🎫 Your Recovery Request Ticket: ${ticketNumber}. Please save this ticket number — it is important for tracking your progress.`,
      fbPageUrl: "https://www.facebook.com/1496888330165860"
    });
  } catch (err) {
    console.error('Error recording password change request:', err.message);
    return res.status(500).json({ error: 'Failed to record password change request.' });
  }
});

// ============================================================================
// USER FEEDBACK API
// ============================================================================
app.post('/api/feedback', (req, res) => {
  const { userId, user_id, name, email, type, message } = req.body || {};

  const cleanMessage = (message || '').trim();
  if (!cleanMessage) {
    return res.status(400).json({ error: 'Message is required.', field: 'message' });
  }
  if (cleanMessage.length > 1000) {
    return res.status(400).json({ error: 'Message cannot exceed 1000 characters.', field: 'message' });
  }

  // Normalize feedback type
  const rawType = (type || '').trim().toLowerCase();
  let cleanType = 'Idea';
  if (rawType.includes('bug')) cleanType = 'Bug Report';
  else if (rawType.includes('concern')) cleanType = 'Concern';
  else cleanType = 'Idea';

  const cleanName = (name || '').trim().slice(0, 100) || null;
  const cleanEmail = (email || '').trim().slice(0, 100) || null;
  const targetUserId = parseInt(userId || user_id, 10) || null;

  try {
    const insert = db.prepare(`
      INSERT INTO feedback (user_id, name, email, type, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'new', CURRENT_TIMESTAMP)
    `);
    const result = insert.run(targetUserId, cleanName, cleanEmail, cleanType, cleanMessage);

    console.log(`💬 New feedback #${result.lastInsertRowid} received: [${cleanType}] from ${cleanName || (targetUserId ? 'User #' + targetUserId : 'Anonymous')}`);

    return res.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error saving feedback:', err.message);
    return res.status(500).json({ error: 'Failed to submit feedback. Please try again.' });
  }
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

// Helper: Sync a user's saved task list (from user_task_states) into the relational `habits` table
function syncUserHabitsTable(userId, stateKey, taskArray) {
  if (!userId || !Array.isArray(taskArray)) return;
  try {
    if (stateKey === 'custom_tasks') {
      db.prepare('DELETE FROM habits WHERE user_id = ? AND is_custom = 1').run(userId);
      const insertStmt = db.prepare(`
        INSERT INTO habits (user_id, title, info, level_id, is_custom)
        VALUES (?, ?, ?, 0, 1)
      `);
      for (const item of taskArray) {
        const title = typeof item === 'string' ? item : (item && (item.text || item.title));
        const info = (item && item.info) ? item.info : null;
        if (title) insertStmt.run(userId, String(title).trim(), info);
      }
    } else if (stateKey && stateKey.startsWith('tasks_lvl_')) {
      const levelId = parseInt(stateKey.replace('tasks_lvl_', ''), 10) || 1;
      db.prepare('DELETE FROM habits WHERE user_id = ? AND is_custom = 0 AND level_id = ?').run(userId, levelId);
      const insertStmt = db.prepare(`
        INSERT INTO habits (user_id, title, info, level_id, is_custom)
        VALUES (?, ?, ?, ?, 0)
      `);
      for (const item of taskArray) {
        const title = typeof item === 'string' ? item : (item && (item.text || item.title));
        const info = (item && item.info) ? item.info : null;
        if (title) insertStmt.run(userId, String(title).trim(), info, levelId);
      }
    }
  } catch (err) {
    console.warn('Warning syncing habits table:', err.message);
  }
}

// Backfill relational `habits` table from any existing `user_task_states` rows on startup
try {
  const existingTaskStates = db.prepare(`
    SELECT user_id, state_key, state_value
    FROM user_task_states
    WHERE state_key = 'custom_tasks' OR state_key LIKE 'tasks_lvl_%'
  `).all();
  for (const row of existingTaskStates) {
    try {
      const parsed = JSON.parse(row.state_value);
      if (Array.isArray(parsed)) {
        syncUserHabitsTable(row.user_id, row.state_key, parsed);
      }
    } catch (e) {}
  }
} catch (e) {}

// Helper: Normalize any date string (ISO YYYY-MM-DD or toDateString) into standard toDateString
function normalizeDateStr(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  const d = str.includes('-') && str.length === 10
    ? new Date(str + 'T12:00:00')
    : new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toDateString();
  }
  return str;
}

function countTruthyCheckEntries(val) {
  if (!val) return 0;
  try {
    const obj = typeof val === 'string' ? JSON.parse(val) : val;
    if (!obj || typeof obj !== 'object') return 0;
    return Object.values(obj).filter(Boolean).length;
  } catch (e) {
    return 0;
  }
}

// Compute the effective completed habit count for a user on a given date from `user_task_states`
function getDerivedCheckCountForDate(userId, targetDateStr) {
  const normDate = normalizeDateStr(targetDateStr);
  if (!userId || !normDate) return 0;

  const rows = db.prepare(`
    SELECT state_key, state_value
    FROM user_task_states
    WHERE user_id = ? AND state_key LIKE ?
  `).all(userId, `%_${normDate}`);

  if (!rows || rows.length === 0) return 0;

  const map = {};
  for (const r of rows) {
    try {
      map[r.state_key] = JSON.parse(r.state_value);
    } catch (e) {
      map[r.state_key] = r.state_value;
    }
  }

  let committedCount = 0;
  const commitObj = map[`commitment_${normDate}`];
  if (commitObj && commitObj.listId) {
    if (commitObj.listId === 'custom') {
      committedCount = countTruthyCheckEntries(map[`custom_checks_${normDate}`]);
    } else {
      const lvlId = String(commitObj.listId).replace('lvl_', '');
      committedCount = Math.max(
        countTruthyCheckEntries(map[`checks_${lvlId}_${normDate}`]),
        countTruthyCheckEntries(map[`checks_lvl_${lvlId}_${normDate}`])
      );
    }
  }

  let maxListCount = countTruthyCheckEntries(map[`custom_checks_${normDate}`]);
  for (let lvl = 1; lvl <= 5; lvl++) {
    const c1 = countTruthyCheckEntries(map[`checks_${lvl}_${normDate}`]);
    const c2 = countTruthyCheckEntries(map[`checks_lvl_${lvl}_${normDate}`]);
    if (c1 > maxListCount) maxListCount = c1;
    if (c2 > maxListCount) maxListCount = c2;
  }

  const lockObj = map[`claim_lock_${normDate}`];
  if (lockObj && typeof lockObj === 'object') {
    for (const listLocks of Object.values(lockObj)) {
      const c = countTruthyCheckEntries(listLocks);
      if (c > maxListCount) maxListCount = c;
    }
  }

  return committedCount > 0 ? committedCount : maxListCount;
}

// Reconcile all historical and current checkmarks in `user_task_states` into `daily_logs`
function reconcileUserCalendarFromTaskStates(userId) {
  if (!userId) return;
  try {
    const rows = db.prepare('SELECT state_key FROM user_task_states WHERE user_id = ?').all(userId);
    const dates = new Set();
    for (const r of rows) {
      const m = String(r.state_key).match(/^(?:checks_(?:lvl_)?\d+|custom_checks|claim_lock|commitment)_(.+)$/);
      if (m && m[1]) {
        const norm = normalizeDateStr(m[1]);
        if (norm) dates.add(norm);
      }
    }

    for (const dateStr of dates) {
      const derivedCount = getDerivedCheckCountForDate(userId, dateStr);
      if (derivedCount <= 0) continue;

      const existing = db.prepare('SELECT completed_count, total_count, status FROM daily_logs WHERE user_id = ? AND date_str = ?').get(userId, dateStr);
      // Do not overwrite an explicit admin "incomplete" override unless derivedCount > 0 and no row exists
      if (!existing || (existing.status !== 'incomplete' && (existing.completed_count || 0) < derivedCount)) {
        const total = existing && existing.total_count ? Math.max(existing.total_count, derivedCount) : Math.max(5, derivedCount);
        const status = derivedCount >= 5 ? 'completed' : 'in_progress';
        db.prepare(`
          INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, date_str) DO UPDATE SET
            completed_count = excluded.completed_count,
            total_count = excluded.total_count,
            status = excluded.status
        `).run(userId, dateStr, derivedCount, total, status);
      }
    }
  } catch (err) {
    console.warn('Warning reconciling calendar from task states:', err.message);
  }
}

// Check if a dateStr is valid "today" (accounting for Asia/Manila & client timezones) or a valid checkmark reconciliation
function isAllowedUserCalendarSave(userId, dateStr, normalizedDate, count) {
  const tz = process.env.TIMEZONE || process.env.TZ || 'Asia/Manila';
  const manilaTodayStr = new Date(new Date().toLocaleString('en-US', { timeZone: tz })).toDateString();
  const utcTodayStr = new Date().toDateString();

  if (
    dateStr === utcTodayStr ||
    normalizedDate === utcTodayStr ||
    dateStr === manilaTodayStr ||
    normalizedDate === manilaTodayStr
  ) {
    return true;
  }

  // Allow within +/- 36 hours of current time to support all local client timezones around midnight
  const parsed = new Date(normalizedDate);
  if (!isNaN(parsed.getTime())) {
    const diffHours = Math.abs(Date.now() - parsed.getTime()) / (1000 * 60 * 60);
    if (diffHours <= 36) return true;
  }

  // Also allow backfilling a past date when syncing positive completed checkmarks that aren't admin-locked
  const numCount = parseInt(count, 10) || 0;
  if (numCount > 0) {
    const derived = getDerivedCheckCountForDate(userId, normalizedDate);
    if (derived > 0) return true;
    const existing = db.prepare('SELECT status FROM daily_logs WHERE user_id = ? AND date_str = ?').get(userId, normalizedDate);
    if (!existing) return true;
  }

  return false;
}

// Reconcile any existing task states into `daily_logs` on startup
try {
  const allUsers = db.prepare('SELECT id FROM users').all();
  for (const u of allUsers) {
    reconcileUserCalendarFromTaskStates(u.id);
  }
} catch (e) {}

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

  // Automatically mirror custom_tasks and tasks_lvl_* into the relational `habits` table
  if (stateKey === 'custom_tasks' || String(stateKey).startsWith('tasks_lvl_')) {
    syncUserHabitsTable(userId, stateKey, stateValue);
  }

  // Automatically keep `daily_logs` synchronized whenever checkmarks or commitments are saved
  const dateMatch = String(stateKey).match(/^(?:checks_(?:lvl_)?\d+|custom_checks|claim_lock|commitment)_(.+)$/);
  if (dateMatch && dateMatch[1]) {
    const normDate = normalizeDateStr(dateMatch[1]);
    if (normDate) {
      const derivedCount = getDerivedCheckCountForDate(userId, normDate);
      const status = derivedCount >= 5 ? 'completed' : (derivedCount > 0 ? 'in_progress' : 'empty');
      if (derivedCount <= 0) {
        db.prepare("DELETE FROM daily_logs WHERE user_id = ? AND date_str = ? AND status != 'incomplete'").run(userId, normDate);
      } else {
        db.prepare(`
          INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, date_str) DO UPDATE SET
            completed_count = excluded.completed_count,
            status = excluded.status
        `).run(userId, normDate, derivedCount, Math.max(5, derivedCount), status);
      }
    }
  }

  return res.json({ success: true });
});

app.get('/api/user/state/get/:userId/:stateKey', (req, res) => {
  const row = db.prepare('SELECT state_value FROM user_task_states WHERE user_id = ? AND state_key = ?').get(req.params.userId, req.params.stateKey);
  return res.json({ success: true, stateValue: row ? JSON.parse(row.state_value) : null });
});


// --- Calendar & Full State Persistence Across Browsers ---

// 1. Set Calendar Day count (read-only for non-admins except today's checklist; admins can modify any date)
app.post('/api/user/calendar/set-day', (req, res) => {
  const { userId, dateStr, count } = req.body;
  if (!userId || !dateStr) return res.status(400).json({ error: 'Missing userId or dateStr' });

  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  const isAdmin = verifyAdmin(adminId);

  const normalizedDate = normalizeDateStr(dateStr);
  const isAllowedDate = isAllowedUserCalendarSave(userId, dateStr, normalizedDate, count);

  // Frontend and backend guard: non-admins cannot modify arbitrary past or future calendar dates
  if (!isAdmin && !isAllowedDate) {
    return res.status(403).json({ error: 'Only admins can modify calendar dates.' });
  }

  let completedCount = parseInt(count, 10) || 0;
  // Never wipe a day's log to 0 if the user still has positive saved checkmarks for that date
  if (!isAdmin && completedCount <= 0) {
    const derived = getDerivedCheckCountForDate(userId, normalizedDate);
    if (derived > 0) {
      completedCount = derived;
    }
  }

  const status = completedCount >= 5 ? 'completed' : (completedCount > 0 ? 'in_progress' : 'empty');

  if (completedCount <= 0) {
    db.prepare('DELETE FROM daily_logs WHERE user_id = ? AND date_str = ?').run(userId, normalizedDate);
  } else {
    db.prepare(`
INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
      VALUES (?, ?, ?, 5, ?)
      ON CONFLICT(user_id, date_str) DO UPDATE SET
        completed_count = excluded.completed_count,
        status = excluded.status
    `).run(userId, normalizedDate, completedCount, status);
  }

  // Recalculate streak from continuous completed days
  const user = db.prepare('SELECT id, coins, streak, streak_freezes, piggybank_coins FROM users WHERE id = ?').get(userId);

  return res.json({
    success: true,
    userId,
    dateStr: normalizedDate,
    completedCount,
    status
  });
});

// 2. Get User's Entire Calendar History
app.get('/api/user/calendar/:userId', (req, res) => {
  const userId = req.params.userId;
  reconcileUserCalendarFromTaskStates(userId);
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

  reconcileUserCalendarFromTaskStates(userId);

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

  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  const isAdmin = verifyAdmin(adminId);

  const normalizedDate = normalizeDateStr(dateStr);
  const isAllowedDate = isAllowedUserCalendarSave(userId, dateStr, normalizedDate, completedCount);

  if (!isAdmin && !isAllowedDate) {
    return res.status(403).json({ error: 'Only admins can modify calendar dates.' });
  }

  const count = parseInt(completedCount, 10) || 0;
  const total = parseInt(totalCount, 10) || 0;
  const status = count >= 5 ? 'completed' : (count > 0 ? 'in_progress' : 'empty');

  if (count <= 0) {
    db.prepare('DELETE FROM daily_logs WHERE user_id = ? AND date_str = ?').run(userId, normalizedDate);
  } else {
    db.prepare(`
INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date_str) DO UPDATE SET
        completed_count = excluded.completed_count,
        total_count = excluded.total_count,
        status = excluded.status
    `).run(userId, normalizedDate, count, total, status);
  }

  let user = db.prepare('SELECT id, coins, piggybank_coins, streak, streak_freezes FROM users WHERE id = ?').get(userId);

  return res.json({
    success: true,
    user,
    dateStr: normalizedDate,
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
  const todayIso = new Date().toISOString().split('T')[0];
  const todayDateStr = new Date().toDateString();
  const enrichedUsers = users.map(u => {
    const todayLog = db.prepare('SELECT completed_count, total_count, status FROM daily_logs WHERE user_id = ? AND (date_str = ? OR date_str = ?)').get(u.id, todayIso, todayDateStr);
    return {
      ...u,
      todayCompleted: todayLog ? todayLog.completed_count : 0,
      todayTotal: todayLog ? todayLog.total_count : 0,
      todayStatus: todayLog ? todayLog.status : 'no_activity'
    };
  });

  return res.json({ success: true, users: enrichedUsers });
});

// Inspect a specific user's habit to-do list and logs (password masked by default; requires admin re-auth to view)
app.get('/api/admin/user-details/:targetUserId', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const targetUser = db.prepare('SELECT id, name, username, email, role, committed, coins, streak, streak_freezes, task_mode, facebook_id, facebook_name, core_verifier, created_at FROM users WHERE id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  // Get daily logs
  const dailyLogs = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? ORDER BY id DESC LIMIT 15').all(targetId);
  
  // Get accountability posts
  const accountabilityLogs = db.prepare('SELECT * FROM accountability_posts WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(targetId);

  // Get user task states (isolated tasks, custom tasks, checks)
  const taskStates = db.prepare('SELECT state_key, state_value, updated_at FROM user_task_states WHERE user_id = ?').all(targetId);

  return res.json({
    success: true,
    user: {
      ...targetUser,
      password: '••••••••'
    },
    dailyLogs,
    accountabilityLogs,
    taskStates
  });
});

// ============================================================================
// ADMIN: Password Change Requests Management
// ============================================================================

// 1. Get all pending password change requests (Admin only)
app.get('/api/admin/password-requests', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const requests = db.prepare(`
    SELECT 
      p.id, 
      p.ticket_number, 
      p.user_id, 
      p.username, 
      p.account_creation_date, 
      p.last_password, 
      p.new_password, 
      p.core_verifier AS submitted_core_verifier,
      u.core_verifier AS stored_core_verifier,
      u.email AS user_email,
      u.created_at AS actual_creation_date,
      p.status, 
      p.fb_post_id,
      p.resolved_at,
      p.created_at
    FROM password_change_requests p
    LEFT JOIN users u ON u.id = p.user_id OR LOWER(u.username) = LOWER(p.username)
    WHERE p.status = 'pending'
    ORDER BY p.id DESC
  `).all();

  return res.json({ success: true, requests });
});

// 2. Approve a password change request (Admin only)
app.post('/api/admin/password-requests/:id/approve', async (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const requestId = req.params.id;
  const request = db.prepare('SELECT * FROM password_change_requests WHERE id = ?').get(requestId);
  if (!request) {
    return res.status(404).json({ error: 'Password change request not found.' });
  }
  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Request has already been ${request.status}.` });
  }

  // Update target user's password in users table (plaintext per security note)
  if (request.user_id) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(request.new_password, request.user_id);
  } else {
    db.prepare('UPDATE users SET password = ? WHERE LOWER(username) = LOWER(?)').run(request.new_password, request.username);
  }

  // Update request status to 'approved' and save resolved timestamp
  db.prepare(`UPDATE password_change_requests SET status = 'approved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?`).run(requestId);

  console.log(`👑 Admin #${adminId} approved password change request #${requestId} (Ticket: ${request.ticket_number}) for @${request.username}`);

  // Broadcast announcement to Habitism Facebook Page (Ticket Number & Status only to protect user privacy)
  const ticketDisplay = request.ticket_number || `REQ-${requestId}`;
  const fbMessage = `🌸 Habitism Account Recovery Update 🌸\n\nDear Habitism Community,\n\nA password recovery request has been reviewed and APPROVED by our admin team! 🎉\n\n🎫 Ticket Number: ${ticketDisplay}\n✅ Status: Approved\n📅 Processed: ${new Date().toLocaleString()}\n\nIf this is your ticket, your new password is now active and you can safely log in to your Habitism dashboard. Welcome back to your habit journey! 🚀\n\n#Habitism #AccountRecovery #HabitCommunity`;

  let fbPostId = null;
  let fbNotice = null;
  try {
    const fbResult = await publishToFacebookPage(fbMessage);
    if (fbResult && fbResult.postId) {
      fbPostId = fbResult.postId;
      db.prepare('UPDATE password_change_requests SET fb_post_id = ? WHERE id = ?').run(fbPostId, requestId);
      fbNotice = `Announced on Habitism Facebook Page (Post ID: ${fbPostId})`;

      try {
        db.prepare(`
          INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, fb_page_id, fb_post_id, post_id, response_payload)
          VALUES (?, ?, ?, ?, 'success', ?, ?, ?, ?)
        `).run(
          request.user_id || 0,
          request.username,
          new Date().toISOString().split('T')[0],
          fbMessage,
          FB_CONFIG.pageId,
          fbPostId,
          fbPostId,
          JSON.stringify(fbResult.data || {})
        );
      } catch (e) {
        console.warn('Logging FB recovery post to accountability_posts failed:', e.message);
      }
    } else {
      fbNotice = fbResult && fbResult.error ? `FB Error: ${fbResult.error}` : 'Facebook post not created';
    }
  } catch (fbErr) {
    console.error('Facebook posting error during request approval:', fbErr.message);
    fbNotice = `FB Exception: ${fbErr.message}`;
  }

  return res.json({
    success: true,
    message: `Password change request approved. Password for @${request.username} has been updated.`,
    requestId: request.id,
    ticketNumber: request.ticket_number,
    targetUsername: request.username,
    fbPostId,
    fbNotice
  });
});

// 3. Reject a password change request (Admin only)
app.post('/api/admin/password-requests/:id/reject', async (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const requestId = req.params.id;
  const request = db.prepare('SELECT * FROM password_change_requests WHERE id = ?').get(requestId);
  if (!request) {
    return res.status(404).json({ error: 'Password change request not found.' });
  }
  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Request has already been ${request.status}.` });
  }

  // Update request status to 'rejected' and save resolved timestamp
  db.prepare(`UPDATE password_change_requests SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP WHERE id = ?`).run(requestId);

  console.log(`👑 Admin #${adminId} rejected password change request #${requestId} (Ticket: ${request.ticket_number}) for @${request.username}`);

  // Broadcast announcement to Habitism Facebook Page (Ticket Number & Status only to protect user privacy)
  const ticketDisplay = request.ticket_number || `REQ-${requestId}`;
  const fbMessage = `🌸 Habitism Account Recovery Update 🌸\n\nDear Habitism Community,\n\nA password recovery request has been reviewed and REJECTED by our admin team.\n\n🎫 Ticket Number: ${ticketDisplay}\n❌ Status: Rejected\n📅 Processed: ${new Date().toLocaleString()}\n\nIf this is your ticket, the submitted verification details could not be validated. If you believe this is in error, please submit a new request with your verified information or reach out to our team.\n\n#Habitism #AccountRecovery #HabitCommunity`;

  let fbPostId = null;
  let fbNotice = null;
  try {
    const fbResult = await publishToFacebookPage(fbMessage);
    if (fbResult && fbResult.postId) {
      fbPostId = fbResult.postId;
      db.prepare('UPDATE password_change_requests SET fb_post_id = ? WHERE id = ?').run(fbPostId, requestId);
      fbNotice = `Announced on Habitism Facebook Page (Post ID: ${fbPostId})`;

      try {
        db.prepare(`
          INSERT INTO accountability_posts (user_id, user_name, date_str, message, status, fb_page_id, fb_post_id, post_id, response_payload)
          VALUES (?, ?, ?, ?, 'success', ?, ?, ?, ?)
        `).run(
          request.user_id || 0,
          request.username,
          new Date().toISOString().split('T')[0],
          fbMessage,
          FB_CONFIG.pageId,
          fbPostId,
          fbPostId,
          JSON.stringify(fbResult.data || {})
        );
      } catch (e) {
        console.warn('Logging FB recovery post to accountability_posts failed:', e.message);
      }
    } else {
      fbNotice = fbResult && fbResult.error ? `FB Error: ${fbResult.error}` : 'Facebook post not created';
    }
  } catch (fbErr) {
    console.error('Facebook posting error during request rejection:', fbErr.message);
    fbNotice = `FB Exception: ${fbErr.message}`;
  }

  return res.json({
    success: true,
    message: `Password change request for @${request.username} has been rejected.`,
    requestId: request.id,
    ticketNumber: request.ticket_number,
    targetUsername: request.username,
    fbPostId,
    fbNotice
  });
});

// ============================================================================
// ADMIN: User Feedback Management (Admin only)
// ============================================================================

// 1. Get all feedback submissions (Admin only)
app.get('/api/admin/feedback', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  try {
    const feedbackList = db.prepare(`
      SELECT f.id, f.user_id, f.name, f.email, f.type, f.message, f.status, f.created_at,
             u.username, u.username as account_username,
             u.email as user_account_email, u.email as account_email
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.id DESC
    `).all();

    return res.json({ success: true, feedback: feedbackList });
  } catch (err) {
    console.error('Error fetching admin feedback:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve feedback.' });
  }
});

// 2. Update feedback status (Admin only)
app.post('/api/admin/feedback/:id/status', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const feedbackId = req.params.id;
  const { status } = req.body || {};

  const validStatuses = ['new', 'read', 'resolved'];
  const normStatus = (status || '').toLowerCase().trim();
  if (!validStatuses.includes(normStatus)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const feedback = db.prepare('SELECT id FROM feedback WHERE id = ?').get(feedbackId);
  if (!feedback) {
    return res.status(404).json({ error: 'Feedback record not found.' });
  }

  db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(normStatus, feedbackId);
  console.log(`💬 Admin #${adminId} updated feedback #${feedbackId} status to "${normStatus}"`);

  return res.json({
    success: true,
    message: `Feedback status updated to ${normStatus}.`,
    id: Number(feedbackId),
    status: normStatus
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
// ADMIN: View User Stored Password with Admin Re-Authentication
// ============================================================================
const adminReauthSessions = new Map(); // adminId -> { token: string, expiresAt: number }

function handleAdminViewPassword(req, res) {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  const targetUserId = req.params.targetUserId || req.params.userId;
  const { adminPassword, reauthToken } = req.body || {};

  // 1. Verify requester has admin role
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const numAdminId = Number(adminId);
  const adminUser = db.prepare('SELECT id, password, role FROM users WHERE id = ?').get(numAdminId);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  // 2. Validate Re-Authentication:
  // Check either short session cache token OR verify admin's own password against DB
  let isAuthenticated = false;
  const now = Date.now();

  if (reauthToken && adminReauthSessions.has(numAdminId)) {
    const session = adminReauthSessions.get(numAdminId);
    if (session && session.token === reauthToken && session.expiresAt > now) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    if (!adminPassword || typeof adminPassword !== 'string' || adminPassword !== adminUser.password) {
      return res.status(403).json({ error: 'Incorrect admin password. Access denied.' });
    }
    isAuthenticated = true;
  }

  // 3. Look up target user
  const targetUser = db.prepare('SELECT id, username, email, password FROM users WHERE id = ?').get(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // 4. Issue/refresh short 5-minute session token for cache
  const token = crypto.randomBytes(24).toString('hex');
  const expiresIn = 300; // 5 minutes (in seconds)
  adminReauthSessions.set(numAdminId, {
    token,
    expiresAt: now + (expiresIn * 1000)
  });

  // Security: Never log plaintext passwords to console
  console.log(`🔐 Admin #${numAdminId} verified identity to view stored password for user #${targetUser.id} (@${targetUser.username})`);

  return res.json({
    success: true,
    password: targetUser.password || '',
    targetUserId: targetUser.id,
    username: targetUser.username,
    reauthToken: token,
    expiresIn
  });
}

app.post('/api/admin/users/:targetUserId/view-password', handleAdminViewPassword);
app.post('/api/admin/users/:userId/view-password', handleAdminViewPassword);

// ============================================================================
// ADMIN: Standalone Re-Authentication Endpoint (5-Minute Session Token)
// ============================================================================
app.post('/api/admin/reauth', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
    const { adminPassword } = req.body || {};

    if (!verifyAdmin(adminId)) {
      return res.status(403).json({
        error: 'Please log in as an administrator to view this page.'
      });
    }

    const numAdminId = Number(adminId);
    const adminUser = db.prepare('SELECT id, username, password, role FROM users WHERE id = ?').get(numAdminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({
        error: 'Please log in as an administrator to view this page.'
      });
    }

    if (!adminPassword || typeof adminPassword !== 'string' || adminPassword !== adminUser.password) {
      return res.status(403).json({
        error: 'Incorrect admin password. Please double-check your password and try again.'
      });
    }

    const now = Date.now();
    const expiresIn = 300; // 5 minutes (300 seconds)
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = now + (expiresIn * 1000);

    adminReauthSessions.set(numAdminId, { token, expiresAt });

    return res.json({
      success: true,
      reauthToken: token,
      expiresIn,
      expiresAt,
      message: 'Identity confirmed! Your admin session is active for 5 minutes.'
    });
  } catch (err) {
    if (err.message && (err.message.includes('SQLITE_BUSY') || err.message.includes('locked'))) {
      return res.status(503).json({
        error: 'The database is busy right now. Please try again in a few seconds.'
      });
    }
    return res.status(500).json({ error: 'Unable to verify admin session right now. Please try again.' });
  }
});

// ============================================================================
// ADMIN: Live Database Viewer API (7 Allowlisted Tables + CSV Export)
// ============================================================================
const LIVE_DATABASE_TABLES = {
  users: {
    table: 'users',
    label: 'users',
    columns: ['id', 'username', 'email', 'coins', 'streak', 'streak_freezes', 'role', 'created_at'],
    orderBy: 'id ASC'
  },
  daily_logs: {
    table: 'daily_logs',
    label: 'daily logs',
    columns: ['user_id', 'date_str', 'completed_count', 'total_count', 'status'],
    orderBy: 'id DESC'
  },
  habits: {
    table: 'habits',
    label: 'habits',
    columns: ['user_id', 'title', 'level_id', 'is_custom'],
    orderBy: 'id DESC'
  },
  user_task_states: {
    table: 'user_task_states',
    label: 'task states',
    columns: ['user_id', 'state_key', 'state_value'],
    orderBy: 'user_id ASC, state_key ASC'
  },
  accountability_posts: {
    table: 'accountability_posts',
    label: 'accountability posts',
    columns: ['user_id', 'user_name', 'message', 'status', 'created_at'],
    orderBy: 'id DESC'
  },
  password_change_requests: {
    table: 'password_change_requests',
    label: 'password change requests',
    columns: ['user_id', 'ticket_number', 'status', 'created_at'],
    orderBy: 'id DESC'
  },
  feedback: {
    table: 'feedback',
    label: 'feedback items',
    columns: ['user_id', 'type', 'message', 'status', 'created_at'],
    orderBy: 'id DESC'
  }
};

function verifyAdminDatabaseSession(req, res) {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  const reauthToken = req.headers['x-reauth-token'] || req.query.reauthToken;

  if (!verifyAdmin(adminId)) {
    res.status(403).json({
      error: 'Please log in as an administrator to view this page.'
    });
    return null;
  }

  const numAdminId = Number(adminId);
  const session = adminReauthSessions.get(numAdminId);
  const now = Date.now();

  if (!reauthToken || !session || session.token !== reauthToken || session.expiresAt <= now) {
    res.status(401).json({
      error: 'Your 5-minute security session has expired. Please enter your admin password to continue viewing the live database.',
      requiresReauth: true
    });
    return null;
  }

  return { adminId: numAdminId, session };
}

// 1. GET /api/admin/database/tables/:tableName -> Paginated & filtered rows
app.get('/api/admin/database/tables/:tableName', (req, res) => {
  try {
    const auth = verifyAdminDatabaseSession(req, res);
    if (!auth) return;

    const tableName = (req.params.tableName || '').trim();
    const config = LIVE_DATABASE_TABLES[tableName];

    if (!config) {
      return res.status(400).json({
        error: 'That table is not available in the Live Database Viewer.'
      });
    }

    const search = (req.query.search || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 2000);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const colList = config.columns.join(', ');
    let whereClause = '';
    const params = [];

    if (search) {
      const searchConditions = config.columns.map(col => `CAST(${col} AS TEXT) LIKE ?`);
      whereClause = `WHERE (${searchConditions.join(' OR ')})`;
      config.columns.forEach(() => params.push(`%${search}%`));
    }

    const countRow = db.prepare(`SELECT COUNT(*) AS total FROM ${config.table} ${whereClause}`).get(...params);
    const totalCount = countRow ? countRow.total : 0;

    const querySql = `
      SELECT ${colList}
      FROM ${config.table}
      ${whereClause}
      ORDER BY ${config.orderBy}
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(querySql).all(...params, limit, offset);

    return res.json({
      success: true,
      table: config.table,
      label: config.label,
      columns: config.columns,
      count: rows.length,
      totalCount,
      rows
    });
  } catch (err) {
    if (err.message && (err.message.includes('SQLITE_BUSY') || err.message.includes('locked'))) {
      return res.status(503).json({
        error: 'The database is busy right now. Please try again in a few seconds.'
      });
    }
    console.error('Error querying live database table:', err.message);
    return res.status(500).json({
      error: 'Something went wrong while reading the database table. Please try refreshing.'
    });
  }
});

// 2. GET /api/admin/database/tables/:tableName/export -> CSV Download
app.get('/api/admin/database/tables/:tableName/export', (req, res) => {
  try {
    const auth = verifyAdminDatabaseSession(req, res);
    if (!auth) return;

    const tableName = (req.params.tableName || '').trim();
    const config = LIVE_DATABASE_TABLES[tableName];

    if (!config) {
      return res.status(400).json({
        error: 'That table is not available for CSV export.'
      });
    }

    const search = (req.query.search || '').trim();
    const colList = config.columns.join(', ');
    let whereClause = '';
    const params = [];

    if (search) {
      const searchConditions = config.columns.map(col => `CAST(${col} AS TEXT) LIKE ?`);
      whereClause = `WHERE (${searchConditions.join(' OR ')})`;
      config.columns.forEach(() => params.push(`%${search}%`));
    }

    const rows = db.prepare(`
      SELECT ${colList}
      FROM ${config.table}
      ${whereClause}
      ORDER BY ${config.orderBy}
    `).all(...params);

    const escapeCsvValue = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = config.columns.map(escapeCsvValue).join(',');
    const dataLines = rows.map(row =>
      config.columns.map(col => escapeCsvValue(row[col])).join(',')
    );
    const csvContent = [headerLine, ...dataLines].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="habitism_${config.table}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    if (err.message && (err.message.includes('SQLITE_BUSY') || err.message.includes('locked'))) {
      return res.status(503).json({
        error: 'The database is busy right now. Please try again in a few seconds.'
      });
    }
    console.error('Error exporting CSV:', err.message);
    return res.status(500).json({
      error: 'Could not export the CSV file right now. Please try again in a moment.'
    });
  }
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
// ============================================================================
// ADMIN: Modify Any User's Calendar (Past, Current, or Future Dates)
// Route: POST /api/admin/users/:userId/calendar (and alias :targetUserId)
// ============================================================================
function handleAdminCalendarUpdate(req, res) {
  const adminId = req.headers['x-admin-id'] || req.query.adminId || (req.body && req.body.adminId);
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.userId || req.params.targetUserId;
  let { dateStr, completedCount, totalCount, status, count } = req.body;
  if (!dateStr) {
    return res.status(400).json({ error: 'dateStr is required.' });
  }

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const normalizedDate = normalizeDateStr(dateStr);

  let numCount = parseInt(completedCount !== undefined ? completedCount : count, 10);
  let normStatus = (status || '').toLowerCase().trim();

  if (normStatus === 'completed') {
    if (isNaN(numCount) || numCount <= 0) {
      numCount = 5;
    }
    normStatus = 'completed';
  } else if (normStatus === 'incomplete') {
    if (isNaN(numCount)) numCount = 0;
    normStatus = numCount > 0 ? 'in_progress' : 'incomplete';
  } else {
    if (isNaN(numCount)) numCount = 0;
    normStatus = numCount >= 5 ? 'completed' : (numCount > 0 ? 'in_progress' : 'incomplete');
  }

  let totCount = parseInt(totalCount, 10);
  if (isNaN(totCount) || totCount <= 0) {
    totCount = Math.max(5, numCount);
  }

  db.prepare(`
INSERT INTO daily_logs (user_id, date_str, completed_count, total_count, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date_str) DO UPDATE SET
      completed_count = excluded.completed_count,
      total_count = excluded.total_count,
      status = excluded.status
    `).run(targetId, normalizedDate, numCount, totCount, normStatus);

  return res.json({
    success: true,
    userId: targetId,
    username: user.username,
    dateStr: normalizedDate,
    rawDateStr: dateStr,
    completedCount: numCount,
    totalCount: totCount,
    status: normStatus,
    message: `Calendar updated for ${user.username} on ${normalizedDate} (${numCount}/${totCount} habits, status: ${normStatus}).`
  });
}

app.post('/api/admin/users/:userId/calendar', handleAdminCalendarUpdate);
app.post('/api/admin/users/:targetUserId/calendar', handleAdminCalendarUpdate);

// ============================================================================
// ADMIN: Unlock user's claimed habit checkboxes (removes coin claim padlock)
// ============================================================================
app.post('/api/admin/users/:targetUserId/unlock-checks', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const today = new Date().toISOString().split('T')[0];

  // 1. Reset all historical and current claim locks for this user to empty object
  db.prepare(`
    UPDATE user_task_states
    SET state_value = '{}', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND state_key LIKE 'claim_lock_%'
  `).run(targetId);

  // 2. Explicitly ensure today's claim lock is saved as empty object
  db.prepare(`
    INSERT INTO user_task_states (user_id, state_key, state_value, updated_at)
    VALUES (?, ?, '{}', CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, state_key) DO UPDATE SET
      state_value = '{}',
      updated_at = CURRENT_TIMESTAMP
  `).run(targetId, `claim_lock_${today}`);

  console.log(`👑 Admin ${adminId} removed locked checks for user ${user.username} (ID #${targetId})`);

  return res.json({
    success: true,
    userId: targetId,
    username: user.username,
    message: `Locked checks removed for @${user.username}. All habit checkboxes are now unlocked.`
  });
});

// ============================================================================
// ADMIN: Remove checks on user's checkboxes (resets checklist progress to 0%)
// ============================================================================
app.post('/api/admin/users/:targetUserId/reset-checks', (req, res) => {
  const adminId = req.headers['x-admin-id'] || req.query.adminId;
  if (!verifyAdmin(adminId)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }

  const targetId = req.params.targetUserId;
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const today = new Date().toISOString().split('T')[0];
  const todayDateStr = new Date().toDateString();

  // 1. Reset all existing check states
  db.prepare(`
    UPDATE user_task_states
    SET state_value = '{}', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND (state_key LIKE 'checks_%' OR state_key LIKE 'custom_checks%')
  `).run(targetId);

  // 2. Ensure today's specific level check keys (1-5) and custom check key are explicitly set to '{}'
  for (let lvl = 1; lvl <= 5; lvl++) {
    db.prepare(`
      INSERT INTO user_task_states (user_id, state_key, state_value, updated_at)
      VALUES (?, ?, '{}', CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, state_key) DO UPDATE SET
        state_value = '{}',
        updated_at = CURRENT_TIMESTAMP
    `).run(targetId, `checks_${lvl}_${today}`);
  }

  db.prepare(`
    INSERT INTO user_task_states (user_id, state_key, state_value, updated_at)
    VALUES (?, ?, '{}', CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, state_key) DO UPDATE SET
      state_value = '{}',
      updated_at = CURRENT_TIMESTAMP
  `).run(targetId, `custom_checks_${today}`);

  // 3. Reset lock states as well
  db.prepare(`
    UPDATE user_task_states
    SET state_value = '{}', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND state_key LIKE 'claim_lock_%'
  `).run(targetId);

  db.prepare(`
    INSERT INTO user_task_states (user_id, state_key, state_value, updated_at)
    VALUES (?, ?, '{}', CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, state_key) DO UPDATE SET
      state_value = '{}',
      updated_at = CURRENT_TIMESTAMP
  `).run(targetId, `claim_lock_${today}`);

  // 4. Reset today's calendar completion in daily_logs
  db.prepare(`
    UPDATE daily_logs
    SET completed_count = 0, status = 'empty'
    WHERE user_id = ? AND (date_str = ? OR date_str = ?)
  `).run(targetId, today, todayDateStr);

  console.log(`👑 Admin ${adminId} reset checklist progress for user ${user.username} (ID #${targetId})`);

  return res.json({
    success: true,
    userId: targetId,
    username: user.username,
    message: `Checklist progress reset for @${user.username}. All habit checkboxes cleared and unlocked.`
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
    const fbResult = await publishToFacebookPage(message);
    const isSuccess = fbResult.success;
    const postId = fbResult.postId;
    const data = fbResult.data || {};

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
        postId || 'test_' + Date.now(),
        postId || null,
        JSON.stringify(data)
      );
    } catch (dbErr) {
      console.warn('Logging to accountability_posts failed:', dbErr.message);
    }

    if (!isSuccess) {
      return res.status(400).json({
        error: fbResult.error || 'Facebook Graph API failed',
        status: 'error',
        postId: null,
        details: data
      });
    }

    return res.json({
      success: true,
      status: 'published',
      postId: postId,
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

module.exports = app;

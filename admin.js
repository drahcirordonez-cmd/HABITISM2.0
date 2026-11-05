/**
 * HABITISM - Administrator Portal Logic
 * Scoped administrative control for user inspections, password management, and Graph API monitoring.
 */

let allUsers = [];
let targetResetUserId = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

function initAdminDashboard() {
  // Enforce Administrator-only access
  const adminUser = Habitism.requireAuth(false, true);
  if (!adminUser) return;

  // Render admin identity badge
  const adminNameEl = document.getElementById('adminCurrentName');
  if (adminNameEl) {
    adminNameEl.innerText = `${adminUser.name || adminUser.username} (@${adminUser.username || 'admin'})`;
  }

  loadAdminData();
  loadPasswordRequests();
  loadFeedback();
  loadAccountabilityFeed();
  updateReauthSessionIndicator();

  // Attach search listeners
  const searchInput = document.getElementById('userSearchInput');
  const roleFilter = document.getElementById('userRoleFilter');

  if (searchInput) {
    searchInput.addEventListener('input', () => filterAndRenderUsers());
  }
  if (roleFilter) {
    roleFilter.addEventListener('change', () => filterAndRenderUsers());
  }
}

async function loadAdminData() {
  try {
    const res = await Habitism.adminGetUsers();
    if (!res.success) throw new Error(res.error || 'Failed to load users');

    allUsers = res.users || [];
    updateMetrics(allUsers);
    filterAndRenderUsers();

    const banner = document.getElementById('adminConnectionBanner');
    if (banner) {
      banner.style.display = res.isOffline ? 'flex' : 'none';
    }
  } catch (err) {
    console.error('Error fetching admin users:', err);
    const banner = document.getElementById('adminConnectionBanner');
    if (banner) {
      banner.style.display = 'flex';
    }
  }
}

function updateMetrics(users) {
  const totalUsersEl = document.getElementById('metricTotalUsers');
  const totalStreaksEl = document.getElementById('metricTotalStreaks');
  const totalCoinsEl = document.getElementById('metricTotalCoins');

  if (totalUsersEl) totalUsersEl.innerText = users.length;

  const totalStreaks = users.reduce((acc, u) => acc + (u.streak || 0), 0);
  if (totalStreaksEl) totalStreaksEl.innerText = totalStreaks;

  const totalCoins = users.reduce((acc, u) => acc + (u.coins || 0), 0);
  if (totalCoinsEl) totalCoinsEl.innerText = totalCoins.toLocaleString();
}

function filterAndRenderUsers() {
  const query = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const role = document.getElementById('userRoleFilter')?.value || 'all';

  const filtered = allUsers.filter(u => {
    const matchQuery = 
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query));
    
    const matchRole = (role === 'all') || (u.role === role);
    return matchQuery && matchRole;
  });

  renderUsersTable(filtered);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748b;">
          No matching users found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const initial = (u.name || u.username || 'U').charAt(0).toUpperCase();
    const isOnlineAdmin = u.role === 'admin';
    const isCommitted = u.committed === 1;

    let todayStatusBadge = '<span class="status-pill"><span class="status-dot none"></span> No data</span>';
    if (u.todayStatus === 'completed') {
      todayStatusBadge = `<span class="status-pill" style="color: #34d399;"><span class="status-dot completed"></span> Finished (${u.todayCompleted}/${u.todayTotal})</span>`;
    } else if (u.todayStatus === 'in_progress') {
      todayStatusBadge = `<span class="status-pill" style="color: #fbbf24;"><span class="status-dot in_progress"></span> ${u.todayCompleted}/${u.todayTotal} habits</span>`;
    }

    const fbStatus = u.facebook_id 
      ? `<span style="color: #38bdf8; font-size: 0.82rem; font-weight: 600;">Linked (${u.facebook_name || 'Active'})</span>`
      : `<span style="color: #64748b; font-size: 0.82rem;">Not Linked</span>`;

    return `
      <tr>
        <td style="color: #64748b; font-weight: 600;">#${u.id}</td>
        <td>
          <div class="user-identity">
            <div class="user-avatar">${initial}</div>
            <div>
              <div class="user-name">
                <span>${escapeHtml(u.name || u.username)}</span>
                ${isCommitted ? '<span title="Committed to rules" style="color: #38bdf8; font-size: 0.75rem;">🛡️</span>' : ''}
              </div>
              <div class="user-username">@${escapeHtml(u.username || 'unknown')} &bull; ${escapeHtml(u.email || '')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-role ${u.role === 'admin' ? 'admin' : 'user'}">
            ${u.role === 'admin' ? '👑 Admin' : '👤 User'}
          </span>
        </td>
        <td>
          <div style="font-weight: 700; color: #f59e0b; display: flex; align-items: center; gap: 4px;">
            <span>🔥 ${u.streak || 0}d</span>
            <span style="font-size: 0.75rem; color: #38bdf8; font-weight: 500;">(❄️ ${u.streak_freezes || 0})</span>
          </div>
        </td>
        <td>
          <span style="color: #fbbf24; font-weight: 700;">🪙 ${u.coins || 0}</span>
        </td>
        <td>
          ${todayStatusBadge}
        </td>
        <td>
          ${fbStatus}
        </td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="inspectUser(${u.id})">
              📋 Inspect To-Do
            </button>
            <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="promptAdminPasswordForUser(${u.id}, '${escapeHtml(u.username || u.name)}')" title="Authenticate with admin password to view user credentials">
              👁️ View Password
            </button>
            <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="openPasswordReset(${u.id}, '${escapeHtml(u.username)}')">
              🔑 Reset PW
            </button>
            ${u.role !== 'admin' ? `
              <button type="button" class="admin-btn admin-btn-danger" style="padding: 5px 10px; font-size: 0.78rem;" onclick="deleteUser(${u.id}, '${escapeHtml(u.username)}')">
                🗑️
              </button>
            ` : ''}
          <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="adminUnlockChecks(${u.id}, '${escapeHtml(u.username)}')" title="Unlock checkboxes locked by piggybank claim">🔓 Unlock</button>
          <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="adminResetChecks(${u.id}, '${escapeHtml(u.username)}')" title="Uncheck all habit checkboxes & reset checklist progress to 0%">🔄 Reset Checks</button>
          <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="quickAdjustFreeze(${u.id})">❄️ Freeze</button>
          <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="quickAdjustCoins(${u.id})">🪙 Coins</button>
          <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="quickAdjustStreak(${u.id})">🔥 Streak</button>
          <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="openAdminCalendarModal(${u.id}, '${escapeHtml(u.username)}')" title="Manage user calendar & habit completion">📅 Calendar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// User Habits & Task Inspection
// ==========================================================================
async function inspectUser(userId) {
  try {
    currentInspectUserId = userId;
    const res = await Habitism.adminGetUserDetails(userId);
    if (!res.success) throw new Error(res.error || 'Failed to inspect user');

    const { user, dailyLogs, accountabilityLogs, taskStates } = res;
    currentInspectUsername = user.username || user.name || String(userId);

    // Set inspection modal headers
    document.getElementById('inspectUserName').innerText = `${user.name || user.username} (@${user.username})`;
    document.getElementById('inspectUserMeta').innerText = `ID #${user.id} &bull; ${user.email} &bull; Streak: ${user.streak}d &bull; Coins: ${user.coins} &bull; Freezes: ${user.streak_freezes}`;

    // Admin Account Verification & Plaintext Credentials Viewing
    const createdAtEl = document.getElementById('inspectUserCreatedAt');
    if (createdAtEl) {
      createdAtEl.innerText = user.created_at || 'Not recorded';
    }
    const passwordEl = document.getElementById('inspectUserPassword');
    const viewBtn = document.getElementById('btnInspectViewPassword');
    if (passwordEl) {
      passwordEl.innerText = '••••••••';
      passwordEl.style.color = '#94a3b8';
    }
    if (viewBtn) {
      viewBtn.innerHTML = '<span>👁️ View Password</span>';
    }

    // Extract isolated state items from database
    const statesMap = {};
    (taskStates || []).forEach(st => {
      try {
        statesMap[st.state_key] = JSON.parse(st.state_value);
      } catch (e) {
        statesMap[st.state_key] = st.state_value;
      }
    });

    // Determine current level and mode
    const activeLevel = statesMap['active_level'] || statesMap['habitism_active_level'] || 1;
    const taskMode = statesMap['task_mode'] || user.task_mode || 'presets';

    document.getElementById('inspectUserMode').innerText = taskMode === 'custom' ? 'Custom Habit Routine' : `Preset Routine (Level ${activeLevel})`;

    // Reconstruct user's tasks
    let taskList = [];
    if (taskMode === 'custom') {
      taskList = statesMap['custom_tasks'] || [
        { id: 1, text: 'Custom Habit 1', icon: '🎯' },
        { id: 2, text: 'Custom Habit 2', icon: '🎯' },
        { id: 3, text: 'Custom Habit 3', icon: '🎯' },
        { id: 4, text: 'Custom Habit 4', icon: '🎯' },
        { id: 5, text: 'Custom Habit 5', icon: '🎯' }
      ];
    } else {
      // Default level tasks
      taskList = statesMap[`tasks_lvl_${activeLevel}`] || getDefaultLevelTasks(activeLevel);
    }

    // Check states & claim locks
    const todayStr = new Date().toISOString().split('T')[0];
    const checks = 
      statesMap[`checks_${activeLevel}_${todayStr}`] ||
      statesMap[`custom_checks_${todayStr}`] ||
      statesMap[`checks_lvl_${activeLevel}`] || 
      statesMap['custom_checks'] || 
      {};

    const lock = statesMap[`claim_lock_${todayStr}`] || {};
    const lockedIdx = (taskMode === 'custom' ? lock['custom'] : lock[String(activeLevel)]) || {};

    const tasksContainer = document.getElementById('inspectTasksContainer');
    tasksContainer.innerHTML = taskList.map((t, idx) => {
      const isChecked = !!checks[t.id !== undefined ? t.id : idx] || !!checks[idx];
      const isLocked = isChecked && !!lockedIdx[idx];
      return `
        <div class="task-inspect-item ${isChecked ? 'done' : ''}">
          <div class="task-inspect-title">
            <span>${isChecked ? '✅' : '⏳'}</span>
            <span>${t.icon || '📌'} ${escapeHtml(t.text || t.name || 'Habit Task')}</span>
          </div>
          <span style="font-size: 0.78rem; font-weight: 700; color: ${isLocked ? '#f59e0b' : (isChecked ? '#34d399' : '#94a3b8')};">
            ${isLocked ? '🔒 Claim Locked' : (isChecked ? 'Completed Today' : 'Pending')}
          </span>
        </div>
      `;
    }).join('');

    // Render Daily History
    const historyContainer = document.getElementById('inspectDailyHistory');
    if (dailyLogs && dailyLogs.length > 0) {
      historyContainer.innerHTML = dailyLogs.map(l => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.84rem;">
          <span style="color: #cbd5e1;">📅 ${l.date_str}</span>
          <span style="color: ${l.completed_count >= 5 ? '#34d399' : '#f59e0b'}; font-weight: 600;">
            ${l.completed_count} / ${l.total_count} (${l.status})
          </span>
        </div>
      `).join('');
    } else {
      historyContainer.innerHTML = '<div style="color: #64748b; font-size: 0.84rem; padding: 6px 0;">No daily log entries recorded yet.</div>';
    }

    document.getElementById('inspectModal').style.display = 'flex';
  } catch (err) {
    alert('Inspection failed: ' + err.message);
  }
}

function closeInspectModal() {
  document.getElementById('inspectModal').style.display = 'none';
}

function getDefaultLevelTasks(level) {
  if (level === 3) {
    return [
      { id: 1, text: "50 Push-ups", icon: "💪" },
      { id: 2, text: "50 Pull-ups", icon: "🏋️" },
      { id: 3, text: "50 Sit-ups", icon: "🔥" },
      { id: 4, text: "30-min Focused Meditation", icon: "🧘" },
      { id: 5, text: "Deep Box Breathing Session", icon: "🌬️" },
      { id: 6, text: "Clean Water Hydration (2.5L)", icon: "💧" }
    ];
  } else if (level === 4) {
    return [
      { id: 1, text: "Morning Fast Walk or Run (20 mins)", icon: "🏃" },
      { id: 2, text: "Zero Social Media First 2 Hours", icon: "📵" },
      { id: 3, text: "Read 15 Pages of Non-Fiction", icon: "📖" },
      { id: 4, text: "Core Strength Routine (Plank & Crunches)", icon: "⚡" },
      { id: 5, text: "Daily Budget & Expense Review", icon: "💰" },
      { id: 6, text: "Full Mindful Body Scan (10 mins)", icon: "🧠" },
      { id: 7, text: "Thought Detachment & Journaling", icon: "✍️" }
    ];
  } else if (level === 5) {
    return [
      { id: 1, text: "High-Intensity Functional Workout", icon: "🏋️‍♂️" },
      { id: 2, text: "Write 3 Top Priorities Before 9 AM", icon: "🎯" },
      { id: 3, text: "90-Minute Uninterrupted Deep Work Sprint", icon: "⏱️" },
      { id: 4, text: "Post-Work Cognitive Reset & Nature Walk", icon: "🌲" },
      { id: 5, text: "Express Gratitude to 1 Person", icon: "💌" },
      { id: 6, text: "Desk Hydration Flask Refill (3 Liters)", icon: "💧" },
      { id: 7, text: "Mute Non-Essential App Notifications", icon: "🔕" },
      { id: 8, text: "Clean Workspace Surface & Reset for Tomorrow", icon: "✨" }
    ];
  }
  return [
    { id: 1, text: "Meditation (15 mins)", icon: "🧘" },
    { id: 2, text: "Push-ups (25 reps)", icon: "💪" },
    { id: 3, text: "Pull-ups (10 reps)", icon: "🏋️" },
    { id: 4, text: "Sit-ups (30 reps)", icon: "🔥" },
    { id: 5, text: "Deep Breathing Routine", icon: "🌬️" }
  ];
}

// ==========================================================================
// Password Reset Modal Logic
// ==========================================================================
function openPasswordReset(userId, username) {
  targetResetUserId = userId;
  document.getElementById('resetTargetUserText').innerText = `@${username} (ID #${userId})`;
  document.getElementById('adminNewPasswordInput').value = '';
  document.getElementById('resetModalMsg').style.display = 'none';
  document.getElementById('adminPasswordModal').style.display = 'flex';
}

function closePasswordResetModal() {
  document.getElementById('adminPasswordModal').style.display = 'none';
  targetResetUserId = null;
}

async function handleAdminPasswordSubmit(e) {
  e.preventDefault();
  if (!targetResetUserId) return;

  const newPassword = document.getElementById('adminNewPasswordInput').value.trim();
  const msgEl = document.getElementById('resetModalMsg');

  if (newPassword.length < 3) {
    msgEl.style.color = '#f87171';
    msgEl.innerText = 'Password must be at least 3 characters.';
    msgEl.style.display = 'block';
    return;
  }

  try {
    const res = await Habitism.adminResetPassword(targetResetUserId, newPassword);
    if (!res.success) throw new Error(res.error || 'Password reset failed');

    msgEl.style.color = '#34d399';
    msgEl.innerText = res.message || 'Password successfully changed!';
    msgEl.style.display = 'block';

    setTimeout(() => {
      closePasswordResetModal();
    }, 1200);
  } catch (err) {
    msgEl.style.color = '#f87171';
    msgEl.innerText = err.message;
    msgEl.style.display = 'block';
  }
}

// ==========================================================================
// Admin Re-Authentication & Password Viewing System
// ==========================================================================
let adminReauthSession = {
  token: null,
  expiresAt: 0
};
let currentPasswordRequestUserId = null;
let currentPasswordRequestUsername = null;
let revealedPasswordValue = null;

function hasValidReauthSession() {
  return adminReauthSession.token && Date.now() < adminReauthSession.expiresAt;
}

function updateReauthSessionIndicator() {
  const lockBtn = document.getElementById('adminReauthLockBtn');
  if (!lockBtn) return;
  if (hasValidReauthSession()) {
    const remainingMins = Math.max(1, Math.ceil((adminReauthSession.expiresAt - Date.now()) / 60000));
    lockBtn.style.display = 'inline-flex';
    lockBtn.innerHTML = `<span>🔓 Verified (${remainingMins}m) &bull; Lock</span>`;
  } else {
    lockBtn.style.display = 'none';
  }
}

function clearAdminReauthSession() {
  adminReauthSession.token = null;
  adminReauthSession.expiresAt = 0;
  updateReauthSessionIndicator();

  // Mask inspect modal password if open
  const inspectPw = document.getElementById('inspectUserPassword');
  if (inspectPw) {
    inspectPw.innerText = '••••••••';
    inspectPw.style.color = '#94a3b8';
  }
  const inspectBtn = document.getElementById('btnInspectViewPassword');
  if (inspectBtn) {
    inspectBtn.innerHTML = '<span>👁️ View Password</span>';
  }
}

async function promptAdminPasswordForUser(userId, username) {
  currentPasswordRequestUserId = userId;
  currentPasswordRequestUsername = username || `User #${userId}`;

  // If already authenticated within session cache (valid for 5 minutes), fetch immediately!
  if (hasValidReauthSession()) {
    try {
      const res = await Habitism.adminViewUserPassword(userId, null, adminReauthSession.token);
      if (res && res.success) {
        onPasswordRevealed(res.password, userId, currentPasswordRequestUsername);
        return;
      }
    } catch (e) {
      // Session expired or invalid, clear and proceed to prompt
      clearAdminReauthSession();
    }
  }

  // Show reauth prompt modal
  const modal = document.getElementById('adminReauthModal');
  const userText = document.getElementById('reauthTargetUserText');
  const input = document.getElementById('adminReauthPasswordInput');
  const errorMsg = document.getElementById('adminReauthErrorMsg');

  if (userText) userText.innerText = `@${currentPasswordRequestUsername}`;
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 60);
  }
  if (errorMsg) {
    errorMsg.style.display = 'none';
    errorMsg.innerText = '';
  }

  if (modal) modal.style.display = 'flex';
}

function closeAdminReauthModal() {
  const modal = document.getElementById('adminReauthModal');
  if (modal) modal.style.display = 'none';
  const input = document.getElementById('adminReauthPasswordInput');
  if (input) input.value = '';
}

async function handleAdminReauthSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('adminReauthPasswordInput');
  const errorMsg = document.getElementById('adminReauthErrorMsg');
  const confirmBtn = document.getElementById('adminReauthConfirmBtn');

  const adminPassword = (input?.value || '').trim();
  if (!adminPassword) return;

  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span>Verifying...</span>';

  try {
    const res = await Habitism.adminViewUserPassword(currentPasswordRequestUserId, adminPassword);
    if (!res.success) throw new Error(res.error || 'Failed to verify admin password.');

    // Save session cache (5 minutes)
    if (res.reauthToken) {
      adminReauthSession = {
        token: res.reauthToken,
        expiresAt: Date.now() + ((res.expiresIn || 300) * 1000)
      };
      updateReauthSessionIndicator();
    }

    closeAdminReauthModal();
    onPasswordRevealed(res.password, currentPasswordRequestUserId, currentPasswordRequestUsername);
  } catch (err) {
    if (errorMsg) {
      errorMsg.style.display = 'block';
      errorMsg.innerText = err.message || 'Incorrect admin password. Access denied.';
    }
    if (input) {
      input.value = '';
      input.focus();
    }
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<span>Confirm</span>';
  }
}

function onPasswordRevealed(password, userId, username) {
  revealedPasswordValue = password;

  // 1. If inspection modal is open for this user, reveal in inspection modal too
  if (currentInspectUserId === userId) {
    const pwEl = document.getElementById('inspectUserPassword');
    if (pwEl) {
      pwEl.innerText = password || '(Empty password)';
      pwEl.style.color = '#34d399';
    }
    const btn = document.getElementById('btnInspectViewPassword');
    if (btn) {
      btn.innerHTML = '<span>🙈 Hide Password</span>';
    }
  }

  // 2. Open revealed password modal
  const modal = document.getElementById('revealedPasswordModal');
  const userText = document.getElementById('revealedTargetUserText');
  const display = document.getElementById('revealedPasswordDisplay');
  const copyNotice = document.getElementById('revealedCopyNotice');

  if (userText) userText.innerText = `@${username}`;
  if (display) display.innerText = password || '(Empty password)';
  if (copyNotice) copyNotice.style.display = 'none';

  if (modal) modal.style.display = 'flex';
}

function handleInspectViewPassword() {
  if (!currentInspectUserId) return;
  const pwEl = document.getElementById('inspectUserPassword');
  const btn = document.getElementById('btnInspectViewPassword');

  // If already revealed, toggle back to masked
  if (pwEl && pwEl.innerText !== '••••••••' && pwEl.innerText !== '--') {
    pwEl.innerText = '••••••••';
    pwEl.style.color = '#94a3b8';
    if (btn) btn.innerHTML = '<span>👁️ View Password</span>';
    return;
  }

  promptAdminPasswordForUser(currentInspectUserId, currentInspectUsername);
}

function closeRevealedPasswordModal() {
  const modal = document.getElementById('revealedPasswordModal');
  if (modal) modal.style.display = 'none';
  revealedPasswordValue = null;
}

async function copyRevealedPassword() {
  if (!revealedPasswordValue) return;
  try {
    await navigator.clipboard.writeText(revealedPasswordValue);
    const notice = document.getElementById('revealedCopyNotice');
    if (notice) {
      notice.style.display = 'block';
      setTimeout(() => { notice.style.display = 'none'; }, 2500);
    }
  } catch (e) {
    alert('Password: ' + revealedPasswordValue);
  }
}

// Check session expiration periodically
setInterval(updateReauthSessionIndicator, 30000);

// ==========================================================================
// Delete User
// ==========================================================================
async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to delete user "${username}" (ID #${userId})?\n\nThis will permanently delete their account, daily habit logs, and records.`)) {
    return;
  }

  try {
    const res = await Habitism.adminDeleteUser(userId);
    if (!res.success) throw new Error(res.error || 'Delete failed');

    alert(`User "${username}" was successfully deleted.`);
    loadAdminData();
  } catch (err) {
    alert('Failed to delete user: ' + err.message);
  }
}

// ==========================================================================
// Quick Adjust: Streak Freeze
// ==========================================================================
async function quickAdjustFreeze(userId) {
  const amount = prompt(`Adjust streak freezes for user #${userId}.\nEnter positive number to ADD, negative to REMOVE (e.g. 1 or -1):`, '0');
  if (amount === null) return;
  const amt = parseInt(amount);
  if (isNaN(amt)) { alert('Invalid number.'); return; }

  try {
    const res = await Habitism.adminStreakFreeze(userId, amt);
    if (res.success) {
      alert(res.message);
      loadAdminData();
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==========================================================================
// Quick Adjust: Coins
// ==========================================================================
async function quickAdjustCoins(userId) {
  const amount = prompt(`Adjust coins for user #${userId}.\nEnter positive number to ADD, negative to REMOVE (e.g. 50 or -20):`, '0');
  if (amount === null) return;
  const amt = parseInt(amount);
  if (isNaN(amt)) { alert('Invalid number.'); return; }

  try {
    const res = await Habitism.adminCoins(userId, amt);
    if (res.success) {
      alert(res.message);
      loadAdminData();
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==========================================================================
// Quick Adjust: Streak
// ==========================================================================
async function quickAdjustStreak(userId) {
  const streak = prompt(`Set streak for user #${userId} (days):`, '0');
  if (streak === null) return;
  const val = parseInt(streak);
  if (isNaN(val)) { alert('Invalid number.'); return; }

  try {
    const res = await Habitism.adminStreak(userId, val);
    if (res.success) {
      alert(res.message);
      loadAdminData();
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==========================================================================
// Admin UI: Calendar Manipulation Modal
// ==========================================================================
function populateAdminCalendarUserSelect(selectedUserId) {
  const select = document.getElementById('adminCalUserSelect');
  if (!select) return;

  const usersList = allUsers && allUsers.length > 0 ? allUsers : [];
  select.innerHTML = '<option value="">-- Select a User --</option>' +
    usersList.map(u => {
      const isSel = String(u.id) === String(selectedUserId);
      const name = escapeHtml(u.name || u.username);
      const uname = escapeHtml(u.username);
      return `<option value="${u.id}" ${isSel ? 'selected' : ''}>#${u.id} - ${name} (@${uname})</option>`;
    }).join('');
}

function openAdminCalendarModal(userId, username) {
  const modal = document.getElementById('adminCalendarModal');
  if (!modal) return;

  populateAdminCalendarUserSelect(userId);

  if (userId) {
    const sel = document.getElementById('adminCalUserSelect');
    if (sel) sel.value = String(userId);
  }

  const dateInput = document.getElementById('adminCalDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  const statusSelect = document.getElementById('adminCalStatus');
  if (statusSelect) statusSelect.value = 'completed';

  const countInput = document.getElementById('adminCalCount');
  if (countInput) countInput.value = '5';

  const msg = document.getElementById('adminCalMsg');
  if (msg) {
    msg.style.display = 'none';
    msg.textContent = '';
  }

  modal.style.display = 'flex';
}

function closeAdminCalendarModal() {
  const modal = document.getElementById('adminCalendarModal');
  if (modal) modal.style.display = 'none';
}

function onAdminCalStatusChange() {
  const status = document.getElementById('adminCalStatus')?.value;
  const countInput = document.getElementById('adminCalCount');
  if (!countInput) return;

  if (status === 'completed') {
    if (parseInt(countInput.value, 10) < 5) {
      countInput.value = '5';
    }
  } else if (status === 'incomplete') {
    if (parseInt(countInput.value, 10) >= 5) {
      countInput.value = '0';
    }
  }
}

async function handleAdminCalendarSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('adminCalUserSelect')?.value;
  const dateStr = document.getElementById('adminCalDate')?.value;
  const status = document.getElementById('adminCalStatus')?.value;
  const count = parseInt(document.getElementById('adminCalCount')?.value, 10) || 0;
  const msg = document.getElementById('adminCalMsg');
  const submitBtn = document.getElementById('adminCalSubmitBtn');

  if (!userId) {
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'rgba(239, 68, 68, 0.2)';
      msg.style.color = '#f87171';
      msg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      msg.textContent = 'Please select a target user.';
    }
    return;
  }

  if (!dateStr) {
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'rgba(239, 68, 68, 0.2)';
      msg.style.color = '#f87171';
      msg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      msg.textContent = 'Please pick a date.';
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    const totalCount = Math.max(5, count);
    const res = await Habitism.adminCalendar(userId, dateStr, count, totalCount, status);
    if (res.success) {
      if (msg) {
        msg.style.display = 'block';
        msg.style.background = 'rgba(34, 197, 94, 0.2)';
        msg.style.color = '#4ade80';
        msg.style.border = '1px solid rgba(34, 197, 94, 0.4)';
        msg.textContent = '✅ ' + (res.message || 'Calendar updated successfully!');
      }

      await loadAdminData();

      // If user inspection modal is open for this user, refresh it
      if (currentInspectUserId && String(currentInspectUserId) === String(userId)) {
        await inspectUser(userId);
      }

      setTimeout(() => {
        closeAdminCalendarModal();
      }, 1200);
    } else {
      if (msg) {
        msg.style.display = 'block';
        msg.style.background = 'rgba(239, 68, 68, 0.2)';
        msg.style.color = '#f87171';
        msg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        msg.textContent = '❌ ' + (res.error || res.message || 'Failed to update calendar.');
      }
    }
  } catch (err) {
    if (msg) {
      msg.style.display = 'block';
      msg.style.background = 'rgba(239, 68, 68, 0.2)';
      msg.style.color = '#f87171';
      msg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      msg.textContent = '❌ Error: ' + err.message;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Calendar Date';
    }
  }
}

// ==========================================================================
// Pending Password Change Requests Management
// ==========================================================================
let allPasswordRequests = [];

async function loadPasswordRequests() {
  const tbody = document.getElementById('passwordRequestsTableBody');
  const badge = document.getElementById('pendingRequestsBadge');
  if (!tbody) return;

  try {
    const res = await Habitism.adminGetPasswordRequests();
    if (!res.success) throw new Error(res.error || 'Failed to load password requests');

    allPasswordRequests = res.requests || [];
    if (badge) {
      badge.innerText = `${allPasswordRequests.length} Pending`;
    }
    renderPasswordRequests(allPasswordRequests);
  } catch (err) {
    console.error('Error fetching password requests:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem; color: #f87171;">
          ⚠️ Failed to load password requests: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function renderPasswordRequests(requests) {
  const tbody = document.getElementById('passwordRequestsTableBody');
  if (!tbody) return;

  if (requests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2.2rem; color: #64748b;">
          ✅ No pending password change requests.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = requests.map(r => {
    const dateFormatted = r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A';
    const safeUsername = escapeHtml(r.username);
    const safeNewPassword = escapeHtml(r.new_password);
    const safeCreationDate = escapeHtml(r.account_creation_date || 'N/A');
    const safeLastPassword = escapeHtml(r.last_password || 'N/A');

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
            <span>👤</span>
            <span>@${safeUsername}</span>
          </div>
          <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">
            Created: <span style="color: #38bdf8;">${safeCreationDate}</span> &bull; Last PW: <code style="color: #cbd5e1;">${safeLastPassword}</code>
          </div>
        </td>
        <td>
          <code style="background: rgba(147, 51, 234, 0.2); color: #c084fc; padding: 4px 9px; border-radius: 6px; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.35); font-size: 0.88rem;">${safeNewPassword}</code>
        </td>
        <td style="color: #cbd5e1; font-size: 0.84rem;">
          ${dateFormatted}
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="admin-btn" style="background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; padding: 6px 14px; font-size: 0.8rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer;" onclick="approvePasswordRequest(${r.id}, '${safeUsername}')">
              ✓ Approve
            </button>
            <button type="button" class="admin-btn admin-btn-danger" style="padding: 6px 14px; font-size: 0.8rem; font-weight: 700;" onclick="rejectPasswordRequest(${r.id}, '${safeUsername}')">
              ✕ Reject
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function approvePasswordRequest(requestId, username) {
  if (!confirm(`Are you sure you want to APPROVE the password change for @${username}?\n\nThis will update their password to the requested new password immediately.`)) {
    return;
  }

  try {
    const res = await Habitism.adminApprovePasswordRequest(requestId);
    if (res.success) {
      alert(res.message || `Password change request approved for @${username}.`);
      loadPasswordRequests();
      loadAdminData();
    } else {
      alert('Approval failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error approving request: ' + err.message);
  }
}

async function rejectPasswordRequest(requestId, username) {
  if (!confirm(`Are you sure you want to REJECT the password change request for @${username}?`)) {
    return;
  }

  try {
    const res = await Habitism.adminRejectPasswordRequest(requestId);
    if (res.success) {
      alert(res.message || `Password change request rejected for @${username}.`);
      loadPasswordRequests();
    } else {
      alert('Rejection failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error rejecting request: ' + err.message);
  }
}

// Quick Adjust: Calendar (opens modal with target user preselected)
function quickAdjustCalendar(userId) {
  openAdminCalendarModal(userId);
}

// ==========================================================================
// User Feedback System (Admin Review & Status Management)
// ==========================================================================
let allFeedback = [];
let currentDetailFeedback = null;

async function loadFeedback() {
  const tbody = document.getElementById('feedbackTableBody');
  const countBadge = document.getElementById('feedbackCountBadge');
  const newBadge = document.getElementById('feedbackNewBadge');

  try {
    const res = await Habitism.adminGetFeedback();
    if (!res.success) throw new Error(res.error || 'Failed to load feedback');

    allFeedback = res.feedback || [];

    if (countBadge) countBadge.innerText = `${allFeedback.length} Total`;
    if (newBadge) {
      const newCount = allFeedback.filter(f => (f.status || 'new').toLowerCase() === 'new').length;
      newBadge.innerText = `${newCount} New`;
    }

    filterAndRenderFeedback();
  } catch (err) {
    console.error('Error loading feedback:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #f87171;">
            Failed to load user feedback submissions: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }
}

function filterAndRenderFeedback() {
  const statusFilter = (document.getElementById('feedbackStatusFilter')?.value || 'all').toLowerCase();
  const typeFilter = document.getElementById('feedbackTypeFilter')?.value || 'all';

  let filtered = [...allFeedback];

  if (statusFilter !== 'all') {
    filtered = filtered.filter(f => (f.status || 'new').toLowerCase() === statusFilter);
  }

  if (typeFilter !== 'all') {
    filtered = filtered.filter(f => (f.type || '').toLowerCase() === typeFilter.toLowerCase());
  }

  renderFeedback(filtered);
}

function renderFeedback(feedbackList) {
  const tbody = document.getElementById('feedbackTableBody');
  if (!tbody) return;

  if (feedbackList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
          No feedback submissions match the current filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = feedbackList.map(item => {
    const id = item.id;
    const type = item.type || 'Idea';
    const status = (item.status || 'new').toLowerCase();
    
    // Submitter display: Name, Account, or Anonymous
    const accountUser = item.account_username || item.username;
    let submitterDisplay = '<span style="color: #94a3b8; font-style: italic;">Anonymous</span>';
    if (item.name && accountUser) {
      submitterDisplay = `<strong>${escapeHtml(item.name)}</strong> <span style="color: #94a3b8; font-size: 0.8rem;">(@${escapeHtml(accountUser)})</span>`;
    } else if (item.name) {
      submitterDisplay = `<strong>${escapeHtml(item.name)}</strong>`;
    } else if (accountUser) {
      submitterDisplay = `<strong style="color: #38bdf8;">@${escapeHtml(accountUser)}</strong>`;
    }

    // Type badge styling
    let typeBadgeStyle = 'background: rgba(147, 51, 234, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc;';
    let typeIcon = '💡';
    if (type.toLowerCase() === 'concern') {
      typeBadgeStyle = 'background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24;';
      typeIcon = '⚠️';
    } else if (type.toLowerCase() === 'bug report') {
      typeBadgeStyle = 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171;';
      typeIcon = '🐞';
    }

    // Status badge styling
    let statusBadgeStyle = 'background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24;';
    let statusLabel = 'New';
    if (status === 'read') {
      statusBadgeStyle = 'background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8;';
      statusLabel = 'Read';
    } else if (status === 'resolved') {
      statusBadgeStyle = 'background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80;';
      statusLabel = 'Resolved';
    }

    // Message preview (truncate to 60 chars)
    const rawMsg = item.message || '';
    const previewMsg = rawMsg.length > 60 ? rawMsg.substring(0, 60) + '…' : rawMsg;

    // Date formatted
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '--';

    return `
      <tr style="cursor: pointer;" onclick="openFeedbackDetail(${id})" title="Click row to view full feedback message">
        <td><strong style="color: #94a3b8; font-size: 0.82rem;">#${id}</strong></td>
        <td>${submitterDisplay}</td>
        <td>
          <span class="admin-badge" style="${typeBadgeStyle} font-size: 0.76rem;">
            ${typeIcon} ${escapeHtml(type)}
          </span>
        </td>
        <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cbd5e1;">
          ${escapeHtml(previewMsg)}
        </td>
        <td style="font-size: 0.8rem; color: #94a3b8;">${dateStr}</td>
        <td>
          <span class="admin-badge" style="${statusBadgeStyle} font-size: 0.76rem;">
            ${statusLabel}
          </span>
        </td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <button type="button" class="admin-btn admin-btn-secondary" style="padding: 4px 10px; font-size: 0.78rem;" onclick="openFeedbackDetail(${id})">
            <span>View</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openFeedbackDetail(feedbackId) {
  const item = allFeedback.find(f => f.id === Number(feedbackId));
  if (!item) return;

  currentDetailFeedback = item;

  const modal = document.getElementById('feedbackDetailModal');
  const idBadge = document.getElementById('detailFeedbackIdBadge');
  const userEl = document.getElementById('detailFeedbackUser');
  const emailEl = document.getElementById('detailFeedbackEmail');
  const typeEl = document.getElementById('detailFeedbackType');
  const dateEl = document.getElementById('detailFeedbackDate');
  const messageEl = document.getElementById('detailFeedbackMessage');
  const msgEl = document.getElementById('feedbackDetailStatusMsg');

  if (idBadge) idBadge.innerText = `#${item.id}`;

  const accountUser = item.account_username || item.username;
  let userText = 'Anonymous';
  if (item.name && accountUser) {
    userText = `${item.name} (@${accountUser})`;
  } else if (item.name) {
    userText = item.name;
  } else if (accountUser) {
    userText = `@${accountUser}`;
  }
  if (userEl) userEl.innerText = userText;

  const contactEmail = item.email || item.account_email || item.user_account_email || 'None provided';
  if (emailEl) emailEl.innerText = contactEmail;

  if (typeEl) {
    typeEl.innerText = item.type || 'Idea';
    if ((item.type || '').toLowerCase() === 'concern') {
      typeEl.style.color = '#fbbf24';
    } else if ((item.type || '').toLowerCase() === 'bug report') {
      typeEl.style.color = '#f87171';
    } else {
      typeEl.style.color = '#c084fc';
    }
  }

  if (dateEl) {
    dateEl.innerText = item.created_at ? new Date(item.created_at).toLocaleString() : '--';
  }

  if (messageEl) {
    messageEl.innerText = item.message || '';
  }

  updateDetailStatusBadge(item.status || 'new');

  if (msgEl) {
    msgEl.style.display = 'none';
    msgEl.innerText = '';
  }

  if (modal) {
    modal.style.display = 'flex';
  }
}

function updateDetailStatusBadge(status) {
  const statusBadge = document.getElementById('detailFeedbackStatusBadge');
  if (!statusBadge) return;

  const norm = (status || 'new').toLowerCase();
  if (norm === 'read') {
    statusBadge.innerText = 'Read';
    statusBadge.style.cssText = 'background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-size: 0.8rem;';
  } else if (norm === 'resolved') {
    statusBadge.innerText = 'Resolved';
    statusBadge.style.cssText = 'background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; font-size: 0.8rem;';
  } else {
    statusBadge.innerText = 'New';
    statusBadge.style.cssText = 'background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; font-size: 0.8rem;';
  }
}

function closeFeedbackDetailModal() {
  const modal = document.getElementById('feedbackDetailModal');
  if (modal) modal.style.display = 'none';
  currentDetailFeedback = null;
}

async function handleUpdateFeedbackStatusAction(newStatus) {
  if (!currentDetailFeedback) return;
  const feedbackId = currentDetailFeedback.id;
  const msgEl = document.getElementById('feedbackDetailStatusMsg');

  try {
    const res = await Habitism.adminUpdateFeedbackStatus(feedbackId, newStatus);
    if (!res.success) throw new Error(res.error || 'Failed to update feedback status');

    // Update in-memory feedback record
    currentDetailFeedback.status = newStatus;
    const itemInList = allFeedback.find(f => f.id === feedbackId);
    if (itemInList) {
      itemInList.status = newStatus;
    }

    updateDetailStatusBadge(newStatus);

    if (msgEl) {
      msgEl.style.display = 'block';
      msgEl.style.color = '#34d399';
      msgEl.innerText = `Status successfully updated to "${newStatus}".`;
    }

    // Refresh badges and table
    const newBadge = document.getElementById('feedbackNewBadge');
    if (newBadge) {
      const newCount = allFeedback.filter(f => (f.status || 'new').toLowerCase() === 'new').length;
      newBadge.innerText = `${newCount} New`;
    }
    filterAndRenderFeedback();
  } catch (err) {
    if (msgEl) {
      msgEl.style.display = 'block';
      msgEl.style.color = '#f87171';
      msgEl.innerText = 'Error: ' + err.message;
    }
  }
}

// ==========================================================================
// Facebook Graph API Accountability Feed
// ==========================================================================
async function loadAccountabilityFeed() {
  try {
    const res = await Habitism.adminGetAccountabilityFeed();
    if (!res.success) throw new Error(res.error || 'Failed to load feed');

    const posts = res.posts || [];
    const metricCount = document.getElementById('metricAccountabilityCount');
    if (metricCount) metricCount.innerText = posts.length;

    renderAccountabilityFeed(posts);
  } catch (err) {
    console.error('Error loading accountability feed:', err);
  }
}

function renderAccountabilityFeed(posts) {
  const tbody = document.getElementById('accountabilityTableBody');
  if (!tbody) return;

  if (posts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
          No accountability posts triggered yet. Users are staying consistent! 🌸
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = posts.map(p => {
    const isSuccess = p.status === 'published';
    const statusStyle = isSuccess
      ? 'background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); color: #34d399;'
      : 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171;';
    
    // Parse response payload if error
    let errorDetail = '';
    if (!isSuccess && p.response_payload) {
      try {
        const payload = JSON.parse(p.response_payload);
        if (payload.error && payload.error.message) {
          errorDetail = `\n⚠️ Reason: ${payload.error.message}`;
        }
      } catch (e) {}
    }

    return `
      <tr>
        <td style="color: #64748b; font-size: 0.8rem; white-space: nowrap;">${p.created_at || 'Just now'}</td>
        <td style="font-weight: 700; color: #ffffff;">${escapeHtml(p.user_name || 'User #' + p.user_id)}</td>
        <td style="color: #38bdf8; font-size: 0.82rem;">Page: ${escapeHtml(p.fb_page_id || '1496888330165860')}</td>
        <td>
          <span style="font-size: 0.82rem; padding: 3px 8px; border-radius: 6px; font-weight: 600; ${statusStyle}" title="${escapeHtml(p.status + errorDetail)}">
            ${escapeHtml(p.status || 'published')}
          </span>
        </td>
        <td style="font-family: monospace; font-size: 0.8rem; color: #94a3b8;">${escapeHtml(p.fb_post_id || 'sim_fb_post')}</td>
        <td style="font-size: 0.84rem; color: #cbd5e1; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          &ldquo;${escapeHtml(p.message || '')}&rdquo;
        </td>
        <td style="text-align: center;">
          <button type="button" class="admin-btn admin-btn-danger" style="padding: 3px 8px; font-size: 0.7rem;" onclick="deleteFacebookPunishment(${p.id})">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function postFacebookPunishment() {
  const userId = prompt('Enter User ID to post Facebook punishment for:');
  if (!userId) return;
  const dateStr = prompt('Enter date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if (!dateStr) return;
  const message = prompt('Enter punishment message:', 'This person made this commitment on Habitism but did not complete it.');
  if (message === null) return;

  try {
    const res = await Habitism.adminPostPunishment(userId, dateStr, [], [], message);
    if (res.success) {
      alert(res.message);
      loadAccountabilityFeed();
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteFacebookPunishment(postId) {
  if (!confirm('Delete this accountability post?')) return;
  try {
    const res = await Habitism.adminDeletePunishment(postId);
    if (res.success) {
      alert(res.message);
      loadAccountabilityFeed();
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function setUserDeadline() {
  const userId = prompt('Enter User ID to set deadline for (leave blank for global default):');
  const deadlineTime = prompt('Enter deadline time (HH:MM, e.g. 23:59):', '23:59');
  if (!deadlineTime) return;

  try {
    const res = await Habitism.adminSetDeadline(userId || null, deadlineTime);
    if (res.success) {
      alert(res.message);
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function triggerTestFacebookPost() {
  const testMsg = prompt('Enter a test message for Habitism Facebook Graph API:', '📢 [Admin Test] Habitism Accountability Engine operational check.');
  if (!testMsg) return;

  try {
    const res = await fetch(`${Habitism.API_BASE}/api/facebook/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: testMsg })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Server returned HTTP ${res.status}. If deployment is in progress, please retry in 1 minute.`);
    }

    if (!res.ok) throw new Error(data.error || 'Facebook test failed');

    alert(`Facebook Graph API Result:\nStatus: ${data.status}\nPost ID: ${data.postId}\nNote: ${data.note || 'Success'}`);
    loadAccountabilityFeed();
  } catch (err) {
    alert('Facebook Graph API Error: ' + err.message);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ==========================================================================
// Admin Actions: Unlock Checks & Reset Checklist
// ==========================================================================
let currentInspectUserId = null;
let currentInspectUsername = null;

async function inspectActionUnlock() {
  if (!currentInspectUserId) return;
  await adminUnlockChecks(currentInspectUserId, currentInspectUsername);
}

async function inspectActionResetChecks() {
  if (!currentInspectUserId) return;
  await adminResetChecks(currentInspectUserId, currentInspectUsername);
}

async function adminUnlockChecks(userId, username) {
  const name = username || `User #${userId}`;
  if (!confirm(`Remove locked checks for @${name} (ID #${userId})?\n\nThis will remove the coin claim lock on today's checkboxes, allowing the user to uncheck or toggle habits immediately without waiting for midnight.`)) {
    return;
  }

  try {
    const res = await Habitism.adminUnlockChecks(userId);
    if (res.success) {
      alert(res.message || `Locked checks removed for @${name}.`);
      loadAdminData();
      if (currentInspectUserId === userId && document.getElementById('inspectModal').style.display === 'flex') {
        inspectUser(userId);
      }
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error unlocking checks: ' + err.message);
  }
}

async function adminResetChecks(userId, username) {
  const name = username || `User #${userId}`;
  if (!confirm(`Reset checklist progress for @${name} (ID #${userId})?\n\n⚠️ This will remove ALL checkmarks on their checkboxes, clear claim locks, and reset today's checklist progress back to 0%.`)) {
    return;
  }

  try {
    const res = await Habitism.adminResetChecks(userId);
    if (res.success) {
      alert(res.message || `Checklist progress reset for @${name}.`);
      loadAdminData();
      if (currentInspectUserId === userId && document.getElementById('inspectModal').style.display === 'flex') {
        inspectUser(userId);
      }
    } else {
      alert('Failed: ' + (res.error || res.message));
    }
  } catch (err) {
    alert('Error resetting checklist: ' + err.message);
  }
}

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
  loadAccountabilityFeed();

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
            <button type="button" class="admin-btn admin-btn-secondary" style="padding: 5px 10px; font-size: 0.78rem;" onclick="openPasswordReset(${u.id}, '${escapeHtml(u.username)}')">
              🔑 Reset PW
            </button>
            ${u.role !== 'admin' ? `
              <button type="button" class="admin-btn admin-btn-danger" style="padding: 5px 10px; font-size: 0.78rem;" onclick="deleteUser(${u.id}, '${escapeHtml(u.username)}')">
                🗑️
              </button>
            ` : ''}
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
    const res = await Habitism.adminGetUserDetails(userId);
    if (!res.success) throw new Error(res.error || 'Failed to inspect user');

    const { user, dailyLogs, accountabilityLogs, taskStates } = res;

    // Set inspection modal headers
    document.getElementById('inspectUserName').innerText = `${user.name || user.username} (@${user.username})`;
    document.getElementById('inspectUserMeta').innerText = `ID #${user.id} &bull; ${user.email} &bull; Streak: ${user.streak}d &bull; Coins: ${user.coins} &bull; Freezes: ${user.streak_freezes}`;

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

    // Check states
    const checks = statesMap[`checks_lvl_${activeLevel}`] || statesMap['custom_checks'] || {};

    const tasksContainer = document.getElementById('inspectTasksContainer');
    tasksContainer.innerHTML = taskList.map((t, idx) => {
      const isChecked = !!checks[t.id || idx];
      return `
        <div class="task-inspect-item ${isChecked ? 'done' : ''}">
          <div class="task-inspect-title">
            <span>${isChecked ? '✅' : '⏳'}</span>
            <span>${t.icon || '📌'} ${escapeHtml(t.text || t.name || 'Habit Task')}</span>
          </div>
          <span style="font-size: 0.78rem; font-weight: 700; color: ${isChecked ? '#34d399' : '#94a3b8'};">
            ${isChecked ? 'Completed Today' : 'Pending'}
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
        <td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">
          No accountability posts triggered yet. Users are staying consistent! 🌸
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = posts.map(p => `
    <tr>
      <td style="color: #64748b; font-size: 0.8rem; white-space: nowrap;">${p.created_at || 'Just now'}</td>
      <td style="font-weight: 700; color: #ffffff;">${escapeHtml(p.user_name || 'User #' + p.user_id)}</td>
      <td style="color: #38bdf8; font-size: 0.82rem;">Page: ${escapeHtml(p.fb_page_id || '1496888330165860')}</td>
      <td>
        <span style="font-size: 0.82rem; padding: 3px 8px; border-radius: 6px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #bae6fd;">
          ${escapeHtml(p.status || 'published')}
        </span>
      </td>
      <td style="font-family: monospace; font-size: 0.8rem; color: #94a3b8;">${escapeHtml(p.fb_post_id || 'sim_fb_post')}</td>
      <td style="font-size: 0.84rem; color: #cbd5e1; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        &ldquo;${escapeHtml(p.message || '')}&rdquo;
      </td>
    </tr>
  `).join('');
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
    const data = await res.json();
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


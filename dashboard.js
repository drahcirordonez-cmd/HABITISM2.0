/**
 * ============================================================================
 * HABITISM - DASHBOARD LOGIC (dashboard.js)
 * ============================================================================
 * Handles Multi-User State Isolation, Calendar, Level Habits (6, 7, 8 tasks),
 * Dynamic Tiers & Containers, Rewards, Unclipped Global Tooltips & Facebook Integration.
 */

// ============================================================================
// 🌟 DEVELOPER LEVELS (Curated default habits with rich helpful tooltips)
// ============================================================================
const DEVELOPER_LEVELS = [
  {
    id: 1,
    title: "Level 1: Taking the first steps",
    info: "baby steps (note: it may seem very easy, but keep in mind this is where foundational momentum begins)",
    tasks: [
      { 
        text: "don't use your phone for 1 minute", 
        info: "Builds initial impulse control by breaking automatic smartphone reach habits" 
      },
      { 
        text: "close your eyes for 1-minute and take deep breaths", 
        info: "Resets neurological baseline arousal and lowers physical heart rate" 
      },
      { 
        text: "do 1 push up", 
        info: "Destroys physical inertia with zero friction, proving to yourself that action is effortless" 
      },
      { 
        text: "do 1 jumping jack", 
        info: "Activates blood circulation through the body to shake off lethargy" 
      },
      { 
        text: "Think of one thing to be thankful for", 
        info: "Neurochemically shifts attention from anxiety to gratitude" 
      }
    ]
  },
  {
    id: 2,
    title: "Level 2: Let's keep it up",
    info: "Stepping up the rhythm while locking in daily consistency",
    tasks: [
      { 
        text: "don't use your phone for 2 minutes", 
        info: "Doubles your conscious resistance against quick dopamine triggers" 
      },
      { 
        text: "close your eyes for 1-minute and take deep breaths", 
        info: "Stimulates vagal tone for calmer emotional responses under pressure" 
      },
      { 
        text: "do 2 push ups", 
        info: "Gently compounds strength while maintaining micro-habit momentum" 
      },
      { 
        text: "do 3 jumping jacks", 
        info: "Oxygenates blood flow to energize your physical state" 
      },
      { 
        text: "Think of 2 things to be thankful for", 
        info: "Example: your family, cousin, or pet for being there for you" 
      }
    ]
  },
  {
    id: 3,
    title: "Level 3: Keep moving forward with me",
    info: "Accelerating physical alertness and mental clarity (6 tasks)",
    tasks: [
      { 
        text: "don't use your phone for 3 minutes", 
        info: "Expands your conscious attention span and blocks reflex checking" 
      },
      { 
        text: "close your eyes for 1-minute and take deep breaths", 
        info: "Deep diaphragmatic breathing lowers cortisol and clears mental fog" 
      },
      { 
        text: "do 3 push ups", 
        info: "Quick isometric activation pumps oxygenated blood directly to the brain" 
      },
      { 
        text: "do 5 jumping jacks", 
        info: "Engages cardiovascular rhythm and shakes off physical stiffness" 
      },
      { 
        text: "Think of 3 things to be thankful for", 
        info: "Example: a loyal friend, a good book, or a warm meal" 
      },
      { 
        text: "Drink a large glass of clean water", 
        info: "Rehydrates brain cells, boosts metabolic speed, and primes physical focus" 
      }
    ]
  },
  {
    id: 4,
    title: "Level 4: Try something new with me | Meditation",
    info: "Improves sleep, calms the mind • best when quiet (7 tasks)",
    tasks: [
      { 
        text: "set a 5 minute timer", 
        info: "A fixed container keeps your mind from wandering to clock-watching" 
      },
      { 
        text: "believe in yourself and close your eyes for 5mins", 
        info: "If you cannot close your eyes, simply soften your gaze and focus attention on one point" 
      },
      { 
        text: "take deep breaths", 
        info: "Deep inhale through nose, slow extended exhale through mouth" 
      },
      { 
        text: "keep your focus on your deep breaths", 
        info: "Anchoring your mind to the breath trains your prefrontal cortex to resist distractions" 
      },
      { 
        text: "Trust the process", 
        info: "Mind wandering is completely natural; gently returning your focus builds mental resilience" 
      },
      { 
        text: "Gently scan your body from head to toe", 
        info: "Identifies and consciously releases subconscious tension stored in shoulders, jaw, and neck" 
      },
      { 
        text: "Notice one distracting thought and let it float away", 
        info: "Cultivates non-reactive detachment, training emotional control during daily stress" 
      }
    ]
  },
  {
    id: 5,
    title: "Level 5: Prime your environment",
    info: "Make good habits easy and bad habits hard to do (8 tasks)",
    tasks: [
      { 
        text: "give your phone to someone and let them keep/hide it for 5 minutes", 
        info: "Physical distance destroys the habitual reflex loop of mindless doom-scrolling" 
      },
      { 
        text: "make your bed", 
        info: "Creates an immediate visual victory and psychologically discourages crawling back under the covers" 
      },
      { 
        text: "Remove things that doesn't belong to the floor", 
        info: "Eliminates visual chaos, which measurably reduces subconscious cognitive load" 
      },
      { 
        text: "Place your study materials on your desk", 
        info: "Lowers friction and activation energy, making it vastly easier to initiate work" 
      },
      { 
        text: "Prepare tomorrow's to-do list", 
        info: "Offloads working memory so you wake up with absolute clarity and purpose" 
      },
      { 
        text: "Place a filled water bottle on your workstation", 
        info: "Keeps essential hydration within arm's reach so you remain mentally sharp without getting up" 
      },
      { 
        text: "Mute all non-critical notifications on devices", 
        info: "Protects deep workflow states from intrusive dopamine-driven pings and rings" 
      },
      { 
        text: "Clear and wipe down your primary tabletop surface", 
        info: "A sanitized, pristine surface signals psychological readiness to begin serious work" 
      }
    ]
  }
];

// Option A: Starter Custom Tasks
const DEFAULT_OPTION_A_TASKS = [
  { text: "Morning Meditation (5 mins)", info: "Centering mental attention before beginning work" },
  { text: "Do 20 Push-ups", info: "Boosts physical strength and upper body endurance" },
  { text: "Do 10 Pull-ups", info: "Engages back and posterior chain muscles" },
  { text: "Do 25 Sit-ups", info: "Core conditioning to support proper posture" },
  { text: "Deep breathing & Gratitude reflection", info: "Calms nervous system and centers your day" }
];

// ============================================================================
// 🔒 MULTI-USER ISOLATION STORAGE HELPERS
// ============================================================================
let currentUser = null;
let currentCalendarDate = new Date();
let currentLevelIndex = 0;
let activeTaskMode = "presets"; // 'presets' (Option B) or 'custom' (Option A)

// Commitment System State
let committedListId = null;      // 'lvl_N' or 'custom'
let committedDate = null;        // date string of the commitment
let committedLevelIndex = null;  // level index at time of commitment

function getTodayString() {
  return new Date().toDateString();
}

function userKey(key) {
  return Habitism.getUserKey(key, currentUser);
}

// -------------------------------------------------------------
// 📅 PART 1: CALENDAR LOGIC (TIER GREEN, ORANGE, WHITE-BLUE)
// -------------------------------------------------------------
let isInitialCloudSyncComplete = false;

function countTruthyChecks(rawJson) {
  if (!rawJson) return 0;
  try {
    const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
    if (!parsed || typeof parsed !== "object") return 0;
    return Object.values(parsed).filter(Boolean).length;
  } catch (e) {
    return 0;
  }
}

function getSavedChecksCompletedCountForDate(dateString) {
  if (!dateString) return 0;

  // 1. Check if there is a commitment for this specific date
  let committedCount = 0;
  const rawCommit = localStorage.getItem(userKey(`commitment_${dateString}`));
  if (rawCommit) {
    try {
      const parsedCommit = JSON.parse(rawCommit);
      if (parsedCommit && parsedCommit.listId && (!parsedCommit.date || parsedCommit.date === dateString)) {
        if (parsedCommit.listId === "custom") {
          committedCount = countTruthyChecks(localStorage.getItem(userKey(`custom_checks_${dateString}`)));
        } else {
          const lvlId = String(parsedCommit.listId).replace("lvl_", "");
          committedCount = Math.max(
            countTruthyChecks(localStorage.getItem(userKey(`checks_${lvlId}_${dateString}`))),
            countTruthyChecks(localStorage.getItem(userKey(`checks_lvl_${lvlId}_${dateString}`)))
          );
        }
      }
    } catch (e) {}
  }

  // 2. Also check across custom list, all developer levels, and claim locks for this date
  let maxListCount = countTruthyChecks(localStorage.getItem(userKey(`custom_checks_${dateString}`)));
  for (let i = 0; i < DEVELOPER_LEVELS.length; i++) {
    const lvlId = DEVELOPER_LEVELS[i].id;
    const c1 = countTruthyChecks(localStorage.getItem(userKey(`checks_${lvlId}_${dateString}`)));
    const c2 = countTruthyChecks(localStorage.getItem(userKey(`checks_lvl_${lvlId}_${dateString}`)));
    if (c1 > maxListCount) maxListCount = c1;
    if (c2 > maxListCount) maxListCount = c2;
  }

  const rawLock = localStorage.getItem(userKey(`claim_lock_${dateString}`));
  if (rawLock) {
    try {
      const lockObj = JSON.parse(rawLock);
      if (lockObj && typeof lockObj === "object") {
        Object.values(lockObj).forEach(listLocks => {
          const c = countTruthyChecks(listLocks);
          if (c > maxListCount) maxListCount = c;
        });
      }
    } catch (e) {}
  }

  return committedCount > 0 ? committedCount : maxListCount;
}

function getDayCompletedCount(dateString) {
  const count = localStorage.getItem(userKey("cal_tier_" + dateString));
  const storedCount = count ? (parseInt(count, 10) || 0) : 0;
  const checksCount = getSavedChecksCompletedCountForDate(dateString);
  return Math.max(storedCount, checksCount);
}

function setDayCompletedCount(dateString, count, allowServerSync = true) {
  const k = userKey("cal_tier_" + dateString);
  const val = parseInt(count, 10) || 0;

  // Prevent initial pre-sync render from wiping existing progress with 0
  if (val <= 0 && !isInitialCloudSyncComplete && dateString === getTodayString()) {
    return;
  }

  if (val <= 0) {
    localStorage.removeItem(k);
  } else {
    localStorage.setItem(k, val.toString());
  }

  // Cloud Sync: Persist calendar day in SQLite database across all browsers
  if (allowServerSync && currentUser && currentUser.id && Habitism.setUserCalendarDay) {
    Habitism.setUserCalendarDay(currentUser.id, dateString, val).catch(() => {});
  }
}

// -------------------------------------------------------------
// 📝 Helper: Get completed task texts for today
// -------------------------------------------------------------
function getCompletedTaskTextsForToday() {
  const checks = getActiveChecks();
  const tasks = getActiveTasks();
  const completedTexts = [];
  // checks is an object like {0: true, 1: false}, not an array
  Object.keys(checks).forEach(index => {
    if (checks[index]) {
      const task = tasks[parseInt(index)];
      completedTexts.push(typeof task === 'string' ? task : (task.text || task.title));
    }
  });
  return completedTexts;
}

// -------------------------------------------------------------
// 🤝 COMMITMENT SYSTEM
// -------------------------------------------------------------
function getCommitmentKey() {
  return userKey(`commitment_${getTodayString()}`);
}

function getCommitmentStorage() {
  const saved = localStorage.getItem(getCommitmentKey());
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return null;
}

function saveCommitmentStorage(data) {
  if (data === null) {
    localStorage.removeItem(getCommitmentKey());
  } else {
    localStorage.setItem(getCommitmentKey(), JSON.stringify(data));
  }
  // Sync to server defensively (never block or throw)
  try {
    if (currentUser && currentUser.id && typeof Habitism.setUserStorage === 'function') {
      const syncPromise = Habitism.setUserStorage(`commitment_${getTodayString()}`, data);
      if (syncPromise && typeof syncPromise.catch === 'function') {
        syncPromise.catch(() => {});
      }
    }
  } catch (syncErr) {
    console.warn('Commitment cloud sync note:', syncErr.message);
  }
}

function getCommitmentListId() {
  const stored = getCommitmentStorage();
  if (stored && stored.date === getTodayString()) {
    committedListId = stored.listId;
    committedDate = stored.date;
    committedLevelIndex = stored.levelIndex;
    return stored;
  }
  // Reset if commitment is from a different day
  committedListId = null;
  committedDate = null;
  committedLevelIndex = null;
  return null;
}

function commitToList(listId, levelIndex) {
  const previousListId = committedListId;
  const today = getTodayString();

  committedListId = listId;
  committedDate = today;
  committedLevelIndex = levelIndex;

  saveCommitmentStorage({ listId, date: today, levelIndex });

  // Show message if switching from a previous commitment
  if (previousListId && previousListId !== listId) {
    const prevLabel = previousListId === 'custom' ? 'Custom List' : `Level ${previousListId.replace('lvl_', '')}`;
    const currLabel = listId === 'custom' ? 'Custom List' : `Level ${listId.replace('lvl_', '')}`;
    showToast(`🔄 Commitment switched from ${prevLabel} to ${currLabel}. Previous commitment released.`);
  } else {
    const currLabel = listId === 'custom' ? 'Custom List' : `Level ${listId.replace('lvl_', '')}`;
    showToast(`📌 Committed to ${currLabel} for today! Complete it to lock in your calendar glow.`);
  }

  updateCommitmentUI();
  renderChecklist();

  // Force calendar re-render with today's date to ensure immediate glow update
  renderCalendar(new Date());
}

function removeCommitment() {
  if (!committedListId) {
    // Try to recover from localStorage in case JS variable is out of sync
    const stored = localStorage.getItem(getCommitmentKey());
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        committedListId = parsed.listId;
        committedDate = parsed.date;
        committedLevelIndex = parsed.levelIndex;
      } catch (e) {}
    }
    if (!committedListId) {
      showToast("ℹ️ No active commitment to remove.");
      return;
    }
  }

  const removedLabel = committedListId === 'custom' ? 'Custom List' : `Level ${committedListId.replace('lvl_', '')}`;
  committedListId = null;
  committedDate = null;
  committedLevelIndex = null;

  saveCommitmentStorage(null);
  updateCommitmentUI();
  renderChecklist();
  renderCalendar(currentCalendarDate);
  showToast(`❌ Commitment to ${removedLabel} removed. You can now commit to a different list.`);
}

function commitToCurrentList() {
  const today = getTodayString();
  let listId, levelIndex;

  if (activeTaskMode === 'custom') {
    listId = 'custom';
    levelIndex = null;
  } else {
    listId = `lvl_${DEVELOPER_LEVELS[currentLevelIndex].id}`;
    levelIndex = currentLevelIndex;
  }

  commitToList(listId, levelIndex);
}

// Global exposure for inline onclick handlers
window.commitToCurrentList = commitToCurrentList;
window.removeCommitment = removeCommitment;
window.updateCommitmentUI = updateCommitmentUI;

async function claimPiggybank() {
  const user = Habitism.getCurrentUser();
  if (!user || !user.id) {
    showToast("⚠️ Please log in to claim piggybank coins.");
    return;
  }

  try {
    const res = await Habitism.claimPiggybank(user.id);
    if (res.success) {
      // Lock all currently checked boxes so they can't be unchecked/re-farmed today
      if (res.claimed > 0) {
        lockClaimedChecks();
        renderChecklist();
      }

      // Update local user object
      const currentUser = Habitism.getCurrentUser();
      if (currentUser) {
        currentUser.coins = res.coins;
        currentUser.piggybank_coins = res.piggybank_coins;
        Habitism.setCurrentUser(currentUser);
      }
      updateNavbarBadges();
      updatePiggybankDisplay();
      showToast(`💰 Claimed ${res.claimed} coins from piggybank! Total: ${res.coins}`);
    } else {
      showToast(res.message || "Nothing to claim.");
    }
  } catch (err) {
    showToast("❌ Failed to claim piggybank coins.");
    console.error(err);
  }
}

function updatePiggybankDisplay() {
  const user = Habitism.getCurrentUser();
  const balanceEl = document.getElementById("piggybankBalance");
  if (balanceEl && user) {
    balanceEl.innerText = user.piggybank_coins || 0;
  }
}

function getCommitmentGlowCount() {
  // Returns the completed count for the committed list today, or 0 if no commitment
  if (!committedListId || committedDate !== getTodayString()) return 0;

  // Build the key based on the committed list
  let checksKey;
  if (committedListId === 'custom') {
    checksKey = userKey(`custom_checks_${getTodayString()}`);
  } else {
    const levelId = committedListId.replace('lvl_', '');
    checksKey = userKey(`checks_${levelId}_${getTodayString()}`);
  }

  const saved = localStorage.getItem(checksKey);
  if (!saved) return 0;
  try {
    const checks = JSON.parse(saved);
    return Object.values(checks).filter(Boolean).length;
  } catch (e) {
    return 0;
  }
}

function updateCommitmentUI() {
  const commitBtn = document.getElementById("btnCommit");
  const removeBtn = document.getElementById("btnRemoveCommitment");
  const commitmentLabel = document.getElementById("commitmentLabel");

  if (!commitBtn || !removeBtn || !commitmentLabel) return;

  const today = getTodayString();
  // Recover from localStorage if JS variable is out of sync
  let effectiveListId = committedListId;
  let effectiveDate = committedDate;
  if (!effectiveListId || effectiveDate !== today) {
    const stored = localStorage.getItem(getCommitmentKey());
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.listId && parsed.date === today) {
          effectiveListId = parsed.listId;
          effectiveDate = parsed.date;
          committedListId = parsed.listId;
          committedDate = parsed.date;
          committedLevelIndex = parsed.levelIndex;
        }
      } catch (e) {}
    }
  }

  const hasCommitment = effectiveListId && effectiveDate === today;

  if (hasCommitment) {
    const label = effectiveListId === 'custom' ? 'Custom List' : `Level ${effectiveListId.replace('lvl_', '')}`;
    commitmentLabel.innerText = `📌 Committed: ${label}`;
    commitmentLabel.style.display = "inline-flex";
    commitBtn.style.display = "none";
    removeBtn.style.display = "inline-flex";
  } else {
    commitmentLabel.style.display = "none";
    commitBtn.style.display = "inline-flex";
    removeBtn.style.display = "none";
  }
}

function renderCalendar(date) {
  const calendar = document.getElementById("calendar");
  if (!calendar) return;

  const year = date.getFullYear();
  const month = date.getMonth();

  const monthYearEl = document.getElementById("monthYear");
  if (monthYearEl) {
    monthYearEl.innerText = date.toLocaleString("default", { month: "long" }).toUpperCase() + " " + year;
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = "<thead><tr>";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let d of days) html += `<th>${d}</th>`;
  html += "</tr></thead><tbody><tr>";

  for (let i = 0; i < firstDay; i++) {
    html += "<td></td>";
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const today = new Date();
    const cellDate = new Date(year, month, day).toDateString();
    let classes = "";

    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      classes += "today ";
    }

    // Use commitment-based glow for today, otherwise use stored day count
    let completedCount;
    const todayStr = getTodayString();
    if (cellDate === todayStr) {
      // Today: use commitment glow if committed, otherwise stored count
      const commitmentCount = getCommitmentGlowCount();
      completedCount = commitmentCount > 0 ? commitmentCount : getDayCompletedCount(cellDate);
    } else {
      completedCount = getDayCompletedCount(cellDate);
    }

    // Dynamic Calendar Highlight Tiers:
    // 8+ -> bright white-blue
    // 6-7 -> bright orange
    // 5 -> green
    if (completedCount >= 8) {
      classes += "tier-white-blue ";
    } else if (completedCount >= 6) {
      classes += "tier-orange ";
    } else if (completedCount >= 5) {
      classes += "tier-green ";
    }

    const currentLoggedInUser = Habitism.getCurrentUser();
    const isUserAdmin = currentLoggedInUser && currentLoggedInUser.role === 'admin';

    if (isUserAdmin) {
      html += `<td class="${classes} admin-editable" onclick="toggleCalendarDay('${cellDate}')" title="${cellDate} (${completedCount} habits - click to toggle as admin)">${day}</td>`;
    } else {
      html += `<td class="${classes} calendar-cell-readonly" onclick="handleReadOnlyCalendarClick('${cellDate}')" title="${cellDate} (${completedCount} habits)">${day}</td>`;
    }

    if ((day + firstDay) % 7 === 0 && day !== daysInMonth) {
      html += "</tr><tr>";
    }
  }

  html += "</tr></tbody>";
  calendar.innerHTML = html;
  updateStreak();
}

function handleReadOnlyCalendarClick(cellDate) {
  showToast("Only admins can modify calendar dates");
}

function toggleCalendarDay(cellDate) {
  const user = Habitism.getCurrentUser();
  const isAdmin = user && user.role === 'admin';
  if (!isAdmin) {
    showToast("Only admins can modify calendar dates");
    return;
  }

  const current = getDayCompletedCount(cellDate);
  let next = 0;
  if (current === 0) next = 5;       // Green
  else if (current === 5) next = 6;  // Orange
  else if (current === 6) next = 8;  // White-Blue
  else next = 0;                     // Reset

  setDayCompletedCount(cellDate, next);
  renderCalendar(currentCalendarDate);
}

function updateStreak() {
  let streak = 0;
  let today = new Date();

  for (let i = 0; i < 60; i++) {
    let checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const count = getDayCompletedCount(checkDate.toDateString());

    if (count >= 5) {
      streak++;
    } else {
      if (i === 0) continue; // Allow today in-progress
      break;
    }
  }

  const streakEl = document.getElementById("streakDisplay");
  if (streakEl) {
    streakEl.innerHTML = `🔥 Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`;
  }

  if (currentUser) {
    currentUser.streak = streak;
    Habitism.setCurrentUser(currentUser);
    updateNavbarBadges();
  initNavbarOverflowEngine();
  }
}

function prevMonth() {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar(currentCalendarDate);
}

function nextMonth() {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar(currentCalendarDate);
}

// -------------------------------------------------------------
// 📝 PART 2: CHECKLIST LOGIC (OPTION A & OPTION B, ISOLATED PER USER)
// -------------------------------------------------------------
function loadCurrentLevelIndex() {
  const saved = localStorage.getItem(userKey("active_level"));
  if (saved !== null) {
    const idx = parseInt(saved, 10);
    if (!isNaN(idx) && idx >= 0 && idx < DEVELOPER_LEVELS.length) {
      currentLevelIndex = idx;
    }
  }
}

function saveCurrentLevelIndex() {
  localStorage.setItem(userKey("active_level"), currentLevelIndex.toString());
  if (currentUser && currentUser.id && typeof Habitism.setUserStorage === 'function') {
    Habitism.setUserStorage("active_level", currentLevelIndex);
  }
}

function getActiveTasks() {
  if (activeTaskMode === "custom") {
    const saved = localStorage.getItem(userKey("custom_tasks"));
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_OPTION_A_TASKS));
  } else {
    // Option B: Presets
    const level = DEVELOPER_LEVELS[currentLevelIndex];
    const key = userKey(`tasks_lvl_${level.id}`);
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(level.tasks));
  }
}

function saveActiveTasks(tasks) {
  if (activeTaskMode === "custom") {
    localStorage.setItem(userKey("custom_tasks"), JSON.stringify(tasks));
    if (currentUser && currentUser.id && typeof Habitism.setUserStorage === 'function') {
      Habitism.setUserStorage("custom_tasks", tasks);
    }
  } else {
    const level = DEVELOPER_LEVELS[currentLevelIndex];
    localStorage.setItem(userKey(`tasks_lvl_${level.id}`), JSON.stringify(tasks));
    if (currentUser && currentUser.id && typeof Habitism.setUserStorage === 'function') {
      Habitism.setUserStorage(`tasks_lvl_${level.id}`, tasks);
    }
  }
}

function getActiveChecks() {
  const todayKey = activeTaskMode === "custom" 
    ? userKey(`custom_checks_${getTodayString()}`)
    : userKey(`checks_${DEVELOPER_LEVELS[currentLevelIndex].id}_${getTodayString()}`);

  const saved = localStorage.getItem(todayKey);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return {};
}

function saveActiveChecks(checks) {
  const levelId = DEVELOPER_LEVELS[currentLevelIndex].id;
  const today = getTodayString();
  const todayKey = activeTaskMode === "custom" 
    ? `custom_checks_${today}`
    : `checks_${levelId}_${today}`;

  localStorage.setItem(userKey(todayKey), JSON.stringify(checks));

  // Sync checkmarks to server
  if (currentUser && currentUser.id && typeof Habitism.setUserStorage === 'function') {
    Habitism.setUserStorage(todayKey, checks);
  }
}

function renderChecklist() {
  const checklistCard = document.querySelector(".checklist-card");
  if (!checklistCard) return;

  const tasks = getActiveTasks();
  const checks = getActiveChecks();
  const totalCount = tasks.length;

  // 1. DYNAMIC CONTAINER COLORING
  // 6-7 items -> bright orange
  // 8+ items -> bright white-blue
  checklistCard.classList.remove("theme-orange", "theme-white-blue");
  if (totalCount >= 8) {
    checklistCard.classList.add("theme-white-blue");
  } else if (totalCount >= 6) {
    checklistCard.classList.add("theme-orange");
  }

  // 2. Render Header
  const levelBadgeEl = document.getElementById("levelBadge");
  const levelNameEl = document.getElementById("levelNameText");
  const levelInfoWrap = document.getElementById("levelInfoWrap");
  const prevBtn = document.getElementById("prevLevelBtn");
  const nextBtn = document.getElementById("nextLevelBtn");

  if (activeTaskMode === "custom") {
    if (levelBadgeEl) levelBadgeEl.innerText = "Custom";
    if (levelNameEl) levelNameEl.innerText = "My 5 Custom Habits";
    if (levelInfoWrap) {
      levelInfoWrap.innerHTML = `
        <button class="info-btn" data-info="Your personalized daily routine. Strive for 5+ habits to sustain your streak!" aria-label="Custom Tasks Info" tabindex="0">i</button>
      `;
    }
    if (prevBtn) prevBtn.style.visibility = "hidden";
    if (nextBtn) nextBtn.style.visibility = "hidden";
  } else {
    if (prevBtn) prevBtn.style.visibility = "visible";
    if (nextBtn) nextBtn.style.visibility = "visible";
    const level = DEVELOPER_LEVELS[currentLevelIndex];
    if (levelBadgeEl) levelBadgeEl.innerText = `Lv. ${level.id}`;
    if (levelNameEl) levelNameEl.innerText = level.title.replace(/^Level \d+:\s*/, "");
    if (levelInfoWrap) {
      if (level.info) {
        levelInfoWrap.innerHTML = `
          <button class="info-btn" data-info="${escapeHtml(level.info)}" aria-label="Level Info" tabindex="0">i</button>
        `;
      } else {
        levelInfoWrap.innerHTML = "";
      }
    }
  }

  // 3. Render Task Items (Each with single unclipped info button)
  const listEl = document.getElementById("habitList");
  listEl.innerHTML = "";
  let completedToday = 0;
  const lockedIdx = getLockedIndices();

  tasks.forEach((task, index) => {
    const isCompleted = !!checks[index];
    if (isCompleted) completedToday++;
    const isLocked = isCompleted && !!lockedIdx[index];

    const li = document.createElement("li");
    li.className = `habit-item ${isCompleted ? "completed" : ""} ${isLocked ? "claimed-locked" : ""}`;
    if (isLocked) li.title = "🔒 Coins claimed — locked until tomorrow";

    let infoBtnHtml = "";
    if (task.info) {
      infoBtnHtml = `
        <button class="info-btn" data-info="${escapeHtml(task.info)}" onclick="event.stopPropagation()" aria-label="Info" tabindex="0">i</button>
      `;
    }

    li.innerHTML = `
      <div class="habit-left" onclick="toggleTask(${index})">
        <div class="custom-checkbox">
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="habit-title-wrap">
          <span class="habit-title">${escapeHtml(task.text)}</span>
          ${infoBtnHtml}
        </div>
      </div>
      <button class="delete-btn" onclick="deleteTask(event, ${index})" title="${isLocked ? 'Locked until tomorrow' : 'Remove task'}">${isLocked ? '🔒' : '&times;'}</button>
    `;

    listEl.appendChild(li);
  });

  // 4. Update Progress Bar
  const percent = totalCount > 0 ? Math.round((completedToday / totalCount) * 100) : 0;
  const progressText = document.getElementById("progressText");
  const progressBarFill = document.getElementById("progressBarFill");

  if (progressText) {
    progressText.innerText = `${completedToday}/${totalCount} Done (${percent}%)`;
  }
  if (progressBarFill) {
    progressBarFill.style.width = `${percent}%`;
  }

  // Update Restore Default List button state (locked if coins were claimed on this list today)
  const resetListBtn = document.getElementById("resetListBtn");
  const resetListBtnIcon = document.getElementById("resetListBtnIcon");
  const hasAnyLockedOnList = Object.keys(lockedIdx).some(idx => lockedIdx[idx]);
  if (resetListBtn) {
    if (hasAnyLockedOnList) {
      resetListBtn.classList.add("locked");
      if (resetListBtnIcon) resetListBtnIcon.innerText = "🔒";
      resetListBtn.title = "🔒 Coins claimed on this list today — default habits can be restored tomorrow";
    } else {
      resetListBtn.classList.remove("locked");
      if (resetListBtnIcon) resetListBtnIcon.innerText = "🔄";
      const targetLabel = activeTaskMode === "custom"
        ? "Custom list"
        : `Level ${DEVELOPER_LEVELS[currentLevelIndex].id}`;
      resetListBtn.title = `Restore original default habits for ${targetLabel}`;
    }
  }

  // 5. Dynamic Checkbox Coloring:
  // 6-7 checked boxes -> bright orange checks
  // 8+ checked boxes -> bright white-blue checks
  // 1-5 checked boxes -> green checks
  checklistCard.classList.remove("checks-orange", "checks-white-blue");
  if (completedToday >= 8) {
    checklistCard.classList.add("checks-white-blue");
  } else if (completedToday >= 6) {
    checklistCard.classList.add("checks-orange");
  }

  // 6. Update Calendar Tier for Today (preserve committed/saved check count when browsing other levels)
  const todayStr = getTodayString();
  const commitmentCount = getCommitmentGlowCount();
  const savedTodayChecksCount = getSavedChecksCompletedCountForDate(todayStr);
  const effectiveCompletedToday = commitmentCount > 0
    ? commitmentCount
    : Math.max(completedToday, savedTodayChecksCount);

  setDayCompletedCount(todayStr, effectiveCompletedToday);
  updateCommitmentUI();
  renderCalendar(currentCalendarDate);
}

// -------------------------------------------------------------
// 🔒 CLAIM LOCK: checks counted in a piggybank claim stay checked until tomorrow
// -------------------------------------------------------------
function getClaimLockKey() {
  return `claim_lock_${getTodayString()}`;
}

function getClaimLock() {
  const saved = localStorage.getItem(userKey(getClaimLockKey()));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
  }
  return {};
}

function saveClaimLock(lock) {
  localStorage.setItem(userKey(getClaimLockKey()), JSON.stringify(lock));
  try {
    if (currentUser && currentUser.id && typeof Habitism.setUserStorage === 'function') {
      const p = Habitism.setUserStorage(getClaimLockKey(), lock);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  } catch (e) {}
}

function getActiveListLockId() {
  return activeTaskMode === "custom" ? "custom" : String(DEVELOPER_LEVELS[currentLevelIndex].id);
}

function getLockedIndices() {
  return getClaimLock()[getActiveListLockId()] || {};
}

// Snapshot every currently-checked box (all levels + custom list) as locked for today
function lockClaimedChecks() {
  const today = getTodayString();
  const lock = getClaimLock();

  const addFrom = (listId, storageKey) => {
    const raw = localStorage.getItem(userKey(storageKey));
    if (!raw) return;
    try {
      const checks = JSON.parse(raw);
      Object.keys(checks).forEach(idx => {
        if (checks[idx]) {
          lock[listId] = lock[listId] || {};
          lock[listId][idx] = true;
        }
      });
    } catch (e) {}
  };

  DEVELOPER_LEVELS.forEach(level => addFrom(String(level.id), `checks_${level.id}_${today}`));
  addFrom("custom", `custom_checks_${today}`);

  saveClaimLock(lock);
}

function toggleTask(index) {
  const checks = getActiveChecks();
  const wasCompleted = !!checks[index];

  // Claimed checks cannot be unchecked until the next day (prevents unlimited coin farming)
  if (wasCompleted && getLockedIndices()[index]) {
    showToast("🔒 Coins already claimed — this habit stays checked until tomorrow.");
    return;
  }

  checks[index] = !wasCompleted;
  saveActiveChecks(checks);

  // Piggybank logic: +10 on check, -10 on uncheck (no double-counting)
  const currentUser = Habitism.getCurrentUser();
  if (currentUser && currentUser.id) {
    if (!wasCompleted) {
      // Checked: add 10 to piggybank
      const newPiggy = (currentUser.piggybank_coins || 0) + 10;
      currentUser.piggybank_coins = newPiggy;
      Habitism.setCurrentUser(currentUser);
      Habitism.syncPiggybank(currentUser.id, newPiggy).catch(() => {});
      showToast("✨ Habit completed! +10 Habit Coins 🪙 (Piggybank)");
    } else {
      // Unchecked: deduct 10 from piggybank
      const currentPiggybank = currentUser.piggybank_coins || 0;
      const newPiggybank = Math.max(0, currentPiggybank - 10);
      currentUser.piggybank_coins = newPiggybank;
      Habitism.setCurrentUser(currentUser);
      Habitism.syncPiggybank(currentUser.id, newPiggybank).catch(() => {});
      showToast("➖ Habit unchecked! -10 Habit Coins from piggybank.");
    }
    updateNavbarBadges();
    updatePiggybankDisplay();
  }

  renderChecklist();
  renderCalendar(currentCalendarDate);
}

// ============================================================================
// 🛡️ REAL-WORD HABIT INPUT VALIDATOR (ENGLISH + TAGALOG + TAGLISH)
// ============================================================================
const HABIT_FUNCTION_WORDS = new Set([
  // English function words, prepositions, pronouns, auxiliaries, articles, conjunctions
  "a", "an", "the", "to", "for", "of", "in", "on", "at", "by", "with", "from", "into", "onto",
  "upon", "out", "up", "down", "off", "over", "under", "again", "further", "then", "once",
  "and", "or", "but", "nor", "so", "yet", "as", "if", "when", "while", "before", "after",
  "until", "till", "since", "during", "through", "without", "within", "between", "among",
  "around", "about", "against", "along", "across", "behind", "beyond", "near", "beside",
  "besides", "toward", "towards", "throughout", "per", "via", "than", "whether",
  "my", "your", "yours", "our", "ours", "their", "theirs", "his", "her", "hers", "its",
  "me", "you", "us", "them", "him", "it", "myself", "yourself", "himself", "herself",
  "itself", "ourselves", "themselves", "who", "whom", "whose", "which", "what", "where",
  "why", "how", "this", "that", "these", "those", "some", "any", "each", "every", "either",
  "neither", "both", "all", "half", "several", "many", "much", "few", "little", "other",
  "another", "such", "no", "not", "none", "nothing", "nobody", "nowhere", "never",
  "always", "often", "sometimes", "usually", "rarely", "seldom", "ever", "also", "too",
  "very", "quite", "rather", "almost", "nearly", "just", "only", "even", "still", "already",
  "soon", "now", "here", "there", "everywhere", "somewhere", "anywhere",
  "someone", "anyone", "everyone", "somebody", "anybody", "everybody", "something",
  "anything", "everything", "one", "ones", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "eleven", "twelve", "fifteen", "twenty", "thirty", "forty",
  "fifty", "sixty", "hundred", "first", "second", "third", "fourth", "fifth",
  "be", "am", "is", "are", "was", "were", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "done",
  "will", "would", "shall", "should", "can", "could", "may", "might", "must", "ought",
  "dont", "doesn", "doesnt", "didnt", "wont", "wouldnt", "cant", "cannot", "couldnt",
  "shouldnt", "isnt", "arent", "wasnt", "werent", "hasnt", "havent", "hadnt", "im", "ive",
  "ill", "youre", "youve", "youll", "weve", "theyre", "thats", "whats", "lets",
  "more", "most", "less", "least", "own", "same", "else",

  // Tagalog function words, markers, pronouns, enclitics, conjunctions, numbers
  "ang", "ng", "mga", "sa", "na", "pa", "ba", "po", "opo", "ho", "oho",
  "din", "rin", "daw", "raw", "lang", "lamang", "man", "muna", "naman", "nga", "pala",
  "sana", "kaya", "kasi", "dahil", "upang", "para", "kung", "kapag", "pag", "habang",
  "bago", "matapos", "pagkatapos", "tuwing", "kada", "bawat", "lahat", "ibang", "iba",
  "isang", "isa", "dalawa", "dalawang", "tatlo", "tatlong", "apat", "limang", "lima",
  "anim", "pito", "pitong", "walo", "walong", "siyam", "sampu", "sampung",
  "ako", "ikaw", "ka", "siya", "kami", "tayo", "kayo", "sila",
  "ko", "mo", "niya", "namin", "natin", "ninyo", "nila",
  "akin", "aking", "iyo", "iyong", "kanya", "kanyang", "amin", "aming", "atin", "ating",
  "kanila", "kanilang", "ito", "itong", "iyan", "iyang", "iyon", "ire",
  "dito", "diyan", "doon", "rito", "riyan", "roon", "ganito", "ganyan", "ganoon", "ganon",
  "si", "sina", "ni", "nina", "kay", "kina", "may", "mayroon", "meron", "wala", "walang",
  "huwag", "wag", "hindi", "di", "oo", "at", "o", "pero", "ngunit", "subalit", "datapwat",
  "kundi", "kundiman", "kahit", "maski", "maging", "pati", "bukod", "maliban", "ayon",
  "ukol", "tungkol", "hinggil", "laban", "kontra", "mula", "hanggang", "nang", "noong",
  "nasa", "yata", "tulad", "parang", "gaya", "kaysa", "mas", "pinaka", "napaka",
  "sobra", "sobrang", "ubod", "ay",

  // Common measurement & time units & particles
  "min", "mins", "sec", "secs", "hr", "hrs", "am", "pm", "km", "kg", "lbs", "lb", "ml",
  "oz", "reps", "rep", "sets", "x", "st", "nd", "rd", "th", "mg", "cal", "kcal", "ups", "downs",
  "tv", "pc", "fb", "ig", "id", "ok"
]);

const HABIT_ENGLISH_WORDS_RAW = `
  abandon ability able abroad absorb abstract academic accept access accident accompany accomplish
  accord account accurate achieve achievement acid acquire across act action active activity actor
  actual adapt add addition additional address adequate adjust adjustment admire admit
  adopt adult advance advanced advantage adventure advertise advice advise aerobic affair affect
  afford afraid afternoon age agency agenda agent aggressive ago agree agreement agriculture
  ahead aid aim air airplane airport alarm album alcohol alert alien align alike alive allow
  allowance ally alone along aloud alphabet already alter alternative although altitude
  aluminum amateur amaze amazing ambition ambitious ambulance amend amount ample amplify
  amuse analyze analysis ancient anger angle angry animal ankle announce annual answer
  anticipate anxiety anxious apart apartment apologize apology app appeal appear appearance
  appetite apple application apply appoint appointment appreciate appreciation approach appropriate
  approval approve april area arena argue argument arise arm armed armor army arrange
  arrangement arrest arrival arrive arrow art article artificial artist artistic ash aside ask
  asleep aspect aspire assault assemble assembly assert assess assessment asset assign assignment
  assist assistance assistant associate association assume assumption assure asthma athlete
  athletic atmosphere attach attack attain attempt attend attendance attention attitude attorney
  attract attraction attractive attribute auction audience audio audiobook audit august aunt
  author authority auto automatic autumn available avenue average avoid awake award aware
  awareness away awesome awful awkward
  baby back background backpack backward bacon bacteria bad badge badminton bag bake baker
  balance balcony bald ball ballet balloon ballot banana band bandage bank banner bar barbecue
  barbell barber bare barely bargain bark barn barrel barrier base baseball basic basically
  basin basis basket basketball bass bat batch bath bathe bathroom battery battle beach bean
  bear beard beast beat beautiful beauty became become bed bedroom bee beef beer
  beg begin beginning behalf behave behavior being belief believe bell belly belong below
  belt bench bend beneath benefit berry best bet better beverage bible bicycle
  bid big bike bill billion bin bind bio biology bird birth birthday biscuit bit bite bitter
  black blade blame blank blanket blast bleed blend bless blessing blind blink block blond
  blood bloom blossom blow blue blueberry board boat body boil bold bolt bomb bond bone
  bonus book bookcase bookmark boost boot border bore bored boring born borrow boss bother
  bottle bottom bounce bound boundary bowl box boxing boy boyfriend brain brake branch
  brand brave bread break breakfast breast breath breathe breathing breed breeze brick bridge
  brief briefly bright brighten brilliant bring brisk broad broadcast broccoli broken broker
  bronze broom brother brown brush bubble bucket buddy budget build building bulb bulk bullet
  bunch bundle bunk burden bureau burn burst bury bus bush business busy butter butterfly
  button buy buyer buzz
  cab cabin cabinet cable cacao cactus cafe cafeteria cage cake calcium calculate calculation
  calculus calendar calf call calm calorie cam camera camp campaign campus canal cancel
  cancer candidate candle candy cane canvas cap capability capable capacity capital captain
  capture car carb carbohydrate carbon card cardigan cardio care career careful carefully
  careless cargo carpet carriage carrot carry cart cartoon carve case cash cashew casino cast
  castle casual cat catalog catch category cater cathedral cattle cause caution cautious cave
  cease ceiling celebrate celebration celery cell cellphone cement center central century
  cereal ceremony certain certainly certificate chain chair chairman challenge chamber chamomile
  champion championship chance change channel chaos chapter character characteristic charge
  charity charm chart chase chat cheap cheat check checklist cheek cheer cheerful cheese chef
  chemical chemistry cherry chess chest chew chicken chief child childhood chill chilly chin
  chip chocolate choice choir choose chop chore chorus christian christmas church cigarette
  cinema circle circuit circulate circumstance cite citizen city civil claim clap clarify
  clarity clash class classic classical classroom clause clay clean cleaner cleaning clear
  clearly clerk click client cliff climate climb cling clinic clinical clip clock clone close
  closely closet cloth clothes clothing cloud cloudy club clue cluster coach coal coast coat
  cockroach cocoa coconut code coding coffee coin cold collar colleague collect collection
  college color colorful column combine combination comfort comfortable comic command comment
  commercial commission commit commitment committee common commonly communicate communication
  community companion company compare comparison compete competition competitive compile
  complain complaint complete completely complex complexity compliment component compose
  composition compound comprehensive compress comprise compromise computer concentrate
  concentration concept concern concert conclude conclusion concrete condition conduct
  conference confess confidence confident confirm conflict confront confuse confusion congress
  connect connection conscious consciousness consensus consent consequence conservative
  consider considerable consideration consist consistent console constant constantly
  constitute constitution construct construction consult consultant consume consumer
  consumption contact contain container contemplate contemporary content contest context
  continent continue continuous contract contrast contribute contribution control convenient
  convention conversation convert convince cook cooker cookie cooking cool cooperate
  cooperation coordinate cop cope copy cord core corn corner corporate corporation correct
  correctly correlation correspond corridor cost costume cottage cotton couch cough
  council count counter country county couple courage course court cousin cover coverage cow
  coworker crack craft cram crane crash crawl crazy cream create creation creative creativity
  creature credit crew cricket crime criminal crisis criteria critic critical criticism
  criticize crop cross crossfit crowd crucial cruel cruise crush cry crystal cube cucumber
  cue cultivate culture cup cupboard curb cure curiosity curious curl currency current
  currently curriculum curry curtain curve cushion custom customer cut cute cycle cycling
  dad daddy daily dairy damage damp dance dancer dancing danger dangerous dare dark darkness
  data database date daughter dawn day dead deadline deadlift deal dealer dear death debate
  debt decade decay december decide decision deck declare decline decorate decrease
  dedicate deep deeply deer defeat defend defense deficit define definitely definition degree
  delay delegate delete deliberate delicate delicious delight deliver delivery demand
  democracy demonstrate dental dentist deny depart department departure depend dependent
  deposit depress depressed depression depth derive describe description desert deserve
  design designer desire desk desktop despair dessert destination destroy destruction
  detail detailed detect detective determine develop developer development device devote
  devotion devotional diabetes diagnose diagram dial dialogue diamond diary dice
  dictionary die diet differ difference different differently difficult difficulty dig
  digital dignity dilemma dimension dine dining dinner dip direct direction directly director
  dirt dirty disable disagree disappear disappoint disaster disc discipline disclose
  discount discover discovery discuss discussion disease dish dishwasher disk dismiss
  disorder display dispute dissolve distance distant distinct distinction distinguish
  distract distracted distraction distribute distribution district disturb dive diverse
  diversity divide division divorce dizzy dna do doctor document documentary dog doll dollar
  dolphin domain domestic dominate donate donation donut doomscroll door doorway dorm
  dose dot double doubt dough dove down download downstairs downtown dozen draft drag dragon
  drain drama dramatic draw drawer drawing dream dress dried drift drill drink drinking drip
  drive driver driveway driving drop drought drown drug drum dry dryer dual duck due dull
  dumbbell dump duolingo dust duty dvd dynamic
  eager ear early earn earth ease easily east eastern easy eat eating echo ecology
  economic economics economy edge edit edition editor educate education educational effect
  effective effectively efficiency efficient effort egg eight eighteen eighth eighty
  elbow elder elderly elect election electric electrical electricity electronic element
  elementary elephant elevate elevator eleven eliminate elite email embarrass
  embrace emerge emergency emotion emotional emphasis emphasize employ employee employer
  employment empty enable encounter encourage encouragement end endless endorse enemy energy
  enforce engage engagement engine engineer engineering english enhance enjoy enjoyable
  enjoyment enormous enough enroll ensure enter enterprise entertain entertainment enthusiasm
  enthusiastic entire entirely entrance entry envelope environment environmental episode
  equal equally equipment era erase error escape especially essay essential essentially
  establish establishment estate estimate eternal ethics ethnic euro evaluate evaluation
  even evening event eventually everyday evidence evident evil evolution evolve exact exactly
  exam examination examine example exceed excellent except exception exchange excite excited
  excitement exciting exclude exclusive excuse execute exercise exhaust exhausted exhibit
  exhibition exist existence existing exit expand expansion expect expectation expense
  expensive experience experienced experiment expert explain explanation explicit explode
  explore explosion export expose exposure express expression extend extension extensive
  extent external extra extraordinary extreme extremely eye eyebrow eyelash eyesight
  fabric face facial facilitate facility fact factor factory faculty fade fail failure faint
  fair fairly fairy faith faithful fall false fame familiar family famous fan fancy fantastic
  fantasy far fare farm farmer farming fashion fast fasten faster fasting fat fatal father
  fatigue fault favor favorable favorite fear feather feature february federal fee feed
  feedback feel feeling fellow female fence festival fetch fever fiber fiction field
  fifteen fifth fifty fig fight fighter fighting figure file fill film filter final finally
  finance financial find finding fine finger finish fire firm firmly first fiscal fish
  fishing fist fit fitness five fix fixed flag flame flash flat flavor flaw flee fleet flesh
  flex flexibility flexible flight flip float flock flood floor flour flow flower flu fluid
  flush flute fly flying foam focus fold folder follow following fond food fool foot
  football footprint forbid force forecast forehead foreign forest forever forget forgive
  forgiveness fork form formal format formation former formula forth fortunate fortunately
  fortune forty forward fossil foster found foundation founder four fourteen fourth fraction
  fragile fragment frame framework franchise frank frankly fraud free freedom freely freeze
  freezer french frequency frequent frequently fresh freshman friction fridge friend friendly
  friendship fright frighten frog front frost fruit frustrate frustration fry fuel full fully
  fun function fund fundamental funding funeral funny fur furniture future
  gain galaxy gallery gallon game gaming gap garage garbage garden gardener gardening garlic
  garment gas gate gather gauge gaze gear gene general generally generate generation generous
  genetic genius genre gentle gently genuine geography geometry german gesture get ghost
  giant gift gifted ginger girl girlfriend give given glad glance glass glasses glide global
  globe glory glove glow glue goal goat god gold golden golf good goodbye goodness goods
  gorgeous gospel gossip govern government governor grab grace grade gradually graduate
  graduation grain gram grammar grand grandchild grandfather grandmother grandparent grant
  grape graph grasp grass grateful gratitude grave gravel gravity gray graze grease great
  greatest greatly green greens grocery greet greeting grief grill grin grind grip
  groom gross ground group grow growing growth guarantee guard guess guest guide guideline
  guilt guilty guitar gulf gum gun gut guy gym gymnastics
  habit habitat hair haircut half hall hallway ham hamburger hammer hammock hand handbag
  handful handle handsome hang happen happily happiness happy harbor hard hardly hardware
  harm harmful harmony harvest hat hatch hate haul hawk hay hazard head headache
  headline headphones heal health healthy hear hearing heart heat heater heaven heavy
  heel height helicopter hell hello helmet help helpful helpless hem herb herd
  heritage hero hesitate hide high highlight highly highway hike hiking hill
  hint hip hire historian historic historical history hit hobby hockey hold holder hole
  holiday hollow holy home homeland homeless homework honest honestly honey honor hook hope
  hopeful hopefully horizon horizontal horn horrible horror horse hospital host hot hotel
  hour hourly house household houseplant housework housing hover hug huge human
  humanity humble humid humidity humor hundred hunger hungry hunt hunter hunting hurricane
  hurry hurt husband hydrate hydration hydrogen hygiene hymn
  ice icon idea ideal identify identity idiom idle ignore ill illegal illness illustrate
  image imagination imagine immediate immediately immense immigrant immune impact implement
  implication imply import importance important impose impossible impress impression
  impressive improve improvement impulse inch incident include including income
  incorporate increase increasingly incredible indeed independence independent index
  indicate indication indicator individual industrial industry inevitable infant infect
  infection inflation influence inform informal information ingredient inhabit initial
  initially initiative injury ink inner innocent input inquire inquiry insect insert inside
  insight insist inspect inspection inspire install instance instant instantly instead
  instinct institute institution instruct instruction instructor instrument insurance
  intact integrate integration integrity intellectual intelligence intelligent intend
  intense intensity intent intention interact interaction interest interested interesting
  interior internal international internet interpret interpretation interrupt interval
  intervention interview intimate introduce introduction invade invention invest
  investigate investigation investment investor invite involve involved involvement iron
  irony island isolate isolation issue item ivory
  jacket jam january jar jaw jazz jeans jelly jet jewel jewelry job jog jogging join
  joint joke journal journaling journey joy judge judgment juice jump jumping june jungle
  junior junk jury just justice justify
  kale karate keen keep keeper kettle key keyboard kick kid kidney kill kind kindergarten
  kindly kindness king kingdom kiss kit kitchen kite knee kneel knife knit knock knot know
  knowledge korean
  lab label labor laboratory lack ladder lady lake lamb lamp land landing landscape lane
  language lap laptop large largely laser last late lately later latin latter laugh laughter
  launch laundry lava law lawn lawsuit lawyer lay layer lead leader leadership leading leaf
  league lean leap learn learning lease least leather leave lecture led left leg legacy
  legal legend lemon lend length lens lentil leopard lesson let letter lettuce level
  liability liberal liberty library license lid lie life lifestyle lift lifting light
  lighting lightly lightning like likely likewise limb lime limit limitation limited line
  linen link lion lip liquid list listen listener listening liter literature litter little
  live lively liver living load loaf loan lobby local locate location lock locker lodge log
  logic logical lonely long look loop loose lose loss lost lot lotion loud loudly love
  lovely lover low lower loyal loyalty luck lucky luggage lumber lunch lung lunge luxury
  lyric
  machine machinery mad magazine magic magnet magnificent maid mail main mainly maintain
  maintenance major majority make maker makeup male mall mama mammal man manage management
  manager mandarin mandate mandatory mango manifest manipulate manner manual manufacture
  manufacturer map marathon marble march margin mark marker market marketing marriage
  married marry mask mass massive master mat match matcha mate material math mathematics
  matrix matter mature maximum maybe mayor meal mean meaning meaningful meantime
  meanwhile measure measurement meat mechanic mechanical mechanism medal media medical
  medication medicine meditate meditation medium meet meeting melon melt member membership
  memorize memory mental mentally mention mentor menu merchant mercy mere merely merge
  merit mess message messy metal meter method metro mexican mice micro microwave middle
  midnight mighty mild military milk mill million mind mindful mindfulness mine
  mineral minimal minimize minimum minister ministry minor minority mint minute miracle
  mirror miss missile mission mistake mix mixture mobile mode model moderate modern
  modest modify mom moment momentum monday money monitor monkey monster month monthly mood
  moon mop moral moreover morning mortgage mostly mother motion motivate motivation
  motive motor mount mountain mouse mouth move movement movie moving mow mud muffin
  mug multiple multiply muscle museum mushroom music musical musician muslim mustard
  mutual mute mystery myth
  nail naked name namely nap napkin narrate narrative narrow nation national native natural
  naturally nature navy near nearby nearly neat neatly necessary neck necklace need needle
  negative negotiate neighbor neighborhood nerve nervous nest net network neutral
  nevertheless new newly news newspaper next nice nicely night nightmare nine
  nineteen ninety ninth noble nod noise noisy nominal nonetheless noon
  normal normally north northern nose note notebook notice notification notifications notify notion novel
  november nowadays nuclear nude number numerous nurse nursery nut nutrition
  oat oatmeal oats obey object objective obligation observation observe observer obstacle
  obtain obvious obviously occasion occasional occasionally occupy occur ocean october odd
  odds offense offensive offer office officer official oil ok okay old olive
  olympic omelet omit ongoing onion online open opening openly opera
  operate operation operator opinion opponent opportunity oppose opposite opposition opt
  optical optimism optimistic option orange orbit order ordinary organ organic
  organization organize organized orientation origin original originally
  ounce outcome outdoor outdoors outer outfit outlet outline
  output outside outstanding oven overall overcome overhead overlap overlook overnight
  overseas overwhelm owe own owner ownership oxygen oyster
  pace pack package packet pad paddle page pain painful paint painter painting pair palace
  pale palm pan pancake panda panel panic pants papa papaya paper paragraph parallel
  parcel parent park parking parliament part partial partially participant participate
  participation particle particular particularly partly partner partnership party pass
  passage passenger passion pasta paste pastry pat patch path patience patient patio
  pattern pause pave paw pay payment peace peaceful peach peak peanut pear pearl peasant
  peculiar pedal peel peer pen penalty pencil pending penetrate penny people pepper
  perceive percentage perception perfect perfectly perform performance perfume perhaps
  period permanent permission permit person personal personality personally personnel
  perspective persuade pet petal phase phenomenon philosophy phone photo photograph
  photographer photography phrase physical physically physician physics piano pick pickle
  picnic picture pie piece pig pigeon pile pill pillow pilot pin pineapple pink pint
  pioneer pipe pitch pitcher pizza place placement plain plan plane planet plank planner
  planning plant plastic plate platform play player playground playing plea plead pleasant
  please pleasure pledge plenty plot plug plum plumber plunge plus pocket podcast poem
  poet poetry point pointer poison poke pole police policy polish polite political
  politician politics poll pollution polo pomodoro pond pool poor pop popular population
  porch pork port portion portrait pose position positive possess possession possibility
  possible possibly post postage poster posture pot potato potential potentially pouch
  poultry pound pour powder power powerful practical practice practicing praise pray
  prayer preach precaution precede precious precise precisely predict prediction prefer
  preference pregnancy pregnant premise premium preparation prepare prepared prescription
  presence present presentation preserve president press pressure pretend pretty prevent
  prevention previous previously price pride priest primarily primary prime primitive
  prince princess principal principle print printer prior priority prison prisoner privacy
  private prize pro probable probably probiotic problem procedure proceed process
  processing produce producer product production productive productivity profession
  professional professor profile profit program programmer programming progress
  progressive prohibit project prominent promise promote promotion prompt proof proper
  properly property proportion proposal propose prosecute prospect protect protection
  protein protest proud prove provide provider province provision provoke psychological
  psychology public publication publicly publish publisher pull pullup pullups pulse pump
  pumpkin punch punish punishment pupil purchase pure purple purpose pursue push pushup
  pushups put puzzle python
  qualify quality quantity quarter queen question quick quickly quiet quietly quilt quit
  quite quiz quote quran
  rabbit race racial rack radar radiation radio rail railroad rain rainbow rainy raise
  raisin rake rally ram ranch random range rank rapid rapidly rare rarely raspberry rat
  rate rating ratio rational raw reach react reaction read reader reading ready
  real realistic reality realize really realm rear reason reasonable rebuild recall
  receipt receive receiver recent recently reception recipe recognition recognize
  recommend recommendation record recording recover recovery recruit red reduce reduction
  refer reference reflect reflection reform refrigerator refuge refuse regain regard
  regarding regardless regime region regional register registration regular regularly
  regulate regulation reinforce reject relate relation relationship relative relatively
  relax relaxation release relevant relief relieve religion religious rely remain
  remaining remark remarkable remember remind reminder remote removal remove render
  renew rent repair repeat repeatedly replace replacement reply report reporter
  represent representation representative republic reputation request require
  requirement rescue research researcher resemble reservation reserve resident
  residential resign resist resistance resolution resolve resort resource respect
  respective respectively respond response responsibility responsible rest restaurant
  restore restrict restriction result resume retail retain retire retirement retreat
  return reveal revenue reverse review revise revision revive reward rhythm rib
  ribbon rice rich rid ride rider ridge rifle right rim ring rinse riot rip ripe rise
  risk risky ritual rival river road roast robe robot rock rocket rod role roll roller
  roman romance romantic roof room roommate root rope rosary rose rough roughly
  round route routine row royal rub rubber rubbish rug ruin rule ruler rumble run
  runner running rural rush russian rust
  sack sacred sad saddle safe safely safety sail sailor salad salary sale salmon salt
  salty sample sand sandwich sandy sanity sanitize satisfaction satisfy saturday
  sauce saucer sausage save saving savings saw say scale scan scandal scare scared
  scarf scary scatter scenario scene scenery schedule scheme scholar scholarship school
  science scientific scientist scissors scoop scope score scramble scratch scream screen
  screw script scripture scrub sculpture sea seal search season seat second secondary
  secret secretary section sector secure security see seed seek seem segment seize
  select selection self selfish sell seller semester seminar senate senator send senior
  sensation sense sensitive sentence separate sequence series serious seriously servant
  serve server service session set setting settle settlement seven seventeen seventh
  seventy severe sew shade shadow shake shallow shame shampoo shape share
  shark sharp shave shed sheep sheet shelf shell shelter shift shine shiny ship
  shirt shock shoe shoot shooting shop shopping shore short shortage shortly shorts
  shot shoulder shout shove show shower shrimp shrink shrug shut shuttle shy
  sibling sick side sidewalk sigh sight sign signal signature significance significant
  significantly silence silent silk silly silver similar similarly simple simply sin
  sincere sing singer singing single sink sip sir sister sit site situation
  six sixteen sixth sixty size skate skating sketch ski skill skilled skin skincare
  skip skirt skull sky slam slap slave sleep sleeping sleepy sleeve slice slide slight
  slightly slim slip slipper slope slow slowly small smart smash smell smile smoke
  smoking smooth smoothie snack snake snap sneak sneeze snow soak soap soccer social
  society sock soda sofa soft soften software soil solar soldier sole solely solid
  solution solve son song sore sorrow sorry sort soul sound soup sour source south
  southern space spanish spare spark speak speaker speaking special specialist species
  specific specifically specify specimen spectacle speech speed spell spelling spend
  spending sphere spice spicy spider spill spin spinach spine spirit spiritual spit
  spite splash split spoil spoken spokesman sponge sponsor spoon sport sports spot
  spouse spray spread spring sprinkle sprint squad square squash squat squats squeeze
  squid stability stable stack stadium staff stage stain stair stairs stake stale
  stalk stall stamp stand standard standing star stare start starter starve state
  statement station statistic status statue stay steady steak steal steam steel steep
  steer stem step stereo stick sticker sticky stiff stimulate stir stitch stock
  stomach stone stool stop storage store storm story stove straight strain strange
  stranger strap straw strawberry streak stream street strength strengthen stress
  stressful stretch stretching strict strictly stride strike string strip stroke
  strong strongly structure struggle student studio study studying stuff stumble
  stupid style subject submit subsequent substance substantial substitute subtle
  suburb succeed success successful successfully suck sudden suddenly suffer
  sufficient sugar suggest suggestion suit suitable suite sulfur sum summary summer
  summit sun sunday sunflower sunglasses sunlight sunny sunrise sunset sunshine super
  supermarket supper supplement supply support supporter suppose supposed supreme
  sure surely surface surgeon surgery surprise surprised surprising surprisingly
  surround surrounding survey survival survive survivor suspect suspend sustain
  sustainable swallow swamp swan swap swear sweat sweater sweep sweet swell swim
  swimmer swimming swing switch sword symbol sympathy symptom syndrome syrup system
  table tablespoon tablet tabletop tackle taco tactic tag tail tailor take tale talent
  talk talking tall tame tan tank tap tape target task taste tasty tax taxi tea teach
  teacher teaching team tear teaspoon technical technique technology teen teenager
  teeth telephone telescope television tell temperature temple temporary tempt ten
  tend tendency tender tennis tent term terminal terrible territory terror
  test testify testimony testing text textbook texture thank thankful thanks
  theater theme theory therapy thick thigh thin thing think thinking thirst thirsty
  thirteen thirty thorough thoroughly thought thousand thread threat threaten
  throat throne throw thumb thunder thursday tick ticket
  tide tidy tie tiger tight tightly tile tilt timber time timer timetable timid
  tin tiny tip tire tired tissue title toast tobacco today toe together toilet token
  tomato tomorrow tone tongue tonight tool tooth toothbrush toothpaste top topic
  torch tornado total totally touch tough tour tourist tournament tow
  towel tower town toy trace track trade tradition traditional traffic tragedy trail
  train trainer training trait transfer transform transformation transition translate
  translation transport transportation trap trash travel traveler tray treasure treat
  treatment treaty tree tremendous trend trial tribe trick trigger trim trip triumph
  troop tropical trouble truck true truly trunk trust truth try tub tube tuck tuesday
  tug tulip tumble tuna tune tunnel turkey turn turtle tutor tv twelve twentieth
  twenty twice twin twist two type typical typically
  ugly ukulele ultimate ultimately umbrella unable uncle undergo understand
  understanding undertake underwear undo unemployment unexpected unfair unfold
  unfortunate unfortunately uniform union unique unit unite united universe
  university unknown unless unlike unlikely unload unlock unusual update
  upgrade upper upset upside upstairs urban urge urgent usage use used
  useful user usual usually utility utilize
  vacant vacation vaccine vacuum valid valley valuable value van vanilla vanish
  vapor variable variation variety various vary vase vast vegetable vegetables
  vegetarian vehicle vein velocity velvet vendor venture verb verbal verify version
  versus vertical vessel vet veteran vibrant vice victim victory video
  view viewer village villain vinegar violate violation violence violent violin
  virtual virtue virus visible vision visit visitor visual vital vitamin vitamins
  vivid vocabulary vocal voice volume voluntary volunteer vote voter vulnerable
  wage wagon waist wait waiter wake walk walker walking wall wallet walnut wander
  want war warm warmth warn warning warrant warrior wash washer washing waste
  watch water watermelon wave wax way weak weakness wealth wealthy weapon wear
  weather weave web website wedding wednesday weed week weekend weekly weigh
  weight weightlifting welcome welfare well wellness west western wet whale
  wheat wheel wheelchair whip whisper whistle white whole wide widely
  widespread widow width wife wild wildlife willing win wind window wine
  wing winner winter wipe wire wisdom wise wish wit withdraw
  witness wolf woman women wonder wonderful wood wooden wool word work worker
  working workout workstation world worm worry worse worship worst worth worthy
  wound wrap wrist write writer writing written wrong
  yard yarn yawn yeah year yearly yeast yellow yes yesterday yield yogurt
  yoga yolk young youngster youth
  zeal zero zone zoo zumba
  plank planks deadlifts pullup pullups pushup pushups situp situps burpee burpees
  cardio hiit stretching hydrating journaling declutter decluttering mindfulness
  skincare sunscreen floss flossing mouthwash vitamins supplements probiotics
  duolingo leetcode github coursera udemy notion anki kindle spotify podcast podcasts
  audiobooks devotional rosary scripture scriptures pray praying meditate meditating
  fasting intermittent smoothie protein creatine electrolytes veggies
  chug refill unpack repack laundry dishes groceries mealprep
`;

const HABIT_TAGALOG_WORDS_RAW = `
  abot abala abang abante abiso abo abokado abre abuloy abuso adobo aga agad agahan
  agap agaw agham agimat agos agosto ahas ahit ahon akala akbay aklat akit akay
  akyat alaala alaga alagad alahas alak almusal alok alon alikabok alimango
  alimasag alipin alis alitan aliw alkansya alkansiya alma alog alpombra
  alsa ama ambag ambon amo amoy ampalaya ampon anak anay andap angat angkas angkin
  angkop anghel anghang ani anino anito anunsyo anyaya anyo apa apak aparador apat
  apaw apdo apelyido api apoy apruba aral aralin araw araro aresto arkila armas aroskaldo
  arte arukin aruga asa asahan asar asawa asin asikaso aso asukal asul atake
  atang atay ate atip atis atras atsara awa awat awit ayaw ayon ayos ayuno ayusin
  baba babad babae babag babala baboy bakal bakas bakasyon bakod bakuran basa basag
  basahan basbas base baso basta basura basurahan bata batak batas batikos bati bato
  batok batugan batya baul bawal bawang bawas bayabas bayad bayani bayarin bayaw
  baybay bayo baywang bewang benta bentilador boses bote botika ubo buhat buhay
  buhok buhos buhangin bukas bukid buklod buko bukod bukol buksan bula bulak
  bulaklak bulag bulagsak bulakbol bulate bulok bulong bulsa bumbilya bumili
  bunga bunganga bunggo bungi bungo bunot bunso buntis buntot bunyi buo buod
  burol buro busog busabos busina butas buti butiki butil buto buwan buwis
  buwisit buwaya bibliya biyernes
  daan dabog dagat dagdag dagitab dako dakip dakila dala dalaga dalampasigan
  dalandan dalanghita dalangin dalaw dalawa dalhin daliri dalisay daloy dalubhasa
  dama damag damdamin dami damit damo dampot danas dangal dapat dapa darak
  dasal dating daing dahon dahilan dahan dahas dayap dayuhan deboto
  deklara delikado demanda dentista departamento deretso desisyon detalye
  diin dikit dikta dila dilaw dilig diligan dilim dilis dinig dingding diretso
  disiplina diskarte disgrasya disenyo disyembre diyeta diyos doktor dokumento dumi
  dugo dugtong duhat dukha dula dulot dulo dumihan dungis dunong duwag duyan
  edad ehersisyo eksamen eksperimento ektarya elegante empleyado enerhiya enero
  engkanto ensayo eroplano eskinita eskoba eskwela eskuwela eskwelahan espada
  espiritu istasyon estudyante
  gabi gabay gadgad galak galang galaw galunggong galit gamit gamot gana
  ganda ganti gapang garahe garapon gasgas gastos gatang gatas gatong gawa
  gawain gawad gawin gayak gayon gayuma gasera giliw gilid ginatan ginataan
  gising gitara gitna giyera gobyerno goma goto grasya gripo grupo groseri
  guhit guho gulaman gulang gulay gulo gulong gunting guro gusali gusto
  gutom guyabano
  habag haba habilin habol hadlang hagdan hagdanan hagis hagupit
  hain haka hakbang hala halaman halaga halakhak halalan halik haligi
  halimbawa halimuyak halo halohalo halukay hamak hamog hamon hampas
  hanap hanapbuhay hanay handa handog hanga hangad hanggan hangin hango
  hapon hapunan harap hardin hari harina harang harana hasa hatak
  hati hatinggabi hatid hatol hawak hawla hayag hayop hepe hesus
  hibla higa higaan higit higop hikab hikaw hikayat hila hilaga
  hilamos hilaw hilig hilo hilot himala himas himbing himig himukin
  hina hinahon hinala hinanakit hinaharap hinga hingal hingi hinog
  hintay hinto hipon hiram hirap hirang hiwa hiwalay hiwaga hiya
  hiyas hukay hukbo hukom hugas hugasan hugis hula huli hulog hulyo humingi
  huni hurno hunyo husay husga husto huwad huwaran huwebes
  ibaba ibabaw ibayo ibig ibon idlip igib iglap ihaw ihi
  ihip ikot ilag ilalim ilan ilang ilaw ilog ilong imbento imbak
  imbitasyon imik impok ina inahin inat inay indak ingat ingay
  inggit inip inis init inom inumin insekto intindi inutil ipis
  ipon ipot irap isip isda iskedyul isla istorya itak itim
  itlog itsa iwan iwas iyak
  kaalaman kaaway kaba kababayan kabayo kabataan kabilang kabinet
  kabisado kabute kabutihan kadena kagat kagabi kagandahan kagamitan
  kagubatan kaha kahapon kahera kahilingan kahirapan kahon
  kahoy kaibigan kailangan kain kainan kaisipan kakaiba kakampi
  kakayahan kaklase kala kalabasa kalabaw kalaban kalapati kalat
  kalawang kalayaan kalbo kaldereta kaldero kalendaryo kalsada
  kalesa kaliwa kalikasan kalimot kalingkingan kalma kaloob kalooban
  kaluluwa kalungkutan kalusugan kalye kama kamag-anak kamakalawa
  kamay kamao kamatis kambal kambing kamiseta kamote kampana
  kampo kamot kampante kanal kanan kandado kandila kandungan kanin
  kanina kangkong kanta kanto kapal kapaligiran kapatid
  kapayapaan kape kapilya kapit kapitbahay kapote kapitan kapos
  kapwa karagdagan karamdaman karanasan karapatan karayom kare karera
  karne karot karpet karton kasal kasalanan kasama kasambahay
  kasangkapan kasaysayan kaserola kasintahan kaso kasoy kastila
  kasunduan katahimikan katamaran katapangan katapatan katapusan
  katarungan katas katawan katibayan katipunan katok katoliko katotohanan
  katrabaho katulad katulong katwiran kaunti konti kawali kawawa
  kaway kawayan kawikaan kayamanan kayod kayumanggi keso
  kibit kidlat kilala kilay kiliti kilo kilos kilusan kinabukasan
  kinang kinig kinis kintab kipit kisame kisap kita kitid klase
  klinika kubeta kubo kubyertos kudkod kuha kuhol kulambo kulang
  kulay kuliglig kulimlim kulisap kulog kulong kulot kultura kulungan
  kumot kumpanya kumpuni kumusta kuna kundol kuneho kunin kunit kunot
  kunsinti kupon kupas kurap kuripot kurot kurtina krus kuryente
  kusa kusina kusot kuta kutis kuto kutsara kutsarita kutsilyo
  kutsinta kutson kuwaderno kwaderno kuwarta kwarta kuwarto kwarto
  kuwelyo kuwenta kwenta kuwento kwento kuwintas kwintas kuya
  laba lababo labada labag laban labanan labanos labas
  labi labing labis labo lagari lagay lagyan lagda lagi lagim lagnat
  lagok lagot lagpak lagpas lahi lahok laing lakad lakas lakbay
  laki laktaw lala lalaki lalim lalo laman lamay lambat
  lambing lambot lamesa lamig lamok lampaso lampin lamon lana
  landas langaw langit langis langka langgam langoy lansangan
  lansones lanzones lanta lantad lantsa laon lapad lapag lapit
  lapis lapnos laro laruan larawan lasa lasing laso lata latag
  lawa lawak lawin laway layag layas layo layon layunin lechon
  leeg leche leksyon lengguwahe lente leon letsugas liban libang
  libangan libing libo libre libro lider ligaya ligaw ligid ligo
  ligpit ligtas liham lihim lihis liit likas likha liko likod
  liksi limos limot linaw lindol lingap linggo lingon
  linis linisin linta lipad lipas lipat lipunan liriko lista
  listahan litaw litrato lito liwanag liwaliw liwanagin lobo loko
  lola lolo lomi longganisa loob look lubid lubog lubos lugaw
  lugod luha luhod lukso lula luma lumot lumpia lumpo lunas
  lundag lunes lungkot lunsod lungsod lunod lunok lupa lupit
  lura lusog lusong lusot lutang lutas luto lutuan lutuin luwa luwag
  luwas luya
  maaga maalat maalinsangan maamo maanghang maasim maayos mababa
  mabagal mabait mabango mabigat mabilis mabisa mabuti madalas
  madali madaling madilim madumi maestra maestro magaan magagalitin
  maganda magaspang magastos magiliw maginaw maginoo magkano magkasama
  magkapatid magulang magulo mahal mahalaga mahaba mahina mahinhin
  mahirap mahusay maikli maingay mainam mainit mais maitim makabago
  makapal makapangyarihan makasarili makati makina makinis makipot
  makiusap malabo malaki malakas malalim malamig malambot
  malapit malapad malas malasakit malawak malaya malay malayo
  mali maligamgam maligaya maliit malikot malinaw malinis maliwanag
  malunggay malungkot malusog mama mamamayan mamaya mambabatas
  mami mana manhid mani manika manipis manok mansanas mantsa
  mantika mantikilya manugang manunulat mapa mapait mapalad mapanganib
  mapayapa maputi mapurol marami marangal maramdamin marahan marahil
  marso martes marumi marunong masakit masama masarap masaya masigasig
  masikap masinop masipag masunurin mata mataba matagal mataas
  matalim matalino matamis matanda matapang matapat matatag
  matigas matipid matiwasay matuwid mauhaw mayaman mayabang maybahay
  mayo medyas melon menudo merienda meryenda mesa miyerkules mithiin miting
  modelo monggo munggo motorsiklo mukha muli multo mumog
  mundo mungkahi mura musika mustasa muta
  nanay nars nayon negosyo ngiti ngipin ngayon nobyembre
  nguya nilaga ninong ninang ningning nipa niyog nobela nobya
  nobyo nood noo numero
  obispo obra obligado okra oktubre opisina oportunidad oras orasan
  ordinaryo organisasyon orihinal ospital otel
  paa paalam paaralan pabor paborito pabrika padala pader
  pag-asa pag-ibig pagkain pagkakataon pagkatao pagod
  pagong pahina pahinga pahintulot pahid pait pakay pakbet pakiusap
  pako pakpak paksiw pakwan palabas palabok palad palagi
  palaisdaan palaka palakpak palaman palamuti palanggana palasyo
  palatandaan palay palayok palda palengke paligid paliguan
  palikuran paligsahan palit paliwanag palo pamilya
  paminta pamasahe pambura pamahalaan pamana pamangkin pampang
  pana panahon panalangin panalo panauhin pandak pandakot pandesal
  pandikit panganib pangako pangalan panganay pangarap pangkat
  panginoon pangit pangyayari paniki panaginip paninda paniniwala
  panis pantalon pantay pantalan panulat panyo papa papaya
  papel paraan parada paraiso parangal parati pareho ugali
  parol parte partido parusa pasa pasahero pasakalye pasalamat
  pasan pasensya pasensiya pasilyo pasko paso pasok pasta
  pastol pasyal pata pataba patag patak patakaran patalim
  patani patatas patawad patay patid patis patlang patnubay
  pato patola patong patpat patuyo pawis payag payapa payat payo
  payong pebrero pechay petsay peklat pelikula pera peras perpekto
  peso pesos petsa pigil pigi piga pighati piging pihikan piknik piko
  pikot pila pilak pilapil pilat pili pilikmata pilipino pilit
  piloto pina pinakbet pinsan pinta pintas pinto pintuan pinya
  pinggan pipino pipi piraso pirma pisara pisil pisngi
  piso pista pitaka pitik plano plantsa planeta
  plastik platito plato plorera pokus politika pulis
  pulitika polo prito problema produkto programa proyekto
  prutas pugad pugon puhunan pukpok pula pulbos pulgada pulikat
  pulitiko pulo pulong pulot pulseras pulubi pulutan
  punas punasan puno punla punta puntos punyagi puri purga
  pursigi puso pusod pusit pusa pustiso puti putik puto
  putok putol puwang puwersa puwesto puwet puyat
  radyo rambutan rason rebulto ref regalo reklamo relihiyon relo
  renta repolyo report resibo respeto responsibilidad resulta reyna
  rosaryo rosas ruta
  saan saba sabado sabaw sabay sabi sabit sabog sabon sabong
  sadya sagabal saging sagip sagisag saglit sago sagot sagwan
  sahig sahod sahog saing sakal sakali sakay sakit sakop
  sakripisyo saksi sakto sala salita salapi salamin salamat
  salat salawal salbahe sali saliksik salin salo
  salok saloobin salop salubong salungat sama samba sambayanan
  sampal sampalok sampay sako saklay sanay sandali
  sandalyas sandalan sandata sandok sando sanga sanggol sangkap
  sangla santo sapa sapagkat sapat sapatos sapin sapinsapin saplot
  sapilitan sara sarado sarap saranggola sariwa sarili sarsa sasakyan
  sawa sawi saya sayang sayaw sayote sebo segundo sikreto
  seguro selda selos selpon semana semento senador senyas sepilyo
  serbisyo seryoso setyembre septyembre sibuyas sigarilyas sigarilyo
  sigaw sige sigla sigurado sikap sikat siklab siko siksik sikmura
  sikwate silangan silbi sili silid silip silong silya simba
  simbahan simbolo simoy simple simula sinag sinaing sinangag
  sinat sining sinigang sinta sinturon sinulid sinungaling
  sipa sipag sipi sipilyo sipit sipon sipsip sira sisi
  sisid sisiw sistema sitaw siyansi siyudad sobre
  solusyon sombrero sopas sorpresa sugal sugat sugod suha suhol
  suka sukat sukli suklay suko sulat suli suliranin sulit sulok
  sulong sumbat sumbong suman sumpa sundalo sundin sundo
  sungay sungkit sunod sunog suntok suot supot suporta suri susi
  suso sustansya suweldo sweldo suwerte swerte
  taas taba tabako tabi tabla tableta tabo tabon taga
  tagal tagalog tag-init tag-ulan tagiliran tagumpay tahimik tahi
  tahong taho tainga tenga taka takas takbo takda takip taklob
  takot takpan taksil takure tala talaan talaba talampakan talbos
  tali talim talino taliwas talo talon talong talukap talumpati
  tama tamad tambak tambay tambo tamis tampo tanaw tanda
  tandaan tanga tanggap tanggapan tanggi tanghalian tanghali
  tangi tangis tangkad tangkay tangke tanim tanikala tanod tanong
  tanso tantya tao taon tapa tapak tapal tapang tapat
  tapik tapis tapos tapon tapusin tara taranta trabaho tari
  taripa tasa tatag tatak tatay tawa tawad tawag tawid
  taya tayo tayutay tela telepono tema temperatura
  tiis tikim tiklop tikman tila tilapia tili timba timbang
  timog timpi timpla tina tinapa tinapay tinda tindahan tindi
  tindig tingala tingin tingi tingting tinidor tinig tinik
  tinola tipaklong tipan tipid tipon tira tirahan tirintas
  tisa tita titik titig titser tito tiwala tiwali tiyak
  tiyaga tiyan tiyo tiya tokador tokwa tolda tono tore
  torta totoo toyo trak trangkaso trapo trato tren tres
  tribo trono tropa tsa tsaa tsiko tsinelas tsismis tsokolate
  tsuper tubo tubig tubos tuka tuklas tukod tukso tuktok
  tula tulak tulay tuliro tulo tulog tulong
  tuloy tulya tumbas tumpak tunaw tunay tungkod
  tungo tungkulin tunog tupi tupad turon turo turuan tusok
  tutol tutong tuta tutubi tuwa tuwalya tuwid tuyo
  ubas ube ubo ubos ugali ugat ugnay ugoy uhaw uhog ukit
  ulam ulan ulap ulat uli ulila uling ulit ulitin ulo
  ulol umaga umpisa una unan unat unawa unggoy unibersidad uniporme
  uno unti untog upa upo upuan uri urong usa usap usapan
  usisa usok uso utang utak utos uwi uwak uyayi
  wakas walis walisan walisin waray wasak wasto watawat
  wika wilig wagas
  yabang yakap yaman yapak yari yelo yero yosi yugto
  yuko yungib yupi
`;

const HABIT_CONTENT_WORDS = new Set();
for (const raw of [HABIT_ENGLISH_WORDS_RAW, HABIT_TAGALOG_WORDS_RAW]) {
  raw.toLowerCase().split(/[^a-zñ]+/).forEach(w => {
    if (w && w.length >= 2) HABIT_CONTENT_WORDS.add(w);
  });
}

function isKnownEnglishStem(w) {
  if (!w || w.length < 2) return false;
  if (HABIT_CONTENT_WORDS.has(w)) return true;

  if (w.endsWith("ies") && w.length > 4) {
    if (HABIT_CONTENT_WORDS.has(w.slice(0, -3) + "y")) return true;
  }
  if (w.endsWith("ves") && w.length > 4) {
    if (HABIT_CONTENT_WORDS.has(w.slice(0, -3) + "f") || HABIT_CONTENT_WORDS.has(w.slice(0, -3) + "fe")) return true;
  }
  if (w.endsWith("es") && w.length > 3) {
    const base = w.slice(0, -2);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e")) return true;
  }
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 2) {
    const base = w.slice(0, -1);
    if (HABIT_CONTENT_WORDS.has(base)) return true;
  }
  if (w.endsWith("ing") && w.length > 4) {
    const base = w.slice(0, -3);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e")) return true;
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
      if (HABIT_CONTENT_WORDS.has(base.slice(0, -1))) return true;
    }
  }
  if (w.endsWith("ied") && w.length > 4) {
    if (HABIT_CONTENT_WORDS.has(w.slice(0, -3) + "y")) return true;
  }
  if (w.endsWith("ed") && w.length > 3) {
    const base = w.slice(0, -2);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e")) return true;
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
      if (HABIT_CONTENT_WORDS.has(base.slice(0, -1))) return true;
    }
  }
  if (w.endsWith("er") && w.length > 3) {
    const base = w.slice(0, -2);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e")) return true;
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
      if (HABIT_CONTENT_WORDS.has(base.slice(0, -1))) return true;
    }
  }
  if (w.endsWith("ers") && w.length > 4) {
    const base = w.slice(0, -3);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e")) return true;
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
      if (HABIT_CONTENT_WORDS.has(base.slice(0, -1))) return true;
    }
  }
  if (w.endsWith("est") && w.length > 4) {
    const base = w.slice(0, -3);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e")) return true;
  }
  if (w.endsWith("ly") && w.length > 4) {
    const base = w.slice(0, -2);
    if (HABIT_CONTENT_WORDS.has(base)) return true;
    if (base.endsWith("i") && HABIT_CONTENT_WORDS.has(base.slice(0, -1) + "y")) return true;
  }
  if (w.endsWith("ness") && w.length > 5) {
    const base = w.slice(0, -4);
    if (HABIT_CONTENT_WORDS.has(base)) return true;
    if (base.endsWith("i") && HABIT_CONTENT_WORDS.has(base.slice(0, -1) + "y")) return true;
  }
  if (w.endsWith("ment") && w.length > 5) {
    if (HABIT_CONTENT_WORDS.has(w.slice(0, -4))) return true;
  }
  if (w.endsWith("ful") && w.length > 4) {
    if (HABIT_CONTENT_WORDS.has(w.slice(0, -3))) return true;
  }
  if (w.endsWith("less") && w.length > 5) {
    if (HABIT_CONTENT_WORDS.has(w.slice(0, -4))) return true;
  }
  if ((w.endsWith("tion") || w.endsWith("sion")) && w.length > 5) {
    const base = w.slice(0, -4);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e") || HABIT_CONTENT_WORDS.has(base + "t") || HABIT_CONTENT_WORDS.has(base + "te")) return true;
  }
  if (w.endsWith("ation") && w.length > 6) {
    const base = w.slice(0, -5);
    if (HABIT_CONTENT_WORDS.has(base) || HABIT_CONTENT_WORDS.has(base + "e")) return true;
  }

  return false;
}

function getTagalogSuffixCandidates(w) {
  const candidates = [w];

  if (w.length > 4 && /[aeiou]ng$/.test(w)) {
    candidates.push(w.slice(0, -2));
  }
  if (w.length > 4 && /ng$/.test(w)) {
    candidates.push(w.slice(0, -1));
  }

  const suffixList = ["hin", "han", "nan", "in", "an"];
  for (const suf of suffixList) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      const stem = w.slice(0, -suf.length);
      candidates.push(stem);
      const lastU = stem.lastIndexOf("u");
      if (lastU >= 1) {
        const oStem = stem.slice(0, lastU) + "o" + stem.slice(lastU + 1);
        candidates.push(oStem);
      }
      if (stem.endsWith("r")) {
        const dStem = stem.slice(0, -1) + "d";
        candidates.push(dStem);
        const lastU2 = dStem.lastIndexOf("u");
        if (lastU2 >= 1) {
          candidates.push(dStem.slice(0, lastU2) + "o" + dStem.slice(lastU2 + 1));
        }
      }
    }
  }

  return candidates;
}

function stripTagalogReduplication(w) {
  const results = [w];
  if (w.length >= 4 && /^[aeiou]/.test(w) && w[0] === w[1]) {
    results.push(w.slice(1));
  }
  if (w.length >= 5 && /^([bcdfghjklmnpqrstvwxyzñ][aeiou])\1/.test(w)) {
    results.push(w.slice(2));
  }
  return results;
}

const TAGALOG_PREFIXES = [
  "nakakapag", "makakapag", "pakikipag", "pinakikipag",
  "makipag", "nakipag", "makapag", "nakapag", "pagkaka", "magkaka", "nagkaka",
  "nakaka", "makaka", "ipinag", "ipina", "pampa", "kaka",
  "ipagpa", "magpa", "nagpa", "pagpa", "magka", "nagka", "pagka", "magsi", "nagsi", "pagsi",
  "pinag", "pina", "kina",
  "ipang", "ipam", "ipan", "mang", "nang", "pang", "mam", "nam", "pam", "man", "nan", "pan",
  "maki", "naki", "paki", "maka", "naka", "paka", "mapa", "napa", "papa", "ipag", "ika", "isa",
  "mag", "nag", "pag", "mai", "nai", "ipa", "ka", "ma", "na", "pa", "um", "in", "i"
];

const ENGLISH_PREFIXES = [
  "re", "un", "pre", "de", "over", "under", "out", "up", "non", "self", "co", "mis", "sub",
  "inter", "super", "anti", "auto", "hyper", "micro", "multi", "post", "pro", "semi", "trans"
];

function isBaseOrStemMatch(w) {
  if (isKnownEnglishStem(w)) return true;

  for (const pre of ENGLISH_PREFIXES) {
    if (w.startsWith(pre) && w.length - pre.length >= 3) {
      if (isKnownEnglishStem(w.slice(pre.length))) return true;
    }
  }

  for (const cand of getTagalogSuffixCandidates(w)) {
    for (const red of stripTagalogReduplication(cand)) {
      if (isKnownEnglishStem(red)) return true;
    }
  }

  const infixMatch = w.match(/^([bcdfghjklmnpqrstvwxyzñ]{1,2})(um|in)([aeiou].*)$/);
  if (infixMatch) {
    const reconstructed = infixMatch[1] + infixMatch[3];
    for (const cand of getTagalogSuffixCandidates(reconstructed)) {
      for (const red of stripTagalogReduplication(cand)) {
        if (isKnownEnglishStem(red)) return true;
      }
    }
  }

  for (const pre of TAGALOG_PREFIXES) {
    if (w.startsWith(pre) && w.length - pre.length >= 3) {
      const rest = w.slice(pre.length);
      if (pre === "i" && rest.length < 4 && !HABIT_CONTENT_WORDS.has(rest)) continue;

      for (const cand of getTagalogSuffixCandidates(rest)) {
        for (const red of stripTagalogReduplication(cand)) {
          if (isKnownEnglishStem(red)) return true;
        }
      }

      if (["mam", "nam", "pam"].includes(pre)) {
        for (const c of ["b", "p"]) {
          for (const cand of getTagalogSuffixCandidates(c + rest)) {
            for (const red of stripTagalogReduplication(cand)) {
              if (isKnownEnglishStem(red)) return true;
            }
          }
        }
      } else if (["man", "nan", "pan"].includes(pre)) {
        for (const c of ["d", "s", "t"]) {
          for (const cand of getTagalogSuffixCandidates(c + rest)) {
            for (const red of stripTagalogReduplication(cand)) {
              if (isKnownEnglishStem(red)) return true;
            }
          }
        }
      } else if (["mang", "nang", "pang"].includes(pre)) {
        for (const c of ["k"]) {
          for (const cand of getTagalogSuffixCandidates(c + rest)) {
            for (const red of stripTagalogReduplication(cand)) {
              if (isKnownEnglishStem(red)) return true;
            }
          }
        }
      }
    }
  }

  return false;
}

const KEYSMASH_PATTERNS = [
  "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop",
  "poiu", "oiuy", "iuyt", "uytr", "ytre", "trew", "rewq",
  "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl",
  "lkjh", "kjhg", "jhgf", "hgfd", "gfds", "fdsa",
  "zxcv", "xcvb", "cvbn", "vbnm", "mnbv", "nbvc", "bvcx", "vcxz"
];

function hasGibberishPattern(w) {
  const lower = w.toLowerCase();
  if (/(.)\1\1/.test(lower)) return true;

  for (const pat of KEYSMASH_PATTERNS) {
    if (lower.includes(pat)) return true;
  }

  if (!/[aeiouy]/.test(lower)) return true;

  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(lower)) return true;

  return false;
}

function validateHabitInput(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { valid: false, reason: "⚠️ Please enter a habit first." };
  }

  const text = rawText.trim();
  if (!text) {
    return { valid: false, reason: "⚠️ Please enter a habit first." };
  }

  // 1. Must contain letters (reject numbers-only or symbols-only)
  const letters = text.match(/[a-zA-ZñÑ]/g) || [];
  const digits = text.match(/\d/g) || [];

  if (letters.length === 0) {
    return {
      valid: false,
      reason: "⚠️ Habit cannot be numbers only. Please enter real English or Tagalog words."
    };
  }

  // 2. Reject if mostly numbers or contains long number strings (e.g. a019328470192374)
  if (digits.length > letters.length || /\d{5,}/.test(text)) {
    return {
      valid: false,
      reason: "⚠️ Habit cannot be mostly numbers. Please enter real English or Tagalog words."
    };
  }

  if (letters.length < 2) {
    return {
      valid: false,
      reason: "⚠️ Please enter at least one real English or Tagalog word."
    };
  }

  // 3. Tokenize by whitespace and inspect every token
  const rawTokens = text.split(/\s+/).filter(Boolean);
  let realContentWordCount = 0;

  for (const rawToken of rawTokens) {
    if (/^[&+\-•]$/.test(rawToken)) continue;

    const cleaned = rawToken.replace(/^[("'.,!?]+|[)"'.,!?]+$/g, "");
    if (!cleaned) continue;

    // Reject tokens with invalid embedded punctuation like semicolons (a;slfja;lskdfja)
    if (/[^a-zA-ZñÑ0-9\-'/:]/.test(cleaned)) {
      return {
        valid: false,
        reason: "⚠️ Please enter real English or Tagalog words without random symbols."
      };
    }

    // Pure number or time (e.g. "10", "5", "6:00", "6:30am")
    if (/^\d{1,4}$/.test(cleaned) || /^\d{1,2}:\d{2}(am|pm)?$/i.test(cleaned)) {
      continue;
    }

    // Valid number+unit shorthand (e.g. "5mins", "10km", "2nd")
    if (/^\d{1,3}(st|nd|rd|th|x|s|sec|secs|m|min|mins|h|hr|hrs|am|pm|km|kg|lbs|lb|ml|l|oz|reps|sets)$/i.test(cleaned)) {
      continue;
    }

    if (cleaned.includes(":")) {
      return {
        valid: false,
        reason: "⚠️ Please enter real English or Tagalog words."
      };
    }

    const parts = cleaned.split(/[-/]/).filter(Boolean);
    if (parts.length === 0) continue;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (/^\d{1,4}$/.test(part)) continue;

      if (/\d/.test(part)) {
        return {
          valid: false,
          reason: `⚠️ "${rawToken}" is not a real word. Avoid mixing letters and numbers.`
        };
      }

      let word = part.toLowerCase();
      if (word.endsWith("'s")) {
        word = word.slice(0, -2);
      } else {
        word = word.replace(/'/g, "");
      }

      if (!word) continue;

      // Allow leading Tagalog or English prefix in a hyphenated word (e.g. "Mag-push", "Mag-push-ups", "Mag-aral", "non-critical")
      if (i === 0 && parts.length >= 2 && (TAGALOG_PREFIXES.includes(word) || ENGLISH_PREFIXES.includes(word))) {
        continue;
      }

      if (isBaseOrStemMatch(word)) {
        realContentWordCount++;
      } else if (HABIT_FUNCTION_WORDS.has(word)) {
        continue;
      } else if (hasGibberishPattern(word)) {
        return {
          valid: false,
          reason: `⚠️ "${rawToken}" does not look like a real word.`
        };
      } else {
        return {
          valid: false,
          reason: `⚠️ "${rawToken}" is not recognized. Please enter real English or Tagalog words.`
        };
      }
    }
  }

  if (realContentWordCount === 0) {
    return {
      valid: false,
      reason: "⚠️ Please include at least one real English or Tagalog habit word."
    };
  }

  return { valid: true };
}
window.validateHabitInput = validateHabitInput;

function addTask(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("newHabitInput");
  const text = input.value.trim();
  if (!text) return;

  const validation = validateHabitInput(text);
  if (!validation.valid) {
    input.classList.remove("input-invalid");
    void input.offsetWidth;
    input.classList.add("input-invalid");
    setTimeout(() => input.classList.remove("input-invalid"), 650);
    showToast(validation.reason || "⚠️ Please enter real English or Tagalog words.");
    return;
  }

  const tasks = getActiveTasks();
  tasks.push({ text: text, info: "Custom habit added by you" });
  saveActiveTasks(tasks);

  input.value = "";
  renderChecklist();
  showToast("📌 Habit added to list!");
}

function deleteTask(event, index) {
  event.stopPropagation();

  const lockedIdx = getLockedIndices();
  if (lockedIdx[index]) {
    showToast("🔒 This habit's coins were claimed — it can't be removed until tomorrow.");
    return;
  }

  const checks = getActiveChecks();
  const wasCheckedUnclaimed = !!checks[index] && !lockedIdx[index];

  const tasks = getActiveTasks();
  tasks.splice(index, 1);
  saveActiveTasks(tasks);

  // If the deleted task was checked today (and unclaimed), deduct its 10 piggybank coins
  if (wasCheckedUnclaimed) {
    const user = Habitism.getCurrentUser();
    if (user && user.id) {
      const newPiggybank = Math.max(0, (user.piggybank_coins || 0) - 10);
      user.piggybank_coins = newPiggybank;
      currentUser = user;
      Habitism.setCurrentUser(user);
      Habitism.syncPiggybank(user.id, newPiggybank).catch(() => {});
      updateNavbarBadges();
      updatePiggybankDisplay();
    }
  }

  // Re-index checks (and claim locks so they follow their tasks)
  const newChecks = {};
  const newLocked = {};
  let newIdx = 0;
  for (let i = 0; i <= tasks.length; i++) {
    if (i === index) continue;
    if (checks[i]) newChecks[newIdx] = true;
    if (lockedIdx[i]) newLocked[newIdx] = true;
    newIdx++;
  }
  saveActiveChecks(newChecks);

  const lock = getClaimLock();
  lock[getActiveListLockId()] = newLocked;
  saveClaimLock(lock);
  renderChecklist();
}

function getDefaultTasksForActiveList() {
  if (activeTaskMode === "custom") {
    return JSON.parse(JSON.stringify(DEFAULT_OPTION_A_TASKS));
  }
  const level = DEVELOPER_LEVELS[currentLevelIndex];
  return JSON.parse(JSON.stringify(level.tasks));
}

function isCurrentListModifiedFromDefault() {
  const current = getActiveTasks();
  const defaults = getDefaultTasksForActiveList();
  if (!Array.isArray(current) || current.length !== defaults.length) return true;
  for (let i = 0; i < defaults.length; i++) {
    const cText = current[i] && typeof current[i] === "object" ? current[i].text : String(current[i] || "");
    const dText = defaults[i] && typeof defaults[i] === "object" ? defaults[i].text : String(defaults[i] || "");
    if (cText !== dText) return true;
  }
  return false;
}

function resetCurrentListToDefault() {
  const lockedIdx = getLockedIndices();
  const hasLocked = Object.keys(lockedIdx).some(idx => lockedIdx[idx]);
  if (hasLocked) {
    showToast("🔒 Coins were claimed on this list today — default habits can't be restored until tomorrow.");
    return;
  }

  if (!isCurrentListModifiedFromDefault()) {
    const listLabel = activeTaskMode === "custom"
      ? "Custom list"
      : `Level ${DEVELOPER_LEVELS[currentLevelIndex].id}`;
    showToast(`ℹ️ ${listLabel} already has its original default habits.`);
    return;
  }

  // Deduct any unclaimed piggybank coins earned on this list today before clearing its checks
  const checks = getActiveChecks();
  const unclaimedCheckedCount = Object.keys(checks).filter(idx => checks[idx] && !lockedIdx[idx]).length;
  if (unclaimedCheckedCount > 0) {
    const user = Habitism.getCurrentUser();
    if (user && user.id) {
      const deduct = unclaimedCheckedCount * 10;
      const newPiggybank = Math.max(0, (user.piggybank_coins || 0) - deduct);
      user.piggybank_coins = newPiggybank;
      currentUser = user;
      Habitism.setCurrentUser(user);
      Habitism.syncPiggybank(user.id, newPiggybank).catch(() => {});
      updateNavbarBadges();
      updatePiggybankDisplay();
    }
  }

  const defaultTasks = getDefaultTasksForActiveList();
  saveActiveTasks(defaultTasks);
  saveActiveChecks({});

  renderChecklist();
  renderCalendar(currentCalendarDate);

  if (activeTaskMode === "custom") {
    showToast("🔄 Custom list restored to default starter habits!");
  } else {
    const level = DEVELOPER_LEVELS[currentLevelIndex];
    showToast(`🔄 Level ${level.id} restored to its original default habits!`);
  }
}
window.resetCurrentListToDefault = resetCurrentListToDefault;

function prevLevel() {
  if (activeTaskMode === "custom") return;
  if (currentLevelIndex > 0) {
    currentLevelIndex--;
  } else {
    currentLevelIndex = DEVELOPER_LEVELS.length - 1;
  }
  saveCurrentLevelIndex();
  renderChecklist();
}

function nextLevel() {
  if (activeTaskMode === "custom") return;
  if (currentLevelIndex < DEVELOPER_LEVELS.length - 1) {
    currentLevelIndex++;
  } else {
    currentLevelIndex = 0;
  }
  saveCurrentLevelIndex();
  renderChecklist();
}

// -------------------------------------------------------------
// 🎮 PART 3: GAMIFICATION, MODALS & REWARDS
// -------------------------------------------------------------
function updateNavbarBadges() {
  currentUser = Habitism.getCurrentUser();
  if (!currentUser) return;

  const nameEl = document.getElementById("navUserName");
  const coinsEl = document.getElementById("navCoins");
  const freezeEl = document.getElementById("navFreezes");
  const companionStageEl = document.getElementById("navCompanionStage");
  const companionIconEl = document.getElementById("navCompanionIcon");
  const fbBadge = document.getElementById("fbBadge");
  const adminBtn = document.getElementById("adminPortalBtn");

  if (nameEl) nameEl.innerText = currentUser.name || currentUser.username || "Champion";
  if (coinsEl) coinsEl.innerText = currentUser.coins || 0;
  if (freezeEl) freezeEl.innerText = currentUser.streak_freezes || 0;

  // Show piggybank badge in navbar
  const piggybankEl = document.getElementById("navPiggybank");
  if (piggybankEl) {
    piggybankEl.innerText = currentUser.piggybank_coins || 0;
  }

  // Show Admin Portal Button if role is admin
  if (adminBtn) {
    adminBtn.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
  }

  // Facebook verification badge
  if (fbBadge) {
    if (currentUser.facebook_id) {
      fbBadge.style.display = "inline-flex";
      fbBadge.innerText = currentUser.facebook_name ? `✔ FB: ${currentUser.facebook_name}` : "✔ FB";
      fbBadge.title = `Linked with Facebook ID: ${currentUser.facebook_id}`;
    } else {
      fbBadge.style.display = "none";
    }
  }

  const streak = currentUser.streak || 0;
  const companion = Habitism.getCompanionStage(streak);
  if (companionStageEl) companionStageEl.innerText = companion.name;
  if (companionIconEl) companionIconEl.innerText = companion.icon;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("active");
  }
});

// Shop Logic
async function handleBuyFreeze() {
  const res = await Habitism.buyStreakFreeze();
  if (res.success) {
    showToast(res.message);
    updateNavbarBadges();
    const modalCoinCount = document.getElementById("shopUserCoins");
    if (modalCoinCount) modalCoinCount.innerText = res.coins;
  } else {
    alert(res.message);
  }
}

function openShopModal() {
  currentUser = Habitism.getCurrentUser();
  const modalCoinCount = document.getElementById("shopUserCoins");
  if (modalCoinCount) modalCoinCount.innerText = currentUser ? currentUser.coins : 0;
  openModal("shopModal");
}

// Companion Modal
function openCompanionModal() {
  currentUser = Habitism.getCurrentUser();
  const streak = currentUser ? (currentUser.streak || 0) : 0;
  const comp = Habitism.getCompanionStage(streak);

  document.getElementById("modalCompIcon").innerText = comp.icon;
  document.getElementById("modalCompName").innerText = comp.name;
  document.getElementById("modalCompStage").innerText = comp.stage;
  document.getElementById("modalCompStreak").innerText = `${streak} Days`;

  let nextTarget = 2;
  if (streak >= 14) nextTarget = 14;
  else if (streak >= 7) nextTarget = 14;
  else if (streak >= 4) nextTarget = 7;
  else if (streak >= 2) nextTarget = 4;

  const pct = Math.min(100, Math.round((streak / nextTarget) * 100));
  document.getElementById("companionMilestoneBar").style.width = `${pct}%`;
  document.getElementById("companionMilestoneText").innerText = 
    streak >= 14 ? "Max Evolution Reached! 🪷" : `${streak}/${nextTarget} Days to Next Evolution`;

  openModal("companionModal");
}

// Weekly Certificate Modal
function openCertificateModal() {
  currentUser = Habitism.getCurrentUser();
  const streak = currentUser ? (currentUser.streak || 0) : 0;
  const isUnlocked = streak >= 7;

  document.getElementById("certUserName").innerText = (currentUser && (currentUser.name || currentUser.username)) ? (currentUser.name || currentUser.username) : "Habit Champion";
  document.getElementById("certDate").innerText = new Date().toLocaleDateString(undefined, { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  const certStatus = document.getElementById("certStatusNotice");
  const printBtn = document.getElementById("printCertBtn");

  if (isUnlocked) {
    certStatus.innerHTML = `<span style="color: #6ee7b7;">🎉 Unlocked! You completed a full 7-day streak!</span>`;
    printBtn.disabled = false;
  } else {
    certStatus.innerHTML = `<span style="color: #fde68a;">🔒 Complete a full 7-day streak to officially claim (Current: ${streak}/7 days)</span>`;
    printBtn.disabled = false;
  }

  openModal("certificateModal");
}

// Task Setup Mode Switcher
function openTaskModeModal() {
  document.getElementById("cardOptionA").classList.toggle("selected", activeTaskMode === "custom");
  document.getElementById("cardOptionB").classList.toggle("selected", activeTaskMode === "presets");
  openModal("taskModeModal");
}

function selectTaskMode(mode) {
  activeTaskMode = mode;
  localStorage.setItem(userKey("task_mode"), mode);
  document.getElementById("cardOptionA").classList.toggle("selected", mode === "custom");
  document.getElementById("cardOptionB").classList.toggle("selected", mode === "presets");
  closeModal("taskModeModal");
  renderChecklist();
  showToast(mode === "custom" ? "Switched to: 🎯 5 Custom Habits" : "Switched to: ⚡ Ready-made Levels");
}

// Toast helper
function showToast(text) {
  const toast = document.getElementById("habitToast");
  if (!toast) return;
  toast.innerText = text;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ============================================================================
// User Guide / Manual Modal Handler
// ============================================================================
function openUserManualModal() {
  openModal("userManualModal");
}

// ============================================================================
// Feedback Modal Handlers
// ============================================================================
function openFeedbackModal() {
  const user = Habitism.getCurrentUser();
  const nameInput = document.getElementById("feedbackName");
  const emailInput = document.getElementById("feedbackEmail");
  const msgInput = document.getElementById("feedbackMessage");
  const countEl = document.getElementById("feedbackCharCount");
  const errEl = document.getElementById("feedbackError");

  if (nameInput && user && user.name) {
    nameInput.value = user.name;
  }
  if (emailInput && user && user.email) {
    emailInput.value = user.email;
  }
  if (msgInput) {
    msgInput.value = "";
  }
  if (countEl) {
    countEl.innerText = "0";
  }
  if (errEl) {
    errEl.style.display = "none";
    errEl.innerText = "";
  }

  openModal("feedbackModal");
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  const name = (document.getElementById("feedbackName")?.value || "").trim();
  const email = (document.getElementById("feedbackEmail")?.value || "").trim();
  const type = document.getElementById("feedbackType")?.value || "Idea";
  const msgInput = document.getElementById("feedbackMessage");
  const message = (msgInput?.value || "").trim();
  const errEl = document.getElementById("feedbackError");
  const submitBtn = document.getElementById("feedbackSubmitBtn");

  if (!message) {
    if (errEl) {
      errEl.innerText = "Please enter your feedback message.";
      errEl.style.display = "block";
    }
    if (msgInput) msgInput.focus();
    return;
  }

  if (message.length > 1000) {
    if (errEl) {
      errEl.innerText = "Feedback message cannot exceed 1000 characters.";
      errEl.style.display = "block";
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Submitting...</span>`;
  }

  try {
    await Habitism.submitFeedback({
      name: name || null,
      email: email || null,
      type,
      message
    });

    closeModal("feedbackModal");
    showToast("Thank you for your feedback!");

    if (msgInput) msgInput.value = "";
  } catch (err) {
    if (errEl) {
      errEl.innerText = err.message || "Failed to submit feedback. Please try again.";
      errEl.style.display = "block";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Submit Feedback →</span>`;
    }
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// =============================================================
// 🌟 UNCLIPPED GLOBAL FLOATING TOOLTIP ENGINE (NO DUPLICATES)
// =============================================================
let globalTooltipEl = null;

function initGlobalTooltip() {
  globalTooltipEl = document.getElementById("habitismGlobalTooltip");
  if (!globalTooltipEl) {
    globalTooltipEl = document.createElement("div");
    globalTooltipEl.id = "habitismGlobalTooltip";
    globalTooltipEl.className = "global-tooltip-popup";
    document.body.appendChild(globalTooltipEl);
  }

  // Mouse Enter on any .info-btn
  document.addEventListener("mouseenter", (e) => {
    if (!e.target || !e.target.closest) return;
    const btn = e.target.closest(".info-btn");
    if (btn && btn.dataset.info) {
      showGlobalTooltip(btn, btn.dataset.info);
    }
  }, true);

  // Mouse Leave on any .info-btn
  document.addEventListener("mouseleave", (e) => {
    if (!e.target || !e.target.closest) return;
    const btn = e.target.closest(".info-btn");
    if (btn) {
      hideGlobalTooltip();
    }
  }, true);

  // Focus & Blur for keyboard accessibility
  document.addEventListener("focusin", (e) => {
    if (!e.target || !e.target.closest) return;
    const btn = e.target.closest(".info-btn");
    if (btn && btn.dataset.info) {
      showGlobalTooltip(btn, btn.dataset.info);
    }
  }, true);

  document.addEventListener("focusout", (e) => {
    if (!e.target || !e.target.closest) return;
    const btn = e.target.closest(".info-btn");
    if (btn) {
      hideGlobalTooltip();
    }
  }, true);

  // Click & Mobile Tap support for info buttons.
  // Capture phase: runs before inline handlers on nested action buttons
  // (e.g. the habit toggle) so tapping an (i) button shows its tooltip on
  // cellphones (where there is no hover) without triggering the parent action.
  document.addEventListener("click", (e) => {
    if (!e.target || !e.target.closest) return;
    const btn = e.target.closest(".info-btn");
    if (btn && btn.dataset.info) {
      e.stopPropagation();
      if (globalTooltipEl.classList.contains("active")) {
        hideGlobalTooltip();
      } else {
        showGlobalTooltip(btn, btn.dataset.info);
      }
      return;
    }
    if (!e.target.closest("#habitismGlobalTooltip")) {
      hideGlobalTooltip();
    }
  }, true);

  // Hide on scroll
  window.addEventListener("scroll", hideGlobalTooltip, true);
}

function showGlobalTooltip(targetBtn, text) {
  if (!globalTooltipEl || !text) return;

  globalTooltipEl.innerText = text;
  globalTooltipEl.classList.remove("position-bottom");
  globalTooltipEl.classList.add("active");

  const btnRect = targetBtn.getBoundingClientRect();
  const tipWidth = globalTooltipEl.offsetWidth;
  const tipHeight = globalTooltipEl.offsetHeight;
  const padding = 14;

  let left = btnRect.left + (btnRect.width / 2) - (tipWidth / 2);
  let arrowLeft = "50%";

  if (left < padding) {
    const diff = padding - left;
    left = padding;
    arrowLeft = `${Math.max(12, Math.min(88, 50 - (diff / tipWidth * 100)))}%`;
  } else if (left + tipWidth > window.innerWidth - padding) {
    const overflow = (left + tipWidth) - (window.innerWidth - padding);
    left = window.innerWidth - padding - tipWidth;
    arrowLeft = `${Math.max(12, Math.min(88, 50 + (overflow / tipWidth * 100)))}%`;
  }

  let top = btnRect.top - tipHeight - 10;
  if (top < 18 || btnRect.top < 110) {
    top = btnRect.bottom + 10;
    globalTooltipEl.classList.add("position-bottom");
  }

  globalTooltipEl.style.left = `${Math.round(left)}px`;
  globalTooltipEl.style.top = `${Math.round(top)}px`;
  globalTooltipEl.style.setProperty("--arrow-left", arrowLeft);
}

function hideGlobalTooltip() {
  if (globalTooltipEl) {
    globalTooltipEl.classList.remove("active");
  }
}



// -------------------------------------------------------------
// ☁️ FULL-STATE CLOUD SYNCHRONIZATION (ACROSS ALL BROWSERS)
// -------------------------------------------------------------
async function syncUserDataFromServer() {
  if (!currentUser || !currentUser.id || !Habitism.getUserFullState) {
    isInitialCloudSyncComplete = true;
    return;
  }

  try {
    const data = await Habitism.getUserFullState(currentUser.id);
    if (!data || !data.success) return;

    // 1. Sync User Profile stats (coins, streak, streak freezes, piggybank)
    if (data.user) {
      currentUser = { ...currentUser, ...data.user };
      Habitism.setCurrentUser(currentUser);
    }

    // 2. Restore Task States FIRST (Level, Mode, Custom Tasks, All Checks, Commitments)
    // so historical checkmarks are available when reconciling calendar dates
    if (data.taskStates) {
      const states = data.taskStates;
      Object.keys(states).forEach(stateKey => {
        const val = states[stateKey];
        if (stateKey === 'active_level') {
          const lvl = parseInt(val, 10);
          if (!isNaN(lvl) && lvl >= 0 && lvl < DEVELOPER_LEVELS.length) {
            currentLevelIndex = lvl;
          }
          localStorage.setItem(userKey("active_level"), currentLevelIndex.toString());
        } else if (stateKey === 'task_mode') {
          activeTaskMode = val;
          localStorage.setItem(userKey("task_mode"), activeTaskMode);
        } else {
          localStorage.setItem(userKey(stateKey), typeof val === 'string' ? val : JSON.stringify(val));
        }
      });
    }

    // 3. Restore Entire Calendar History from Database
    if (data.calendarMap) {
      Object.keys(data.calendarMap).forEach(dateStr => {
        const serverCount = data.calendarMap[dateStr] || 0;
        const checksCount = getSavedChecksCompletedCountForDate(dateStr);
        const finalCount = Math.max(serverCount, checksCount);
        const k = userKey("cal_tier_" + dateStr);
        if (finalCount > 0) {
          localStorage.setItem(k, finalCount.toString());
        } else {
          localStorage.removeItem(k);
        }
      });
    }

    // 4. Reconcile any local/cloud checkmark dates whose calendar tier was missing in daily_logs
    const prefix = userKey("");
    const discoveredDates = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const fullK = localStorage.key(i);
      if (!fullK || !fullK.startsWith(prefix)) continue;
      const shortK = fullK.slice(prefix.length);
      const m = shortK.match(/^(?:checks_(?:lvl_)?\d+|custom_checks|claim_lock|commitment)_(.+)$/);
      if (m && m[1]) discoveredDates.add(m[1]);
    }

    discoveredDates.forEach(dateStr => {
      const checksCount = getSavedChecksCompletedCountForDate(dateStr);
      if (checksCount > 0) {
        const calK = userKey("cal_tier_" + dateStr);
        const currentStored = parseInt(localStorage.getItem(calK), 10) || 0;
        const best = Math.max(currentStored, checksCount);
        localStorage.setItem(calK, best.toString());
        const serverVal = (data.calendarMap && data.calendarMap[dateStr]) || 0;
        if (serverVal < best && Habitism.setUserCalendarDay) {
          Habitism.setUserCalendarDay(currentUser.id, dateStr, best).catch(() => {});
        }
      }
    });

    isInitialCloudSyncComplete = true;

    // Restore commitment if present
    getCommitmentListId();

    // Re-render UI with fully synchronized database state
    renderCalendar(currentCalendarDate);
    updateStreak();
    renderChecklist();
    updateCommitmentUI();
    updateNavbarBadges();
  } catch (err) {
    console.warn('Cloud state sync note:', err.message);
  } finally {
    isInitialCloudSyncComplete = true;
  }
}

// -------------------------------------------------------------
// 🧭 RESPONSIVE NAVBAR PROGRESSIVE OVERFLOW ENGINE
// -------------------------------------------------------------
function initNavbarOverflowEngine() {
  const navToggle = document.getElementById("navOverflowToggle");
  const navDropdown = document.getElementById("navOverflowDropdown");
  const navActions = document.getElementById("navActions");
  const navbar = document.querySelector(".navbar");

  if (!navToggle || !navDropdown || !navActions || !navbar) return;

  // Toggle overflow dropdown
  navToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = navDropdown.classList.contains("open");
    navDropdown.classList.toggle("open", !isOpen);
    navToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  // Close dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!navDropdown.classList.contains("open")) return;
    if (navToggle.contains(e.target) || navDropdown.contains(e.target)) return;
    navDropdown.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });

  // Close dropdown when any item inside is clicked
  navDropdown.addEventListener("click", () => {
    navDropdown.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });

  // Sync admin item visibility in dropdown
  const adminDropdownItem = document.getElementById("overflowItemAdmin");
  if (adminDropdownItem) {
    if (currentUser && currentUser.role === "admin") {
      adminDropdownItem.classList.add("is-admin");
    } else {
      adminDropdownItem.classList.remove("is-admin");
    }
  }

  // Initial evaluation
  evaluateNavbarOverflow();

  // Re-evaluate on window resize
  window.addEventListener("resize", () => {
    evaluateNavbarOverflow();
  });
}

function evaluateNavbarOverflow() {
  const navActions = document.getElementById("navActions");
  const navbar = document.querySelector(".navbar");
  if (!navActions || !navbar) return;

  // If on cellphone screen (<= 640px), clear all collapse stages
  if (window.innerWidth <= 640) {
    navActions.classList.remove("collapse-stage-1", "collapse-stage-2", "collapse-stage-3", "collapse-stage-4");
    return;
  }

  // Margin safety threshold from the right edge
  const screenEdgeMargin = 22;
  const navbarRect = navbar.getBoundingClientRect();
  const maxRightBound = Math.min(window.innerWidth - screenEdgeMargin, navbarRect.right - screenEdgeMargin);

  const btnLogout = document.getElementById("navBtnLogout");
  const btnMode = document.getElementById("navBtnMode");
  const btnCert = document.getElementById("navBtnCert");
  const overflowToggle = document.getElementById("navOverflowToggle");
  const overflowMenu = document.getElementById("navOverflowMenu");

  function isOver(el) {
    if (!el || el.offsetParent === null) return false;
    const rect = el.getBoundingClientRect();
    return rect.right > maxRightBound;
  }

  // Step 0: Test stage 0 (all buttons visible)
  navActions.classList.remove("collapse-stage-1", "collapse-stage-2", "collapse-stage-3", "collapse-stage-4");

  const logoutRect = btnLogout ? btnLogout.getBoundingClientRect() : null;
  const isOverflowStage1 = logoutRect ? (logoutRect.right > maxRightBound || navActions.scrollWidth > navActions.clientWidth) : false;

  if (!isOverflowStage1) {
    // Fits perfectly! Stage 0
    return;
  }

  // Step 1: Collapse Log Out, Admin, User Guide, and Feedback -> Show Hamburger Menu
  navActions.classList.add("collapse-stage-1");

  const isToggleOver1 = isOver(overflowToggle) || isOver(overflowMenu) || (navActions.scrollWidth > navActions.clientWidth);
  const isModeOver = isOver(btnMode);

  if (isToggleOver1 || isModeOver) {
    // Step 3: Collapse Mode into hamburger icon as well
    navActions.classList.remove("collapse-stage-1");
    navActions.classList.add("collapse-stage-3");

    const isToggleOver3 = isOver(overflowToggle) || isOver(overflowMenu) || (navActions.scrollWidth > navActions.clientWidth);
    const isCertOver = isOver(btnCert);

    if (isToggleOver3 || isCertOver) {
      // Step 4: Collapse Certificate + Mode + Log Out into hamburger icon
      navActions.classList.remove("collapse-stage-3");
      navActions.classList.add("collapse-stage-4");
    }
  }
}

// -------------------------------------------------------------
// 🌅 DAILY RESET: refresh checks/commitment/locks when a new day starts
// (checks are stored per calendar day, so a new day is always a clean slate;
//  this makes an already-open tab roll over at midnight too)
// -------------------------------------------------------------
let lastKnownDay = getTodayString();

function handleDayRollover() {
  const today = getTodayString();
  if (today === lastKnownDay) return;

  const previousDay = lastKnownDay;
  lastKnownDay = today;

  // Re-read today's (empty) commitment state; yesterday's is ignored automatically
  getCommitmentListId();

  // If the calendar was showing the month of the previous day, follow into the new day's month
  const prev = new Date(previousDay);
  if (!isNaN(prev) &&
      currentCalendarDate.getMonth() === prev.getMonth() &&
      currentCalendarDate.getFullYear() === prev.getFullYear()) {
    currentCalendarDate = new Date();
  }

  renderChecklist();
  renderCalendar(currentCalendarDate);
  updateCommitmentUI();
  updateStreak();
  showToast("🌅 New day! All checkboxes have been reset. Let's go!");
}

setInterval(handleDayRollover, 15000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    handleDayRollover();
    syncUserDataFromServer();
  }
});
window.addEventListener("focus", () => {
  handleDayRollover();
  syncUserDataFromServer();
});

// -------------------------------------------------------------
// 🚀 INITIALIZATION
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  currentUser = Habitism.requireAuth(true);
  if (!currentUser) return;

  // Load user-scoped task mode
  const savedMode = localStorage.getItem(userKey("task_mode"));
  if (savedMode === "custom" || savedMode === "presets") {
    activeTaskMode = savedMode;
  }

  loadCurrentLevelIndex();
  syncUserDataFromServer();

  // Restore commitment from storage
  getCommitmentListId();

  // Restore checks from server (fixes persistence bug: checks lost on re-login)
  if (currentUser && currentUser.id) {
    Habitism.restoreUserChecks(currentUser.id).then(savedChecks => {
      if (savedChecks && Object.keys(savedChecks).length > 0) {
        // Apply saved checks to localStorage for the active mode/level
        const todayKey = activeTaskMode === "custom"
          ? userKey(`custom_checks_${getTodayString()}`)
          : userKey(`checks_${DEVELOPER_LEVELS[currentLevelIndex].id}_${getTodayString()}`);
        const existing = localStorage.getItem(todayKey);
        if (!existing) {
          localStorage.setItem(todayKey, JSON.stringify(savedChecks));
        }
      }
    }).catch(() => {});
  }

  initGlobalTooltip();
  updateNavbarBadges();

  // 💬 Feedback character counter
  const feedbackMsg = document.getElementById("feedbackMessage");
  if (feedbackMsg) {
    feedbackMsg.addEventListener("input", () => {
      const counter = document.getElementById("feedbackCharCount");
      if (counter) counter.innerText = feedbackMsg.value.length;
    });
  }

  // 📱 Mobile navbar hamburger menu
  const navToggle = document.getElementById("navMobileToggle");
  const navMenu = document.getElementById("navActions");
  const navOverlay = document.getElementById("navMobileOverlay");
  const MOBILE_BREAKPOINT = 640;

  if (navToggle && navMenu) {
    function setMenu(open) {
      navMenu.classList.toggle("open", !!open);
      navToggle.setAttribute("aria-expanded", String(!!open));
      if (navOverlay) navOverlay.classList.toggle("active", !!open);
    }

    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenu(!navMenu.classList.contains("open"));
    });

    // Close the menu when a menu item is activated
    navMenu.addEventListener("click", () => setMenu(false));

    // Close the menu when clicking outside of it
    document.addEventListener("click", (e) => {
      if (!navMenu.classList.contains("open")) return;
      if (navToggle.contains(e.target) || navMenu.contains(e.target)) return;
      setMenu(false);
    });

    // Reset the menu when resizing back to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMenu(false);
    });
  }

  renderCalendar(currentCalendarDate);
  renderChecklist();
});

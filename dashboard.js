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
function getDayCompletedCount(dateString) {
  const count = localStorage.getItem(userKey("cal_tier_" + dateString));
  return count ? parseInt(count, 10) : 0;
}

function setDayCompletedCount(dateString, count) {
  const k = userKey("cal_tier_" + dateString);
  const val = parseInt(count, 10) || 0;

  if (val <= 0) {
    localStorage.removeItem(k);
  } else {
    localStorage.setItem(k, val.toString());
  }

  // Cloud Sync: Persist calendar day in SQLite database across all browsers
  if (currentUser && currentUser.id && Habitism.setUserCalendarDay) {
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

    html += `<td class="${classes}" onclick="toggleCalendarDay('${cellDate}')" title="${cellDate} (${completedCount} habits)">${day}</td>`;
    if ((day + firstDay) % 7 === 0 && day !== daysInMonth) {
      html += "</tr><tr>";
    }
  }

  html += "</tr></tbody>";
  calendar.innerHTML = html;
  updateStreak();
}

function toggleCalendarDay(cellDate) {
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

  tasks.forEach((task, index) => {
    const isCompleted = !!checks[index];
    if (isCompleted) completedToday++;

    const li = document.createElement("li");
    li.className = `habit-item ${isCompleted ? "completed" : ""}`;

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
      <button class="delete-btn" onclick="deleteTask(event, ${index})" title="Remove task">&times;</button>
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

  // 6. Update Calendar Tier for Today
  setDayCompletedCount(getTodayString(), completedToday);
  updateCommitmentUI();
  renderCalendar(currentCalendarDate);
}

function toggleTask(index) {
  const checks = getActiveChecks();
  const wasCompleted = !!checks[index];
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

function addTask(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("newHabitInput");
  const text = input.value.trim();
  if (!text) return;

  const tasks = getActiveTasks();
  tasks.push({ text: text, info: "Custom habit added by you" });
  saveActiveTasks(tasks);

  input.value = "";
  renderChecklist();
  showToast("📌 Habit added to list!");
}

function deleteTask(event, index) {
  event.stopPropagation();
  const tasks = getActiveTasks();
  tasks.splice(index, 1);
  saveActiveTasks(tasks);

  // Re-index checks
  const checks = getActiveChecks();
  const newChecks = {};
  let newIdx = 0;
  for (let i = 0; i <= tasks.length; i++) {
    if (i === index) continue;
    if (checks[i]) newChecks[newIdx] = true;
    newIdx++;
  }
  saveActiveChecks(newChecks);
  renderChecklist();
}

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

// Facebook Accountability Modal & Live Test
function openAccountabilityModal() {
  currentUser = Habitism.getCurrentUser();
  const fbStatusDisplay = document.getElementById("fbAccountLinkStatus");
  if (fbStatusDisplay) {
    if (currentUser.facebook_id) {
      fbStatusDisplay.innerHTML = `
        <span style="color: #60a5fa; font-weight: 700;">Linked as: ${escapeHtml(currentUser.facebook_name || currentUser.name)} (ID: ${currentUser.facebook_id})</span>
        <button class="nav-btn-link btn-secondary" style="margin-left: 10px; font-size: 0.76rem; padding: 3px 8px;" onclick="handleUnlinkFacebook()">Unlink</button>
      `;
    } else {
      fbStatusDisplay.innerHTML = `
        <span style="color: #94a3b8;">Not linked to Facebook.</span>
        <button class="nav-btn-link btn-primary" style="margin-left: 10px; font-size: 0.76rem; padding: 3px 8px;" onclick="handleLinkFacebookPrompt()">Link Facebook Account</button>
      `;
    }
  }
  openModal("accountabilityModal");
}

async function handleLinkFacebookPrompt() {
  try {
    const fbUser = await Habitism.loginWithFacebook();
    if (fbUser && fbUser.facebook_id) {
      await Habitism.linkFacebook(currentUser.id, fbUser.facebook_id, fbUser.facebook_name || fbUser.name);
      currentUser = Habitism.getCurrentUser();
      updateNavbarBadges();
      openAccountabilityModal();
      showToast("✔ Facebook profile linked successfully!");
    }
  } catch (err) {
    if (err.message && !err.message.includes('cancelled')) {
      showToast("Facebook notice: " + err.message);
    }
  }
}

async function handleUnlinkFacebook() {
  if (!confirm("Are you sure you want to unlink Facebook?")) return;
  await Habitism.unlinkFacebook(currentUser.id);
  updateNavbarBadges();
  openAccountabilityModal();
  showToast("Facebook account unlinked.");
}

async function handleTestAccountabilityPost() {
  const logEl = document.getElementById("accountabilityLog");
  logEl.innerHTML = `<div style="color: #93c5fd;">⏳ Submitting unfulfilled habits to Facebook Graph API (Page ID 1496888330165860)...</div>`;

  const activeTasks = getActiveTasks();
  const activeChecks = getActiveChecks();
  const failedTasks = activeTasks.filter((t, idx) => !activeChecks[idx]);

  const res = await Habitism.simulateAccountabilityCheck(getTodayString(), failedTasks, activeTasks);
  if (res) {
    if (res.shielded) {
      logEl.innerHTML = `
        <div style="color: #6ee7b7; font-weight: 700;">❄️ STREAK FROZEN!</div>
        <div style="color: #cbd5e1; margin-top: 4px;">A Streak Freeze was consumed to protect your ${currentUser.streak || 0}-day streak. Facebook post skipped.</div>
      `;
    } else {
      const failedListHtml = failedTasks.length > 0 
        ? failedTasks.map(t => `<div style="color: #fca5a5; font-size: 0.8rem; margin: 2px 0;">❌ [Incomplete] ${escapeHtml(t.text || t)}</div>`).join('')
        : `<div style="color: #cbd5e1; font-size: 0.8rem;">❌ All pending habits marked unfulfilled</div>`;

      logEl.innerHTML = `
        <div style="color: #f87171; font-weight: 700; display: flex; align-items: center; gap: 6px;">
          <span>🚨</span>
          <span>FACEBOOK ACCOUNTABILITY POST TRIGGERED!</span>
        </div>
        <div style="margin-top: 6px; padding: 8px; background: rgba(0,0,0,0.4); border-radius: 8px; border-left: 3px solid #f87171;">
          <div style="font-weight: 700; color: #fed7aa; margin-bottom: 4px;">&ldquo;This person made this commitment but did not complete it.&rdquo;</div>
          <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 6px;">Target Page: <strong>Habitism</strong> (ID: 1496888330165860) &bull; User: <strong>${escapeHtml(currentUser.name)}</strong></div>
          <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 6px;">
            <div style="font-size: 0.76rem; color: #e2e8f0; font-weight: 600; margin-bottom: 2px;">Highlighted Unfulfilled Habits:</div>
            ${failedListHtml}
          </div>
        </div>
        <div style="color: #f87171; font-size: 0.76rem; margin-top: 6px;">Penalty Applied: Daily streak reset to 0 days.</div>
      `;
    }
    updateStreak();
    updateNavbarBadges();
  }
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
  if (!currentUser || !currentUser.id || !Habitism.getUserFullState) return;

  try {
    const data = await Habitism.getUserFullState(currentUser.id);
    if (!data || !data.success) return;

    // 1. Sync User Profile stats (coins, streak, streak freezes, piggybank)
    if (data.user) {
      currentUser = { ...currentUser, ...data.user };
      Habitism.setCurrentUser(currentUser);
    }

    // 2. Restore Entire Calendar History from Database
    if (data.calendarMap) {
      Object.keys(data.calendarMap).forEach(dateStr => {
        const count = data.calendarMap[dateStr];
        const k = userKey("cal_tier_" + dateStr);
        if (count > 0) {
          localStorage.setItem(k, count.toString());
        } else {
          localStorage.removeItem(k);
        }
      });
    }

    // 3. Restore Task States (Level, Mode, Custom Tasks, All Checks, Commitments)
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
  const btnAccountability = document.getElementById("navBtnAccountability");
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

  // Step 1: Collapse Log Out (and Admin) -> Show Hamburger Menu
  navActions.classList.add("collapse-stage-1");

  // If the hamburger icon itself or Accountability button does not fit comfortably,
  // immediately include the Accountability button in the hamburger icon (Stage 2)
  const isToggleOver1 = isOver(overflowToggle) || isOver(overflowMenu) || (navActions.scrollWidth > navActions.clientWidth);
  const isAccOver = isOver(btnAccountability);

  if (isToggleOver1 || isAccOver) {
    // Step 2: Collapse Accountability + Log Out into hamburger icon
    navActions.classList.remove("collapse-stage-1");
    navActions.classList.add("collapse-stage-2");

    // Check if hamburger icon or Mode overflows in Stage 2
    const isToggleOver2 = isOver(overflowToggle) || isOver(overflowMenu) || (navActions.scrollWidth > navActions.clientWidth);
    const isModeOver = isOver(btnMode);

    if (isToggleOver2 || isModeOver) {
      // Step 3: Collapse Mode + Accountability + Log Out into hamburger icon
      navActions.classList.remove("collapse-stage-2");
      navActions.classList.add("collapse-stage-3");

      // Check if hamburger icon or Certificate overflows in Stage 3
      const isToggleOver3 = isOver(overflowToggle) || isOver(overflowMenu) || (navActions.scrollWidth > navActions.clientWidth);
      const isCertOver = isOver(btnCert);

      if (isToggleOver3 || isCertOver) {
        // Step 4: Collapse Certificate + Mode + Accountability + Log Out into hamburger icon
        navActions.classList.remove("collapse-stage-3");
        navActions.classList.add("collapse-stage-4");
      }
    }
  }
}

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

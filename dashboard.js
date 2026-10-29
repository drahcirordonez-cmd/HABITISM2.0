/**
 * ============================================================================
 * HABITISM - DASHBOARD LOGIC (dashboard.js)
 * ============================================================================
 * Handles Side-by-Side Calendar, Level Habits & Custom Tasks, Dynamic Color Themes,
 * Gamification (Coins, Shop, Freezes, Companion, Certificate), and Facebook Accountability.
 */

// Preset developer levels with info buttons
const DEVELOPER_LEVELS = [
  {
    id: 1,
    title: "Level 1: Taking the first steps",
    info: "baby steps (note, it may seem very easy, but, keep in mind that this is where you begin)",
    tasks: [
      { text: "don't use your phone for 1 minute" },
      { text: "close your eyes for 1-minute and take deep breaths" },
      { text: "do 1 push up" },
      { text: "do 1 jumping jack" },
      { text: "Think of one thing to be thankful for" }
    ]
  },
  {
    id: 2,
    title: "Level 2: Let's keep it up",
    info: null,
    tasks: [
      { text: "don't use your phone for 2 minutes" },
      { text: "close your eyes for 1-minute and take deep breaths" },
      { text: "do 2 push ups" },
      { text: "do 3 jumping jacks" },
      { 
        text: "Think of 2 things to be thankful for", 
        info: "example your mom/cousin/pet for being there for you" 
      }
    ]
  },
  {
    id: 3,
    title: "Level 3: Keep moving forward with me",
    info: null,
    tasks: [
      { text: "don't use your phone for 3 minutes" },
      { text: "close your eyes for 1-minute and take deep breaths" },
      { text: "do 3 push ups" },
      { text: "do 5 jumping jacks" },
      { 
        text: "Think of 3 things to be thankful for", 
        info: "example your friend for being there for you" 
      }
    ]
  },
  {
    id: 4,
    title: "Level 4: Try something new with me | Meditation",
    info: "improves sleep, calms the mind • best when quiet",
    tasks: [
      { text: "set a 5 minute timer" },
      { 
        text: "believe in yourself and close your eyes for 5mins", 
        info: "if you can't close your eyes, you can open your eyes and simply focus your attention to one point/item." 
      },
      { 
        text: "take deep breaths", 
        info: "deep inhale, exhale slowly" 
      },
      { text: "keep your focus on your deep breaths" },
      { text: "Trust the process" }
    ]
  },
  {
    id: 5,
    title: "Level 5: Prime your environment",
    info: "Make good habits easy and bad habits hard to do",
    tasks: [
      { 
        text: "give your phone to someone and let them keep/hide it for 5 minutes", 
        info: "helps to avoid doom-scrolling/getting distracted from using your phone" 
      },
      { 
        text: "make your bed", 
        info: "Makes you avoid lying down and helps you turn your attention to doing something more productive" 
      },
      { 
        text: "Remove things that doesn't belong to the floor", 
        info: "Avoids distractions and makes it easier to do more productive tasks" 
      },
      { 
        text: "Place your study materials on your desk", 
        info: "helps with making you more likely to study" 
      },
      { 
        text: "Prepare tomorrow's to-do list", 
        info: "conditions you to be productive tomorrow" 
      }
    ]
  }
];

// Option A: Default Starter 5 Custom Tasks
const DEFAULT_OPTION_A_TASKS = [
  { text: "Morning Meditation (5 mins)" },
  { text: "Do 20 Push-ups" },
  { text: "Do 10 Pull-ups" },
  { text: "Do 25 Sit-ups" },
  { text: "Deep breathing & Gratitude reflection" }
];

// State Variables
let currentUser = null;
let currentCalendarDate = new Date();
let currentLevelIndex = 0;
let activeTaskMode = "presets"; // 'presets' (Option B) or 'custom' (Option A)

function getTodayString() {
  return new Date().toDateString();
}

// -------------------------------------------------------------
// 📅 PART 1: CALENDAR LOGIC (TIER GREEN, ORANGE, WHITE-BLUE)
// -------------------------------------------------------------
function getDayCompletedCount(dateString) {
  const count = localStorage.getItem("cal_tier_" + dateString);
  return count ? parseInt(count, 10) : 0;
}

function setDayCompletedCount(dateString, count) {
  if (count <= 0) {
    localStorage.removeItem("cal_tier_" + dateString);
  } else {
    localStorage.setItem("cal_tier_" + dateString, count.toString());
  }
}

function renderCalendar(date) {
  const calendar = document.getElementById("calendar");
  if (!calendar) return;

  const year = date.getFullYear();
  const month = date.getMonth();

  // Update Month Title
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

    const completedCount = getDayCompletedCount(cellDate);

    // 🌟 Highlights:
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
// 📝 PART 2: CHECKLIST LOGIC (OPTION A & OPTION B)
// -------------------------------------------------------------
function loadCurrentLevelIndex() {
  const saved = localStorage.getItem("habitism_active_level");
  if (saved !== null) {
    const idx = parseInt(saved, 10);
    if (!isNaN(idx) && idx >= 0 && idx < DEVELOPER_LEVELS.length) {
      currentLevelIndex = idx;
    }
  }
}

function saveCurrentLevelIndex() {
  localStorage.setItem("habitism_active_level", currentLevelIndex.toString());
}

function getActiveTasks() {
  if (activeTaskMode === "custom") {
    const saved = localStorage.getItem("habitism_custom_tasks");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_OPTION_A_TASKS));
  } else {
    // Option B: Presets
    const level = DEVELOPER_LEVELS[currentLevelIndex];
    const key = `habitism_tasks_lvl_${level.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(level.tasks));
  }
}

function saveActiveTasks(tasks) {
  if (activeTaskMode === "custom") {
    localStorage.setItem("habitism_custom_tasks", JSON.stringify(tasks));
  } else {
    const level = DEVELOPER_LEVELS[currentLevelIndex];
    localStorage.setItem(`habitism_tasks_lvl_${level.id}`, JSON.stringify(tasks));
  }
}

function getActiveChecks() {
  const todayKey = activeTaskMode === "custom" 
    ? `habitism_custom_checks_${getTodayString()}`
    : `habitism_checks_${DEVELOPER_LEVELS[currentLevelIndex].id}_${getTodayString()}`;

  const saved = localStorage.getItem(todayKey);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return {};
}

function saveActiveChecks(checks) {
  const todayKey = activeTaskMode === "custom" 
    ? `habitism_custom_checks_${getTodayString()}`
    : `habitism_checks_${DEVELOPER_LEVELS[currentLevelIndex].id}_${getTodayString()}`;

  localStorage.setItem(todayKey, JSON.stringify(checks));
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
        <button class="info-btn" aria-label="Custom Tasks Info" tabindex="0">
          i
          <span class="tooltip-popup">Your personalized daily routine. Strive for 5+ habits to sustain your streak!</span>
        </button>
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
          <button class="info-btn" aria-label="Level Info" tabindex="0">
            i
            <span class="tooltip-popup">${escapeHtml(level.info)}</span>
          </button>
        `;
      } else {
        levelInfoWrap.innerHTML = "";
      }
    }
  }

  // 3. Render Task Items
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
        <button class="info-btn" onclick="event.stopPropagation()" aria-label="Info">
          i
          <span class="tooltip-popup">${escapeHtml(task.info)}</span>
        </button>
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

  // 5. DYNAMIC CHECKBOX COLORING (BASED ON CHECKED BOXES COUNT)
  // 6-7 checked boxes -> bright orange checks
  // 8+ checked boxes -> bright white-blue checks
  // 1-5 checked boxes -> default green checks
  checklistCard.classList.remove("checks-orange", "checks-white-blue");
  if (completedToday >= 8) {
    checklistCard.classList.add("checks-white-blue");
  } else if (completedToday >= 6) {
    checklistCard.classList.add("checks-orange");
  }

  // 6. UPDATE CALENDAR TIER FOR TODAY AUTOMATICALLY
  setDayCompletedCount(getTodayString(), completedToday);
  renderCalendar(currentCalendarDate);
}

function toggleTask(index) {
  const checks = getActiveChecks();
  const wasCompleted = !!checks[index];
  checks[index] = !wasCompleted;
  saveActiveChecks(checks);

  // If marked completed, reward user with coins!
  if (!wasCompleted) {
    Habitism.addCoins(10);
    showToast("✨ Habit completed! +10 Habit Coins 🪙");
    updateNavbarBadges();
  }

  renderChecklist();
}

function addTask(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("newHabitInput");
  const text = input.value.trim();
  if (!text) return;

  const tasks = getActiveTasks();
  tasks.push({ text: text });
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

  if (nameEl) nameEl.innerText = currentUser.name || "Champion";
  if (coinsEl) coinsEl.innerText = currentUser.coins || 0;
  if (freezeEl) freezeEl.innerText = currentUser.streak_freezes || 0;

  if (fbBadge) {
    fbBadge.style.display = currentUser.facebook_id ? "inline-flex" : "none";
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

  // Milestone target
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

  document.getElementById("certUserName").innerText = (currentUser && currentUser.name) ? currentUser.name : "Habit Champion";
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
    printBtn.disabled = false; // Allow preview/print
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
  localStorage.setItem("habitism_task_mode", mode);
  document.getElementById("cardOptionA").classList.toggle("selected", mode === "custom");
  document.getElementById("cardOptionB").classList.toggle("selected", mode === "presets");
  closeModal("taskModeModal");
  renderChecklist();
  showToast(mode === "custom" ? "Switched to: 🎯 5 Custom Habits" : "Switched to: ⚡ Ready-made Levels");
}

// Facebook Accountability Modal & Live Test
function openAccountabilityModal() {
  openModal("accountabilityModal");
}

async function handleTestAccountabilityPost() {
  const logEl = document.getElementById("accountabilityLog");
  logEl.innerHTML = `<div style="color: #93c5fd;">⏳ Contacting Facebook Graph API with Page ID 1496888330165860...</div>`;

  const res = await Habitism.simulateAccountabilityCheck(getTodayString());
  if (res) {
    if (res.shielded) {
      logEl.innerHTML = `
        <div style="color: #6ee7b7; font-weight: 700;">❄️ STREAK FROZEN!</div>
        <div style="color: #cbd5e1; margin-top: 4px;">A Streak Freeze was consumed to protect your ${currentUser.streak || 0}-day streak. Facebook post skipped.</div>
      `;
    } else {
      logEl.innerHTML = `
        <div style="color: #f87171; font-weight: 700;">🚨 GRAPH API ACCOUNTABILITY TRIGGERED!</div>
        <div style="color: #fed7aa; margin-top: 4px;">&ldquo;This person made this commitment but did not complete it.&rdquo;</div>
        <div style="color: #94a3b8; font-size: 0.76rem; margin-top: 4px;">Page: Habitism (ID: 1496888330165860) | Response: 200 OK</div>
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

// -------------------------------------------------------------
// 🚀 INITIALIZATION
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // 1. Guard authentication and rules commitment
  currentUser = Habitism.requireAuth(true);
  if (!currentUser) return;

  // 2. Load saved task mode
  const savedMode = localStorage.getItem("habitism_task_mode");
  if (savedMode === "custom" || savedMode === "presets") {
    activeTaskMode = savedMode;
  }

  // 3. Load Level & Setup
  loadCurrentLevelIndex();
  updateNavbarBadges();
  renderCalendar(currentCalendarDate);
  renderChecklist();
});


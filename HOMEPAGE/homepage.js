// ============================================================================
// 🌟 PRESET LEVELS CREATED PERSONALLY BY THE DEVELOPER
// ============================================================================
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

// ============================================================================
// 📅 PART 1: CALENDAR LOGIC (WITH GREEN, ORANGE, WHITE-BLUE TIERS)
// ============================================================================
let currentCalendarDate = new Date();

function getTodayString() {
  return new Date().toDateString();
}

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
  const year = date.getFullYear();
  const month = date.getMonth();

  // Update Month Title
  document.getElementById("monthYear").innerText =
    date.toLocaleString("default", { month: "long" }).toUpperCase() + " " + year;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = "<thead><tr>";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let d of days) html += `<th>${d}</th>`;
  html += "</tr></thead><tbody><tr>";

  // Blank slots before first day
  for (let i = 0; i < firstDay; i++) {
    html += "<td></td>";
  }

  // Days of Month
  for (let day = 1; day <= daysInMonth; day++) {
    const today = new Date();
    const cellDate = new Date(year, month, day).toDateString();
    let classes = "";

    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      classes += "today ";
    }

    const completedCount = getDayCompletedCount(cellDate);

    // 🌟 Cal Highlight Tiers:
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
  // Cycle manually through tiers if clicked: 0 -> 5 (Green) -> 6 (Orange) -> 8 (White-Blue) -> 0
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
      if (i === 0) continue; // Allow today to not break streak if not finished yet
      break;
    }
  }

  const streakEl = document.getElementById("streakDisplay");
  if (streakEl) {
    streakEl.innerHTML = `🔥 Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`;
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


// ============================================================================
// 📝 PART 2: LEVEL-BASED HABIT CHECKLIST & DYNAMIC THEMES
// ============================================================================
let currentLevelIndex = 0;

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

// Get user tasks for a specific level (preset + any custom added tasks)
function getLevelTasks(levelId) {
  const key = `habitism_tasks_lvl_${levelId}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  // Fallback to preset level tasks
  const preset = DEVELOPER_LEVELS.find(l => l.id === levelId);
  return preset ? JSON.parse(JSON.stringify(preset.tasks)) : [];
}

function saveLevelTasks(levelId, tasks) {
  localStorage.setItem(`habitism_tasks_lvl_${levelId}`, JSON.stringify(tasks));
}

// Get today's checked task indices for this level
function getLevelChecks(levelId) {
  const todayKey = `habitism_checks_${levelId}_${getTodayString()}`;
  const saved = localStorage.getItem(todayKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return {};
}

function saveLevelChecks(levelId, checks) {
  const todayKey = `habitism_checks_${levelId}_${getTodayString()}`;
  localStorage.setItem(todayKey, JSON.stringify(checks));
}

function renderChecklist() {
  const level = DEVELOPER_LEVELS[currentLevelIndex];
  const tasks = getLevelTasks(level.id);
  const checks = getLevelChecks(level.id);
  const checklistCard = document.querySelector(".checklist-card");

  // 1. DYNAMIC CONTAINER COLORING
  // 6-7 items -> bright orange
  // 8+ items -> bright white-blue
  checklistCard.classList.remove("theme-orange", "theme-white-blue");
  const totalCount = tasks.length;
  if (totalCount >= 8) {
    checklistCard.classList.add("theme-white-blue");
  } else if (totalCount >= 6) {
    checklistCard.classList.add("theme-orange");
  }

  // 2. Render Header with Title and Level Info Tooltip
  const levelNameEl = document.getElementById("levelNameText");
  const levelBadgeEl = document.getElementById("levelBadge");
  const levelInfoWrap = document.getElementById("levelInfoWrap");

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

  // 3. Render Tasks List
  const listEl = document.getElementById("habitList");
  listEl.innerHTML = "";

  let completedToday = 0;

  tasks.forEach((task, index) => {
    const isCompleted = !!checks[index];
    if (isCompleted) completedToday++;

    const li = document.createElement("li");
    li.className = `habit-item ${isCompleted ? "completed" : ""}`;

    // Task text + optional info button
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

  // 6. UPDATE TODAY'S CALENDAR TIER AUTOMATICALLY
  // Count how many habits are completed for today
  setDayCompletedCount(getTodayString(), completedToday);
  renderCalendar(currentCalendarDate);
}

function toggleTask(index) {
  const level = DEVELOPER_LEVELS[currentLevelIndex];
  const checks = getLevelChecks(level.id);
  checks[index] = !checks[index];
  saveLevelChecks(level.id, checks);
  renderChecklist();
}

function addTask(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("newHabitInput");
  const text = input.value.trim();
  if (!text) return;

  const level = DEVELOPER_LEVELS[currentLevelIndex];
  const tasks = getLevelTasks(level.id);
  tasks.push({ text: text });
  saveLevelTasks(level.id, tasks);

  input.value = "";
  renderChecklist();
}

function deleteTask(event, index) {
  event.stopPropagation();
  const level = DEVELOPER_LEVELS[currentLevelIndex];
  const tasks = getLevelTasks(level.id);
  tasks.splice(index, 1);
  saveLevelTasks(level.id, tasks);

  // Re-index checks
  const checks = getLevelChecks(level.id);
  const newChecks = {};
  let newIdx = 0;
  for (let i = 0; i <= tasks.length; i++) {
    if (i === index) continue;
    if (checks[i]) newChecks[newIdx] = true;
    newIdx++;
  }
  saveLevelChecks(level.id, newChecks);
  renderChecklist();
}

// Level Navigation (◀ ▶)
function prevLevel() {
  if (currentLevelIndex > 0) {
    currentLevelIndex--;
  } else {
    currentLevelIndex = DEVELOPER_LEVELS.length - 1; // loop around
  }
  saveCurrentLevelIndex();
  renderChecklist();
}

function nextLevel() {
  if (currentLevelIndex < DEVELOPER_LEVELS.length - 1) {
    currentLevelIndex++;
  } else {
    currentLevelIndex = 0; // loop around
  }
  saveCurrentLevelIndex();
  renderChecklist();
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

// ============================================================================
// 🚀 INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadCurrentLevelIndex();
  renderCalendar(currentCalendarDate);
  renderChecklist();
});

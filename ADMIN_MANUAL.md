# 👑 HABITISM — Administrator Manual

## Access & Authentication
- **Portal URL**: `admin.html`
- **Role Requirement**: Only accounts with `role === 'admin'` can access the Administrator Control Panel and protected `/api/admin/*` endpoints.
- **Logging In**:
  1. Navigate to `login.html`.
  2. Under **"WHO ARE YOU?"**, select **👑 Administrator**.
  3. Enter your administrator credentials (e.g., pre-seeded `admin` / `admin123`) and click **Log In as Administrator**.
  4. Selecting *Standard User* while logging in with an admin account will block login with a role-mismatch warning.

---

## Dashboard Overview
The Administrator Control Panel (`admin.html`) provides real-time operational oversight across four core metric cards and four management modules:

### Top-Level Metrics
1. **👥 Registered Accounts**: Total number of registered participants.
2. **🔥 Active Streaks Total**: Cumulative uninterrupted streak days across all users.
3. **🪙 Circulating Coins**: Total coins currently held across all user balances.
4. **📢 Accountability Alerts**: Total Facebook Graph API social accountability posts logged.

---

## 1. User Management & Inspection
Located in the **👥 User Accounts & Habits Inspection** panel. Use the search bar to filter users by name, username, or email, or filter by role (`All Roles`, `Standard Users`, `Administrators`).

| Action | Button / Icon | Operational Description |
| :--- | :---: | :--- |
| **Inspect User** | `🔍 Inspect` | Opens the **User Habit Routine & Security Modal** showing account creation date, masked password, Core Verifier answer, active routine mode, checklist items, and recent daily activity log. |
| **View Stored Password** | `👁️ View Password` | Located inside the Inspect Modal (and table row). Requires **Admin Re-Authentication** (entering your own admin password) before revealing the target user's stored plaintext password. |
| **Change Password** | `🔑 Password` | Manually override and set a new password for any user account. |
| **Delete User** | `🗑️ Delete` | Permanently removes a non-admin user account and all associated habit logs, tasks, and history. |

### Inside the User Inspection Modal: Checklist Controls
- **🔓 Remove Locked Checks**: Removes the daily Piggybank claim padlock so the user's checkboxes can be unchecked again.
- **🔄 Reset Checklist Progress (Uncheck All)**: Unchecks all habit checkboxes for the user's active day and resets progress to `0%`.
- **📅 Edit Calendar Date**: Launches the Calendar Manager pre-selected for that user.

---

## 2. Quick Adjustments (Per User Row)
Each row in the User Accounts table includes rapid adjustment controls for live state management:

| Control | Function & Behavior |
| :--- | :--- |
| **❄️ Freeze** | Add or deduct Streak Freezes for the user (enter a positive number like `2` to add, or a negative number like `-1` to remove). |
| **🪙 Coins** | Add or deduct Habit Coins from the user's main balance (supports positive or negative integers). |
| **🔥 Streak** | Directly set the user's active streak counter to a specific number of consecutive days. |
| **📅 Edit User Calendar** | Opens the **Manage User Calendar** modal. Select any past, current, or future date, set status (`Completed` or `Incomplete`), and set the completed task count (`0` = empty, `5` = Green glow, `6–7` = Orange glow, `8+` = Light Blue glow). |

---

## 3. Pending Password Change Requests & Recovery Tickets
Located in the **🔑 Pending Password Change Requests** panel (`#passwordRequestsPanel`).

### Recovery Workflow
When a user submits a Forgot Password / Account Recovery form, a row is created with status `pending` and a unique ticket (`AAAAAA000000`).

1. **Review Request Columns**:
   - **Ticket Number**: Unique 12-character code (`6 uppercase letters + 6 digits`).
   - **Target Username**: The account requesting recovery, along with their submitted creation date and last remembered password.
   - **Requested New Password**: The new password requested by the user.
   - **Request Date**: Timestamp of submission.
   - **Core Verifier Answer**: Shows both the user's **Submitted Answer** and their **Stored Signup Record** side-by-side for administrator verification.
2. **Take Action**:
   - Click **✅ Approve**: Updates the user's password to their requested new password, marks the ticket as `approved`, and automatically publishes a status post to the **Habitism Facebook Page** containing the **Ticket Number** and **Status: Approved**.
   - Click **❌ Reject**: Leaves the user's password unchanged, marks the ticket as `rejected`, and publishes a status post to the **Habitism Facebook Page** containing the **Ticket Number** and **Status: Rejected**.

---

## 4. Accountability Feed & Deadline Controls
Located in the **📢 Facebook Graph API Accountability Feed** panel. Connects to the public Habitism Facebook Page (`ID: 1496888330165860`).

| Control Button | Operational Function |
| :--- | :--- |
| **⚡ Trigger Test Post** | Dispatches a live or simulated test post to verify Facebook Graph API token connectivity. |
| **📢 Post Punishment** | Manually publishes a public social accountability penalty post for a specific user (prompts for User ID, target date, and custom message). |
| **⏰ Set Deadline** | Configures the daily habit evaluation deadline (`HH:MM` 24-hour format) for a specific user or globally across the platform. |
| **🗑️ Delete Post** | Removes an accountability log entry (and deletes the corresponding Facebook Page post via Graph API if published live). |

---

## 5. User Feedback Management
Located in the **💬 User Feedback** panel (`#userFeedbackPanel`).

1. **Filtering**:
   - Filter by **Status**: `All Statuses`, `New`, `Read`, `Resolved`.
   - Filter by **Type**: `All Types`, `Idea`, `Concern`, `Bug Report`.
2. **Inspecting & Updating Status**:
   - Click **👁️ View** (or click any feedback row) to open the **User Feedback Details** modal.
   - Review the submitter's name, contact email, submission timestamp, and full message content.
   - Update the review status using **⚪ Mark New**, **👁️ Mark Read**, or **✅ Mark Resolved**.

---

## 6. Admin Security & Re-Authentication Protocol
- **Protected Password Reveal**: Viewing a user's stored password (`POST /api/admin/users/:targetUserId/view-password`) requires the administrator to re-enter their own admin password in the **Confirm Admin Identity** modal.
- **5-Minute Verified Session**: Once verified, an active re-authentication session is cached for **5 minutes** (indicated by the green `🔓 Verified (5m) • Lock` badge in the top navbar). Click the badge at any time to immediately lock the session.
- **Role Enforcement**: Every `/api/admin/*` backend route strictly verifies `role === 'admin'` before executing any read or write operation.

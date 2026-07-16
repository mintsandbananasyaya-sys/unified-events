# Commands

## Commands

Here are the available bot commands:
**/setign** — Link your Minecraft IGN
**/status** — Check your application status
**/forms** — Open a ticket, report, or talk to staff
**/ask** — Ask the bot a question
**/schedule** — View the event schedule
**/notify** — (Staff) Send notifications
**/bot-message** — (Staff) Post a styled announcement
**/purge** — (Staff) Delete messages
**/mute** — (Staff) Mute a member
**/kick** — (Staff) Kick a member
**/ban** — (Staff) Ban a member
**/unsetign** — (Staff) Remove a player's IGN

<!-- aliases: `commands`, `bot commands`, `what commands`, `list of commands`, `slash commands`, `what can the bot do` -->

<!-- source: brain2.js; id: brain2-20 -->

---

## Ask Command

Run **/ask <question>** to get an instant answer from the bot's knowledge base. This covers verification, applications, commands, rules, tiers, and more. If the bot doesn't know, contact staff via **/forms**.

<!-- aliases: `ask command`, `/ask`, `how does ask work`, `faq command` -->

<!-- source: brain2.js; id: brain2-23 -->

---

## Schedule Command

Run **/schedule** to check the current event schedule. If no schedule has been confirmed yet, the bot will let you know. Keep an eye on the announcements channel for schedule updates.

<!-- aliases: `schedule command`, `/schedule`, `what is the schedule`, `event schedule`, `when does the season start` -->

<!-- source: brain2.js; id: brain2-24 -->

---

## Notify Command

**/notify** is a staff-only command. Staff can use it to send a notification DM to:
• A **specific user** — `/notify title: ... message: ... user: @someone`
• A **specific role** — `/notify title: ... message: ... role: @RoleName`
• **Everyone** — `/notify title: ... message: ...` (leave user and role empty)
All notifications also appear on the recipient's Unified Events dashboard.

<!-- aliases: `notify command`, `/notify`, `how to notify`, `send notification`, `dm everyone` -->

<!-- source: brain2.js; id: brain2-25 -->

---

## Purge Command

**/purge** is a staff-only command. Usage: `/purge amount: <1-100>` to delete up to 100 recent messages. You can optionally add `lockdown: 10m` to lock the channel for a set duration after purging. Messages older than 14 days cannot be bulk deleted due to Discord's limits.

<!-- aliases: `purge command`, `/purge`, `delete messages`, `clear messages`, `bulk delete` -->

<!-- source: brain2.js; id: brain2-26 -->

---

## Mute Command

**/mute** is a staff-only command. Usage: `/mute user: @someone reason: <reason> time: <duration>`. Duration uses shorthand like `10m`, `2h`, `1d`. The bot DMs the user with the reason and duration, logs it to the staff channel, and creates a dashboard notification.

<!-- aliases: `mute command`, `/mute`, `how to mute`, `muted`, `mute someone` -->

<!-- source: brain2.js; id: brain2-27 -->

---

## Kick Command

**/kick** is a staff-only command. Usage: `/kick user: @someone reason: <reason> time: <duration>`. The bot DMs the user before kicking them, logs the action, and posts a staff channel notification.

<!-- aliases: `kick command`, `/kick`, `how to kick`, `kick someone` -->

<!-- source: brain2.js; id: brain2-28 -->

---

## Ban Command

**/ban** is a staff-only command. Usage: `/ban user: @someone reason: <reason> time: <duration>`. The bot DMs the user before banning them, logs the action, and posts a staff channel notification.

<!-- aliases: `ban command`, `/ban`, `how to ban`, `ban someone` -->

<!-- source: brain2.js; id: brain2-29 -->

---

## Bot Message Command

**/bot-message** is a staff-only command. It sends a styled embed to any channel. Usage: `/bot-message channel: #channel title: <title> message: <body> color: blue/red`. The embed includes the Unified Events logo thumbnail.

<!-- aliases: `bot message command`, `/bot-message`, `announcement embed`, `styled message`, `how to make announcement` -->

<!-- source: brain2.js; id: brain2-30 -->

---

## Staff Chat

To chat directly with staff, run **/forms** and reply with **4**. This opens a private support thread in the staff channel. Note: this is not anonymous — staff will know it's you.

<!-- aliases: `staff chat`, `talk to staff`, `direct staff`, `chat with staff` -->

<!-- source: brain2.js; id: brain2-41 -->

---

## Session Expired

Sessions on the website last 7 days. If you keep getting logged out, it may be because the server restarted (which clears memory-based sessions). Try logging in again — the fix is in place to persist sessions in the database. If it keeps happening, open a ticket via **/forms**.

<!-- aliases: `session expired`, `logged out`, `keeps logging me out`, `session not persisting` -->

<!-- source: brain2.js; id: brain2-67 -->

---

## Faq

You can ask me anything with **/ask <question>**! I cover applications, verification, commands, tiers, rules, and more. If I don't know the answer, open a ticket via **/forms** and a staff member will help.

<!-- aliases: `faq`, `frequently asked questions`, `common questions`, `help guide` -->

<!-- source: brain2.js; id: brain2-71 -->

---

## Thank You

No problem! If you need anything else, use **/ask <question>** or open a support ticket with **/forms**. Good luck with your application!

<!-- aliases: `thank you`, `thanks`, `cheers`, `ty`, `helpful`, `great bot` -->

<!-- source: brain2.js; id: brain2-72 -->

---

## Hello

Hey! I'm the Unified Events bot. I can answer questions about the server, applications, verification, commands, and more. Try **/ask <your question>** or run **/forms** if you need to speak to staff.

<!-- aliases: `hello`, `hi`, `hey`, `sup`, `what's up`, `yo`, `good morning`, `good evening` -->

<!-- source: brain2.js; id: brain2-73 -->

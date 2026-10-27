You are working in my Chrome extension "Checklist" (Manifest V3). It already has a popup with a task list, dark/wide mode settings, and a daily reminder window. Read the existing code first and follow its structure, framework, styling approach and naming. Do not add new libraries unless there is no reasonable alternative; if you think one is needed, ask me first.

## Goal

Add a second tab called "English" next to the existing tasks view. It lets me save English words and sentences I use at work, together with their Vietnamese meaning, and copy or listen to them quickly. Keep the UI simple: one list, one search box, one filter, one add bar.

## Data model

Store everything in ONE array in chrome.storage.sync (fall back to chrome.storage.local if the data gets close to the sync quota). Key: "englishItems".

type EnglishItem = {
id: string; // crypto.randomUUID()
type: "word" | "sentence";
en: string; // may contain [brackets] for parts I replace, e.g. "I'll have it done by [end of day]."
vi: string; // Vietnamese meaning, may be empty
pos?: string; // part of speech for words: noun, verb, phrasal verb, phrase…
example?: string;
createdAt: number;
// used by "phrase of the day":
nextReviewAt?: number;
}

Write a small storage module (load, add, remove, update, subscribe to chrome.storage.onChanged) so the popup and the reminder window share the same data.

## UI: popup header

- Segmented switch at the top: "Tasks" | "English". Remember the last selected tab in storage.
- Keep the existing dark style: background #1C1D20, surface #232529, border #34363B / #4A4C52, text #ECECEE, muted #9A9CA3, accent teal #5BB89E (text on it #0E2A23), light teal #8FDCC4 on #23382F for highlights. Reuse existing CSS variables if they exist instead of hard-coding.

## UI: English tab

1. Toolbar: a search input ("Search English or Vietnamese") and a 3-way segmented filter: All / Sentences / Words, each showing its count.
   - Search is case-insensitive and matches both `en` and `vi`, ignoring Vietnamese diacritics (normalize with NFD and strip combining marks, map đ→d).
2. List: newest first. Each row:
   - Line 1: the English. Words are bold (17px, weight 600) with the part of speech in small muted text after them. Sentences are normal weight (16px). Render [bracketed] parts as highlighted spans (light teal text on dark teal background) WITHOUT the brackets.
   - Line 2: the Vietnamese meaning in muted text (lang="vi").
   - Right side: two 40×40 icon buttons: Listen and Copy, each with an aria-label.
     - Listen: speechSynthesis with lang "en-US", text without brackets; cancel any speech already playing first.
     - Copy: navigator.clipboard.writeText with the brackets removed. The icon turns into a check on a teal background for 1.2 s.
   - Clicking the text area (a real <button> with aria-expanded) expands the row to show the example in italics and a "Delete" text button. Only one row is expanded at a time.
   - Delete removes the item and shows an "Undo" toast for 5 seconds.
3. Empty states:
   - No items at all: a short line explaining how to add the first one.
   - No search results: `Nothing matches "<query>"`, with a hint that it can be added below.
4. Add bar fixed at the bottom:
   - Two inputs side by side: "English word or sentence" (wider) and "Nghĩa tiếng Việt", plus an "Add" button (disabled style when English is empty).
   - Enter in either input saves.
   - Auto-detect the type: sentence if it has more than 3 words or ends with . ? or !; otherwise a word.
   - A hint line under the inputs updates as I type: "Will be saved as a word." / "Will be saved as a sentence. Tip: put parts you change in [brackets]."
   - After saving: clear both inputs, keep focus in the English input, briefly highlight the new row, and switch the filter to match its type unless "All" is selected.
   - Prevent exact duplicates (same `en`, case-insensitive, trimmed): scroll to and highlight the existing row instead.

## Phrase of the day (in the existing reminder window)

When the reminder window opens, add a "Phrase of the day" card below the tasks:

- Pick one item whose nextReviewAt is empty or in the past (prefer sentences, then words; random among ties).
- Show the Vietnamese and ask "How do you say this in English?". A "Show the English" button reveals it, with a Listen button.
- Two buttons: "Show again tomorrow" (nextReviewAt = +1 day, reviewStreak = 0) and "I knew it" (reviewStreak + 1, nextReviewAt = +[1, 3, 7, 14, 30] days by streak).
- Show "N-day streak" (consecutive days I reviewed at least one item; store it in storage).
- Hide the card if there are no items.
- Add a setting "Practise English in reminders" (on by default) in the existing settings panel.

## Starter data

On first install only (when "englishItems" does not exist), seed these items:
Words: stakeholder (noun, bên liên quan), prioritize (verb, ưu tiên), on track (phrase, đúng tiến độ), workload (noun, khối lượng công việc), follow up (phrasal verb, nhắc lại, theo dõi tiếp), deadline (noun, hạn chót).
Sentences:

- "Could you walk me through [the timeline]?" — "Bạn có thể giải thích giúp mình [tiến độ] được không?"
- "I'm following up on [my email from Monday]." — "Mình nhắn lại về [email hôm thứ Hai]."
- "I'm currently blocked on [the API review]." — "Hiện mình đang bị kẹt ở [phần review API]."
- "I'll have it done by [end of day]." — "Mình sẽ làm xong trước [cuối ngày]."
- "Do you have a minute to look at [this bug]?" — "Bạn có rảnh một phút xem giúp mình [lỗi này] không?"
- "I see your point, but I'm concerned about [the deadline]." — "Mình hiểu ý bạn, nhưng mình hơi lo về [deadline]."
- "Please let me know if you have any questions." — "Nếu có câu hỏi gì, bạn cứ báo mình nhé."
  Add one short example sentence for each.

## Accessibility and quality

- Use real <button>/<input>/<label> elements, visible focus styles, aria-labels on icon-only buttons, and touch targets of at least 40px.
- Full keyboard use: "/" focuses search when the English tab is active, Esc clears search, Enter adds.
- Must work in both the normal and the wide popup sizes, with no horizontal scroll.
- Write unit tests for: type detection, bracket parsing/stripping, diacritic-insensitive search, the review scheduling rule, and duplicate detection.

## How to work

1. First, summarize the existing structure and tell me which files you will add or change. Wait for my OK.
2. Then implement in small commits: storage module → English tab list and search → add bar → copy/listen → phrase of the day → settings → tests.
3. At the end, give me a short checklist to test manually in Chrome.

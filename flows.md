# Flows

Dayplan's three flows: the first visit, the main task, and coming back.

## First visit

> **I open Dayplan with nothing saved → I read what it's for → I set when I'm usually done for the day → I add my first task by tapping an example, for today or another day → I land on Today (or At a Glance, for a later day), with a one-time hint on how it works.**

```mermaid
flowchart TD
  A([Open Dayplan]) --> B{Anything saved?}
  B -- Yes --> T[Today, no onboarding]
  B -- No --> W0["/welcome step 1 of 3: overview, what Dayplan is and how it works"]
  W0 -- Get started --> W1["Step 2 of 3: When do you wrap up?"]
  W1 -- Back --> W0
  W1 -- error next to the question --> W1
  W1 -- Continue: time saved --> W2["Step 3 of 3: Add your first task (tap an example or type)"]
  W2 -- Back --> W1
  W2 -- error next to field, input kept --> W2
  W2 -- "I'll add tasks later" --> E[Today, no hint]
  W2 -- Add, for Today --> H[Today + one-time hint]
  W2 -- Add, for Tomorrow or another day --> D[At a Glance + one-time hint]
```

## Main task

> **I jot a task for a certain day → it's on that day's list → I check it off → at my wrap-up time, I keep or push what's left; if I don't, it rolls over to tomorrow.**

```mermaid
flowchart LR
  A["Jot a task + pick a day (/add or quick-add)"] -->|error next to field, input kept| A
  A -->|valid| B["It's on that day's list (highlighted)"]
  B --> C["Check it off (strikethrough; uncheck to undo)"]
  C --> D{Past my wrap-up time and tasks left?}
  D -- No, all done --> E[All clear: plan tomorrow]
  D -- Yes --> F[Wrap up your day card]
  F -- Keep for tomorrow / Pick a day / Let it go --> G([Day wrapped])
  F -- Not now / ignored --> H["Next day: it rolls over, shown under 'Rolled over · N' on Today"]
  H -- Move all to today / Check off / Edit --> B
```

**Steps**
1. **Jot a task for a day:** on `/add` (Task + Day: Today, Tomorrow, or Pick a day), or quick-add on Today.
2. **It's on that day's list:** you land on Today, or At a Glance for a later day, with the new task highlighted.
3. **Check it off:** it's struck through. Uncheck to undo.
4. **Wrap up:** at your wrap-up time, a card offers Keep for tomorrow, Pick a day, or Let it go for each task left.
5. **Otherwise, roll over:** unfinished tasks move to the next day, under **Rolled over** on Today.

**States**
- Loading (a skeleton, never a flash of "empty")
- Empty day, with a button to add a task
- Just added (highlighted)
- All done for the day
- Wrap-up due, dismissed, or wrapped
- Rolled over tasks waiting

**Errors** (shown next to the field, saying what to do next, keeping what you typed)
- "Enter a task name."
- "Shorten this to 120 characters or fewer."
- "Pick a day for this task." / "Pick today or a later day." / "That's not a real date. Check the year."
- A task already on that day, or very similar to one: a soft warning. Press Add again to keep both.
- A date more than a year away: a soft warning to check the year.
- The browser can't save, storage is full, or saved data can't be read: a banner says so.

## Coming back

> **I come back in the evening → at my wrap-up time Dayplan asks what to do with what's left → I keep it for tomorrow, move it, or let it go → if I skip that, tomorrow it has rolled over to the next day.**

```mermaid
flowchart TD
  A([Come back to Dayplan]) --> B{A new day since my last visit?}
  B -- No --> C{Past my wrap-up time, with tasks left?}
  C -- No --> T[Today, exactly as I left it]
  C -- Yes --> W[Wrap up your day card]
  W -- Keep for tomorrow / Pick a day / Let it go / Move all to tomorrow --> X(["Day wrapped. 4 done today."])
  W -- Not now --> N[Hidden for tonight]
  N -- Wrap up now --> W
  B -- Yes --> E{Unfinished tasks left from earlier days?}
  E -- No --> P[Today, with anything planned for today]
  E -- Yes --> F["They roll over onto today: 'Rolled over · N' on Today"]
  F -- Move all to today / Check off / Edit --> P
```

# Flows

Dayplan's three flows: the first visit, the main task, and coming back.

## First visit

> **I open Dayplan with nothing saved → I read what it's for → I set when I'm usually done for the day → I choose where my weather comes from → I add my first task by tapping an example, for today or another day → I land on Today (or At a Glance, for a later day), with a one-time hint on how it works.**

```mermaid
flowchart TD
  A([Open Dayplan]) --> B{Anything saved?}
  B -- Yes --> T[Today, no onboarding]
  B -- No --> W0["/welcome step 1 of 4: overview, what Dayplan is and how it works"]
  W0 -- Get started --> W1["Step 2 of 4: When do you wrap up?"]
  W1 -- Back --> W0
  W1 -- error next to the question --> W1
  W1 -- Continue: time saved --> WX["Step 3 of 4: Show the weather for your day?"]
  WX -- Back --> W1
  WX -- "Use my location: browser allows" --> WS[(Saved: location, rounded to ~1 km)]
  WX -- "Browser blocks, or Pick a city instead" --> WC["Which city's weather? (search)"]
  WC -- "no match / search down: error under the field" --> WC
  WC -- Pick a result --> WP[(Saved: that city)]
  WC -- Skip weather --> WO[(Saved: off)]
  WS --> W2["Step 4 of 4: Add your first task (tap an example or type)"]
  WP --> W2
  WO --> W2
  W2 -- Back --> WX
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

## Weather

> **I open Today → I see the weather where I am (or my chosen city) → the week ahead sits next to each day on At a Glance → it stays current while I use the app, without asking the API more than it needs to.**

Where it comes from is chosen once, in onboarding (or on Today, for anyone who signed up before weather existed), and saved in Supabase (`user_settings`):
- **Location:** this device's position when the browser allows it; otherwise the last saved coordinates.
- **City:** the searched city, always.
- **Off:** no weather anywhere.

**When it's fetched** (from the browser; Open-Meteo needs no key, and each person's requests count against their own limit):
- When the app opens.
- On a page switch, on returning to the tab, and on a check every 5 minutes, but only if the forecast is 30+ minutes old.
- Never while the tab is in the background. After a failed call, not again for 5 minutes.

**States**
- Loading: a placeholder the size of the card.
- Not chosen yet, or "location" with no position shared and none saved: the card asks (location → city → off).
- Off: nothing shown.
- API down: "Weather is unavailable right now. Your tasks are fine." If an earlier forecast exists, it stays, with "Couldn't refresh."
- City search: "No places match…" when nothing is found; "City search isn't working right now…" when the API is down.
- Settings can't load (Supabase unreachable): a short message; onboarding lets you continue without weather.


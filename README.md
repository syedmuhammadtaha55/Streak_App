# Streak

A simple, calm habit tracker. Add habits, check them off each day, and watch your streak grow.

## It never nags

- No notifications, reminders, or badges.
- No red "missed" marks or guilt messages. A broken streak quietly returns to 0.
- A streak isn't shown as broken just because you haven't checked in *yet* today — it holds from yesterday until the day is over.

## Use it

- **Add** a habit with the box at the top.
- **Tap the circle** to check it off for today. Tap again to undo.
- The number on the right is your current streak; the dots show the last 7 days.
- **⋯** lets you rename or delete a habit and shows your best streak.

Your data stays on your device (browser `localStorage`). Nothing is sent anywhere.

## Run it

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Opening `index.html` directly also works (offline install needs `http://`). On a phone, use "Add to Home Screen" to install it as an app that works offline.

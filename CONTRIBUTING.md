# Contributing

## Find in History test data

To stress-test **Find in History** (Cmd/Ctrl+Shift+F) without a large real archive, seed fake sessions:

```bash
node scripts/seed-find-history.mjs
node scripts/seed-find-history.mjs --sessions 80 --messages 300
```

Defaults are 5000 sessions × 200 messages. Files are written to:

```text
~/Library/Application Support/Switcheroo/sessions/
```

Each seeded transcript includes the marker `seed-find-token` on some messages. Open Find in History and search for that string. Use **Show results now** while searching to stop early and view partial matches.

Restart or reopen Switcheroo after seeding if it was already running, so new session folders are picked up on disk.

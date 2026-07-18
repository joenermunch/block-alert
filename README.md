# block-alert

`block-alert` is a zero-dependency CLI that puts a literal, full-screen red
macOS warning on screen when an agent is blocked. It is professionally urgent,
post-modern, and extremely online.

## Install

Install it on both the Mac and the VPS:

```sh
npm install --global block-alert
```

## Use on the Mac

```sh
block-alert --title 'AGENT IS BLOCKED!' --message 'Need approval to deploy.'
```

It activates a borderless red AppKit window above normal applications, plays a
sound, and remains until **AIGHT BET. I’M LOCKED IN.** is pressed. The default
message is: “bestie... the agent is absolutely cooked. pls provide human aura.”

## Use from the VPS

```sh
block-alert --relay-mac --title 'AGENT IS BLOCKED!' --message 'VPS task needs your input.'
```

Relay mode uses the pre-existing private `oracle-mac` SSH bridge. It opens the
alert in the logged-in Mac user session; it does not require a webhook, public
port, browser session, or copied secret.

## Agent hook

When a task becomes blocked, run:

```sh
block-alert --relay-mac --message 'task-123 is blocked: waiting for user approval'
```

On the Mac, omit `--relay-mac`. `--dry-run` prints the sanitized action without
showing anything.

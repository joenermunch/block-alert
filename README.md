# block-alert

`block-alert` is a zero-dependency CLI that shows an animated tiny pink
Buffering Braincell corner pet when an agent is blocked. It is post-modern and
extremely online, but never blocks your screen or input.

## Install

Install it on both the Mac and the VPS:

```sh
npm install --global block-alert
```

## Use on the Mac

```sh
block-alert --title 'AGENT IS BLOCKED!' --message 'Need approval to deploy.'
```

It opens a small floating card in the lower-right corner and
cycles 32 sprite frames every ~330 ms. It disappears after 15 seconds; click
its standard macOS red **X** at any time to close it sooner. `--duration 2..30`
changes that safe timeout. It never opens a modal, full-screen, kiosk, or
input-capturing window. The default message is:
“The process has reached the void. Your input is the only remaining event.”

## Keep it open while testing

```sh
block-alert --keep-open
```

This is an opt-in preview mode. The pet stays above normal apps, across
Spaces and full-screen apps, until you click the normal red **X**; closing it
also ends the command. It remains non-modal and never captures input.

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

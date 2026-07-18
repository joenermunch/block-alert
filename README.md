# agent-alert

`agent-alert` is a zero-dependency CLI that shows a transparent animated
desktop pet for agent status. It is visible without becoming a modal,
full-screen, kiosk, or input-capturing warning.

## Install

Install it on both the Mac and the VPS:

```sh
npm install --global agent-alert
```

## Use on the Mac

```sh
agent-alert --state blocked
agent-alert --state working
agent-alert --state blocked --compact
```

Full mode shows an animated comic bubble reading `ALL AGENTS WORKING` or
`AGENT(S) BLOCKED`. Compact mode replaces the bubble with a small animated
status symbol. Mascots animate at 24 FPS from 128-frame sequences.

Blocked mode plays a mascot-specific eight-note music-box melody, then repeats
it at a calm ten-second interval. Right-click the pet and choose **Mute sound** or
run with `--mute`. The right-click mute choice persists.

The melodies use Joseph SARDIN's real music-box recording
[Music box, C# #1](https://bigsoundbank.com/music-box-cd-1-s1868.html),
released under CC0 1.0, instead of synthesized sine-wave beeps.
There are 20 mascot options and 20 distinct melodies. Changing mascot with the
bottom arrows also previews that mascot's melody.

## Keep it open while testing

```sh
agent-alert --keep-open
```

This is an opt-in preview mode. Drag anywhere on the visible pet to move it.
Drag any edge to resize; the cursor changes to show move, resize, and arrow
hit areas. The frame is remembered for future alerts. Use the bottom arrows to
switch mascot. Right-click for **Compact status**, **Full status**,
**Mute sound**, and **Close**. There are no titlebar or close buttons.

## Use from the VPS

```sh
agent-alert --relay-mac --state blocked
```

Relay mode uses the pre-existing private `oracle-mac` SSH bridge. It opens the
alert in the logged-in Mac user session; it does not require a webhook, public
port, browser session, or copied secret.

## Agent hook

When a task becomes blocked, run:

```sh
agent-alert --relay-mac --state blocked
```

On the Mac, omit `--relay-mac`. `--dry-run` prints the sanitized action without
showing anything.

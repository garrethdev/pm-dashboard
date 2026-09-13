`StatusPill` is how state is shown. Every tone sits on the same neutral ground and only the word is coloured, so a column of pills reads as a severity ladder.

```jsx
<StatusPill tone="ok">Active</StatusPill>
<StatusPill tone="accent">Ramping</StatusPill>
<StatusPill tone="info">Scheduled</StatusPill>
<StatusPill tone="neutral">Paused</StatusPill>
<StatusPill tone="warn">Throttled</StatusPill>
<StatusPill tone="orange">Collapsing</StatusPill>
<StatusPill tone="danger">Banned</StatusPill>
<StatusPill tone="critical">Shadowbanned</StatusPill>
```

A new state word maps onto one of these tones; it never gets a new colour. Don't add a dot or an icon.

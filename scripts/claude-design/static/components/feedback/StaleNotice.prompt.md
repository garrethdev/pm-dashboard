`StaleNotice` sits at the top of a card body whenever the data source is down and the panel is showing its last good copy.

```jsx
<StaleNotice fetchedAt="2026-09-13T10:30:00Z" />
```

This is the pattern for every degraded state: say how old the data is and what is therefore missing, rather than saying something "failed".

`CtaButton` is the one thing a screen is asking you to do, so use one per screen. It is the main place the cyan accent gets spent.

```jsx
<CtaButton>Generate</CtaButton>
<CtaButton href="https://…" target="_blank">Top up wallet</CtaButton>
<CtaButton tone="danger">Retire account</CtaButton>
```

Never use it for table-row actions, filters or anything that repeats; use `Button variant="secondary"` there. In the real app it has a pointer-following WebGL shine that this preview doesn't reproduce.

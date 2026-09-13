`BarcodeBar` shows how much of something is left, such as days of content cover per lane. Put the number beside it in tabular figures.

```jsx
<BarcodeBar pct={82} tone="ok" />
<BarcodeBar pct={30} tone="warn" />
<BarcodeBar pct={8} tone="danger" />
```

The tone comes from the state (ok, warn, danger), never from which row it is.

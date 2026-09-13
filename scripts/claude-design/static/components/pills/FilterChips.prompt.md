`FilterChips` echoes back which filters are on, just below the header row of a filtered table. Each chip clears one filter.

```jsx
<FilterChips chips={[{ key: "platform", label: "TikTok" }, { key: "character", label: "Char 3" }]} />
```

Pair it with the `Dropdown` that sets the filters. A filtered table with no chips looks identical to a table with no matches.

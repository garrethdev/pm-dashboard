`Dropdown` holds secondary filters and sort options, so a card header stays one row. The badge counts how many filters are on.

```jsx
<Dropdown label="Filters" badge={2} align="right">
  {(close) => <FilterPills options={[{ value: "all", label: "All" }, { value: "tt", label: "TikTok" }, { value: "ig", label: "Instagram" }]} />}
</Dropdown>
```

The panel uses the floating-panel glass. When filters are on, pair it with `FilterChips`.

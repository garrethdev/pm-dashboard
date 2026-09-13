`FilterPills` is the segmented switch for a card's main view filter. The selected segment takes the accent fill.

```jsx
<FilterPills options={[
  { value: "all", label: "All 29" },
  { value: "healthy", label: "Healthy 22" },
  { value: "attention", label: "Needs attention 7" },
]} />
```

Counts go inside the labels. Secondary filters such as platform and character belong in a `Dropdown`, not in more pills.

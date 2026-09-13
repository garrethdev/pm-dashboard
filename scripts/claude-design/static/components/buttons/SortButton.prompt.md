`SortButton` sorts a column or a list. A click cycles highest first, then lowest, then off; only the active one is tinted accent.

```jsx
<SortButton label="Views" active dir="desc" />
<SortButton label="Last post" />
```

Countdown columns such as "days left" open on lowest first, because the rows about to expire are why you clicked.

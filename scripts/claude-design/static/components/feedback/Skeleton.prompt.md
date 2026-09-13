Skeletons are the loading state. A card's title renders straight away and only its body pulses.

```jsx
<CardSkeleton title="Accounts" lines={4} />
<TableSkeleton rows={6} />
<Skeleton width={120} height={20} />
```

Loading is not working. Something being generated, which can take a minute, needs a progress state with named steps, not a skeleton.

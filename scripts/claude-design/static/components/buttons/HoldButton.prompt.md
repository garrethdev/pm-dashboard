`HoldButton` is how every destructive action confirms: you press and hold for 1.1 seconds while a fill charges, and letting go early cancels.

```jsx
<HoldButton onConfirm={retire}>Retire</HoldButton>
<HoldButton tone="warn" onConfirm={overwrite}>Overwrite</HoldButton>
```

Put no warning paragraph above it and no "hold to confirm" label; the fill is the instruction. Never replace it with a type-the-name confirmation.

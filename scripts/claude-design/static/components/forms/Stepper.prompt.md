`Stepper` edits a number that is one share of a budget, such as posts per day per lane or cadence per content type.

```jsx
<Stepper label="Posts per day" hint="3 left" defaultValue={2} min={0} max={5} suffix="/day" />
<Stepper label="Cleora ASMR" hint="Over by 1" hintTone="danger" defaultValue={3} max={3} />
```

`max` is what is actually left, so + stops at the real limit. The hint states the remaining budget and never explains the control.

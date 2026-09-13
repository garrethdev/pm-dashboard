Cards are the dashboard's surfaces: 24px outside, 16px for anything nested inside. `DashCard` is the section card every page is built from. Its title is muted, filters sit in `toolbar` or `actions`, and "View all" or one `headerAction` is its exit.

```jsx
<DashCard title="Accounts" toolbar={<FilterPills options={…} />} actions={<Dropdown label="Filters">…</Dropdown>} viewAllHref="/accounts">
  …table…
</DashCard>
<Card>Plain card</Card>
<Card sunken>Calendar grid</Card>
<Card hero>The one accent card on the page</Card>
<Card glass>Needs a glow layer behind it</Card>
```

Space cards 12px apart. Use at most one `hero` per page. Don't nest a card inside a card; use a 16px-radius panel instead.

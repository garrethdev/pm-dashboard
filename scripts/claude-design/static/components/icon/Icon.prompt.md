`Icon` draws the dashboard's own icons, named as the app names them. They are Phosphor glyphs in the fill weight and always take the surrounding text colour.

```jsx
<Icon name="Search" size={14} />
<Icon name="ChevronRight" size={12} />
<Icon name="Users" size={16} />
```

Sizes are 12 inline with text, 14 in controls and 16 in the nav icon box. Use only the names in `icons.card.html`; if a glyph is missing, it has to be added to the app first.

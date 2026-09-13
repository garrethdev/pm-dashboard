`Avatar` is the account photo in table rows and on the account header. With no photo, or a photo that fails to load, it shows a themed silhouette.

```jsx
<Avatar src="https://…" size={32} />
<Avatar src={null} size={48} />
```

Expect many rows to show the silhouette, because platform photo links expire. Design rows so they still read well without photos.

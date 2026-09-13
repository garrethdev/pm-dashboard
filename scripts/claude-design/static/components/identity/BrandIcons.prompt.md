`TikTokIcon` and `InstagramIcon` label which platform a post, account or series belongs to.

```jsx
<span style={{ color: "var(--accent)" }}><TikTokIcon size={14} /></span>
<span style={{ color: "var(--info)" }}><InstagramIcon size={14} /></span>
```

They take their row's colour rather than brand colours. When a colour identifies the platform, as in charts and legends, TikTok is always `--accent` and Instagram is always `--info`.

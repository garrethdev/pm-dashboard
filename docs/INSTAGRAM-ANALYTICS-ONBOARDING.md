# Adding an Instagram account to analytics

Instagram numbers (views, likes, saves, shares, watch time) come straight from
Instagram, and Instagram only hands them over for accounts that have given our
app permission. This is the checklist for giving that permission. Do the steps
**in this order**.

Written 2026-09-14, after Profiles 64 and 65 were connected.

---

## Step 1 — Add the account as an Instagram Tester (always first)

Our Meta app is in **test mode**. In test mode, Instagram refuses any account
that hasn't been invited as a tester. Skip this and the login link in step 4
fails with **"Insufficient developer role"**.

**Send the invite** (on a computer):

1. Go to **developers.facebook.com → My Apps** and open the analytics app
   (Instagram App ID `1669907580821322`).
2. **App roles → Roles → Add People → Instagram Tester**.
3. Type the account's Instagram handle and submit.

If you can't see the app or can't add people, your Facebook login isn't an
admin on it. Ask whoever owns the app to send the invite.

**Accept the invite** (logged in as that Instagram account):

1. In a **web browser**, open **instagram.com/accounts/manage_access**.
2. Open the **Tester Invites** tab and click **Accept**.

Use the website. The Instagram phone app often doesn't show this tab.

## Step 2 — Switch the account to a Creator account

Personal accounts can't give permission. In the Instagram app:
**☰ menu → Settings and activity → For professionals → Account type and tools →
Switch to professional account → pick a category → Creator**. Skip the contact
details and Facebook Page prompts.

It worked when a **Professional dashboard** button appears on the profile.
Creator accounts are always public.

## Step 3 — Check the handle matches the dashboard exactly

The handle on Instagram must match the account's username in the dashboard
letter for letter. If it doesn't, connecting creates a second, blank copy of
the account (no character, no Geelark profile, posting not paused) instead of
updating the real one.

## Step 4 — Open the login link and tap Allow

Open this in a **browser logged in as that account**:

```
https://www.instagram.com/oauth/authorize?client_id=1669907580821322&redirect_uri=https://czed.app.n8n.cloud/webhook/ig-oauth-callback&response_type=code&scope=instagram_business_basic,instagram_business_manage_insights
```

- The browser has its own Instagram login, separate from the phone app. If it
  shows a login page, you'll need the account's password.
- When it works, the page says **"Token saved for <handle>"**. Check that the
  handle is the account you meant.

## Step 5 — Confirm, then wait for the stats run

- In Supabase, the account's `access_token` should now be filled in, and its
  `id` should have changed to a long Instagram number (a short number like 133
  means it never connected).
- Stats appear after the next **Analysis Engine** run in n8n (Sun, Mon, Wed and
  Fri at 8 AM New York time). It only looks back **7 days**, so connect an
  account within a week of the posts you want counted.
- Nothing else needs doing later. The same workflow renews each account's
  access automatically before it runs out (every 60 days).

---

## If something goes wrong

| What you see | What it means |
|---|---|
| "Insufficient developer role" | Step 1 wasn't done, or the invite wasn't accepted yet. |
| A login page you can't get past | The browser isn't logged in as the account; you need its password. |
| "Token saved" but for the wrong handle | A different account was logged into the browser. Tell whoever looks after the data so the wrong row can be checked. |
| Connected, but no posts in analytics | The stats run hasn't happened yet, or the posts are older than 7 days. |

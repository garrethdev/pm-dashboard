# Putting the testing agent on a phone

How the Air gets the ability to tap, swipe and screenshot an iPhone. The agent
is WebDriverAgent, Apple's UI-testing helper as packaged by the Appium project.
It is built once in Xcode on the Air and installed on each phone over USB.

This is the Geelark Exit Plan's rows 35 (install it on each phone) and 36
(screenshot and tap each phone from Czedrick's own Mac). For now both rows
cover phone 1 only (Garreth, 2026-10-01). Written 2026-10-01 from the first
real install, which Czedrick did on the Air over Screen Sharing.

## Where it stands

| | Agent installed | Answers on the Air | Screenshot + tap from Czedrick's Mac |
|---|---|---|---|
| Phone 1 (`00008020-0011142402F3002E`, iOS 18.5) | yes, 2026-10-01 | yes, `"ready" : true` | yes, 2026-10-01 |
| Phone 2 | not here yet | | |

**Rows 35 and 36 are done** for phone 1. When phone 2 arrives, do "Each new
phone" and then "The test from Czedrick's own Mac" on it.

## Done once on the Air (do not repeat)

All in the **phonefarm** account, which is an administrator.

- **Homebrew 7.0.7**, with its "Next steps" lines added to `~/.zprofile`.
- **Node 22** (`node@22`, added to the path in `~/.zprofile`) and
  **libimobiledevice**, which provides `idevice_id` and `iproxy`.
- **Terminal points at the full Xcode**: `xcode-select -p` prints
  `/Applications/Xcode.app/Contents/Developer`. Homebrew's installer had
  pointed it at Apple's cut-down tools, which Appium cannot use.
- **Appium** and its **xcuitest** driver. `appium driver doctor xcuitest`
  reported 0 required fixes. The two optional warnings, applesimutils and
  ffmpeg, are for pretend phones and screen recording and are not needed.
- **Xcode is signed in as garreth@arborvita.io.** The team is **Garreth
  Dottin**, role Admin: the paid membership, enrolled under Garreth's own name.
  A "Personal Team" install would stop working after 7 days; this one lasts a
  year.
- **Signing is set** on the WebDriverAgentRunner target (opened with
  `appium driver run xcuitest open-wda`): Automatically manage signing, team
  Garreth Dottin, bundle identifier
  `com.peptidemiracles.WebDriverAgentRunner` on both the top line and the iOS
  line.

**If anyone runs `appium driver update xcuitest`**, Appium replaces its copy
of the agent and these signing settings are lost. Set them again as above
before the next install.

## Each new phone

Steps marked **(Yurie)** need someone at the phones.

1. **(Yurie)** Plug the phone into the Air and unlock it. Tap **Trust** when it
   asks. Developer Mode must be on (set-up order in
   `docs/PHONE-FARM-TOOLING.md`) and Auto-Lock set to **Never** (Settings →
   Display & Brightness). Renaming the phone in Settings → General → About →
   Name, for example `Phone 2`, makes it easy to tell apart in Xcode.
2. In Terminal on the Air, `idevice_id -l` prints one ID per connected phone.
   The new line is the new phone. (This Xcode has no "Devices and Simulators"
   window, so this is where the ID comes from.)
3. Open the project with `appium driver run xcuitest open-wda` if it is not
   already open. In the bar at the top of Xcode, choose
   **WebDriverAgentRunner**, and next to it the new phone. Real phones show
   their iOS version (phone 1 showed 18.5); the simulators all show 27.0.
4. In WebDriverAgentRunner → **Signing & Capabilities**, a red "Device isn't
   registered" message means click **Register Device**.
5. **Product → Test** (Cmd-U). If a "codesign wants to access key" box
   appears, type the phonefarm password and click **Always Allow**.
6. **(Yurie)** The first time, the phone refuses the new app. Settings →
   General → **VPN & Device Management** → **Garreth Dottin** → **Trust**.
7. **Product → Test** again. It is running when the top of Xcode says
   "Testing WebDriverAgentRunner", the ■ stop button stays active, and the
   phone shows a black screen saying **"Automation Running. Hold both volume
   buttons to stop."** On phone 1 the first runs ended with "Test Completed"
   and a grey stop button; running it again was enough. The phone's message
   can stay up after the test has stopped, so trust the stop button.
8. **Check it answers.** In one Terminal window, leave this running (it says
   "waiting for connection"):

   ```
   iproxy 8100 8100 -u <phone ID>
   ```

   In a second window:

   ```
   curl http://localhost:8100/status
   ```

   `"ready" : true` and "WebDriverAgent is ready to accept commands" is a
   pass. The reply also says `com.facebook.WebDriverAgentRunner`; that is a
   fixed label inside the agent, not the name it was installed under.
9. Ctrl-C in the iproxy window, then ■ in Xcode. A copy left running from
   Xcode clashes with the one Appium starts in the test below.

**(Yurie), once a phone has the agent:** do not delete the
WebDriverAgentRunner app, and do not update iOS on the phones or Xcode on the
Air without telling Czedrick. An update can stop the agent until it is rebuilt.

## The test from Czedrick's own Mac (row 36)

This is the proof the warmup script needs: Czedrick's Mac driving a phone
over Tailscale, without Screen Sharing. **Passed on phone 1, 2026-10-01**:
from Czedrick's Mac, a session started on the Air's Appium, a screenshot came
back showing the phone's Settings screen, and a tap on General opened General
on the phone. The Team ID was not needed; the signing saved in Xcode was
enough. That run used Appium's address directly from Terminal rather than
Inspector, which is installed on Czedrick's Mac for doing it by hand.

1. **On the Air**, start Appium and leave it running. Click **Allow** if the
   Mac asks about incoming connections; only our Tailscale network can reach
   it.

   ```
   appium --address 0.0.0.0 --port 4723
   ```

2. **On Czedrick's Mac**, install **Appium Inspector** from the releases page
   of `github.com/appium/appium-inspector` (the `mac-arm64` file for his
   Mac; installed 2026-10-01). Before opening it,
   `curl http://100.85.112.50:4723/status` from his Mac should answer
   `"ready":true`. Remote Host `100.85.112.50` (the
   Air's other Tailscale address, `100.72.23.51`, if that one does not
   answer), Port `4723`, Path `/`.
3. Paste these settings, with the phone's ID:

   ```json
   {
     "platformName": "iOS",
     "appium:automationName": "XCUITest",
     "appium:udid": "<phone ID>",
     "appium:updatedWDABundleId": "com.peptidemiracles.WebDriverAgentRunner",
     "appium:bundleId": "com.apple.Preferences"
   }
   ```

   The last line opens the phone's Settings app, a harmless screen to practise
   on. TikTok stays untouched until the warmup script exists. Only if the
   session fails with a signing error, add `"appium:xcodeOrgId": "<Team ID>"`
   and `"appium:xcodeSigningId": "Apple Development"` (Team ID:
   developer.apple.com → Account → Membership details).
4. **Start Session**. The first one can take a few minutes.
5. **Pass:** the phone's Settings screen appears on Czedrick's Mac (the
   screenshot), and clicking **General** in that picture opens General on the
   real phone (the tap). End the session, change the phone ID, repeat for the
   next phone.

With phone 1 passing, row 36 is done, and so is the warmup runner's
milestone M1. The live view's phone day (`docs/LIVE-VIEW-TRACKER.md`,
step 6) can start.

## If something goes wrong

| What you see | Fix |
|---|---|
| `brew: command not found` | Run Homebrew's "Next steps" lines, open a new Terminal |
| "Developer Mode disabled" | (Yurie) Settings → Privacy & Security, bottom; restart |
| "Device is locked" / "Unable to launch" | Unlock the phone; Auto-Lock to Never |
| "No profiles found" / signing failed | Team must be Garreth Dottin, not a Personal Team |
| "Failed to register bundle identifier" | Use `com.peptidemiracles.WebDriverAgentRunner2` everywhere |
| Inspector cannot connect | Try `100.72.23.51`; check the `appium` window on the Air is still running |

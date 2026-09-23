import { notFound } from "next/navigation";
import { DeviceDetail } from "@/components/dashboard/device-detail";
import { parseRowId } from "@/lib/data/device-rules";
import { getAssignableAccounts, getDevice, signProofUrls, type Device } from "@/lib/data/devices";
import { getTodoBoard } from "@/lib/data/todo";
import {
  devicePlaceholder,
  parseDevicePageState,
  type TodoDevice,
} from "@/lib/data/todo-placeholder";
import {
  getRecentSessions,
  getSessionsToday,
  progressToday,
  type SessionProgress,
} from "@/lib/data/warmup-sessions";
import { etDateTime } from "@/lib/data/format";

/**
 * One phone — design ticket P5.
 *
 * `?demo=full|new|off` (and `?demo=1`, which means `full`) draws the invented
 * phone from `todo-placeholder.ts`, which is how the page is judged in states
 * live data will not produce on demand. Without it every block is live: the
 * day's work comes from the To-do page's own reader (PF-07), narrowed to this
 * phone, and the warmups from `warmup_sessions` (PF-04). A placeholder never
 * quietly replaces live rows — the same rule the Accounts page's by-phone view
 * follows.
 */
export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ proof?: string; demo?: string }>;
}) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const demoState = parseDevicePageState(query.demo);

  if (demoState) {
    const demo = devicePlaceholder(demoState);
    // A phone shaped like a real row, so the page below draws one code path.
    const device: Device = {
      id: 0,
      name: demo.name,
      model: demo.model || null,
      iosVersion: demo.iosVersion || null,
      proxy: demo.proxy || null,
      timezone: demo.timezone || null,
      proofPath: null,
      isActive: demo.isActive,
      notes: demo.notes || null,
      phoneNumbers: null,
      accounts: [],
    };
    return <DeviceDetail device={device} proofUrl={null} assignable={[]} demo={demo} />;
  }

  const id = parseRowId(rawId);
  if (id === null) notFound();

  const [{ data: device }, { data: assignable }] = await Promise.all([
    getDevice(id),
    getAssignableAccounts(),
  ]);
  if (!device) notFound();

  // Signed per request, never cached — the screenshot shows the phone's proxy
  // IP, so the link is short-lived and made with the service key.
  const proofUrl = device.proofPath
    ? ((await signProofUrls([device.proofPath]))[device.proofPath] ?? null)
    : null;

  // The phone's warmups, real rows since PF-04. Read here rather than inside
  // the component so the page stays one server round trip, and allowed to fail
  // softly: an unreadable history costs this card its list, not the page.
  //
  // Today on this phone is the To-do page's list for this phone alone, read by
  // the same function, so the two screens cannot disagree about what it owes.
  // A failed read is null, which the card says rather than claiming the phone
  // owes nothing.
  const [history, todaysSessions, board] = await Promise.all([
    getRecentSessions({ deviceId: id, limit: 25 }).catch(() => []),
    getSessionsToday({ deviceId: id }).catch(() => []),
    getTodoBoard(0, new Date(), { deviceId: id }).catch(() => null),
  ]);
  const onBoard = board?.devices.find((d) => d.id === String(id));
  // Only the accounts' own work. A ban's clean-up (P8) is for an account that
  // has already left this phone, and the approved block is one line per
  // account on it, so the clean-up stays on the To-do page.
  const today: TodoDevice | null = board
    ? {
        id: String(id),
        name: device.name,
        isActive: device.isActive,
        accounts: onBoard?.accounts ?? [],
      }
    : null;
  const handleOf = new Map(
    device.accounts.map((a) => [a.id, a.username ?? a.profile ?? `Account ${a.id}`]),
  );
  const warmups = history.map((w) => ({
    id: String(w.id),
    handle: handleOf.get(w.accountId) ?? `Account ${w.accountId}`,
    label: `Session ${w.sessionNo}`,
    when: etDateTime(w.finishedAt ?? w.startedAt),
    minutes: w.minutes,
    automated: w.mode === "script",
  }));
  // How each account on this phone stands today, so the log form can say what
  // its minutes are being added to.
  const progress: Record<string, SessionProgress[]> = {};
  for (const a of device.accounts) {
    progress[a.id] = progressToday(todaysSessions.filter((s) => s.accountId === a.id));
  }

  return (
    <DeviceDetail
      device={device}
      proofUrl={proofUrl}
      assignable={assignable}
      warmups={warmups}
      warmupProgress={progress}
      today={today}
      initialNotice={
        query.proof === "failed" && !device.proofPath
          ? "The phone was saved, but the screenshot did not upload. Add it here."
          : null
      }
    />
  );
}

"use client";

import { cn } from "@/lib/utils";

/** The editable text fields of a phone, as the form holds them (blank = not set). */
export interface DeviceFormValues {
  name: string;
  model: string;
  iosVersion: string;
  proxy: string;
  timezone: string;
  notes: string;
}

export const EMPTY_DEVICE_FORM: DeviceFormValues = {
  name: "",
  model: "",
  iosVersion: "",
  proxy: "",
  timezone: "",
  notes: "",
};

/** Every phone runs through a US proxy, so these are the zones it can report. */
const US_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
];

// text-base on a phone: iOS Safari zooms the page into any field under 16px.
export const DEVICE_INPUT =
  "w-full rounded-nested border border-border bg-card-raised px-3 py-2.5 text-base outline-none placeholder:text-text-muted focus:border-accent disabled:opacity-40 sm:py-2 sm:text-sm";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * The phone form's fields, shared by "Add phone" and the edit card so the two
 * can never drift. No instructions on the form: the format of each value is its
 * placeholder.
 */
export function DeviceFields({
  values,
  onChange,
  disabled,
}: {
  values: DeviceFormValues;
  onChange: (next: DeviceFormValues) => void;
  disabled?: boolean;
}) {
  const set = (key: keyof DeviceFormValues) => (e: { target: { value: string } }) =>
    onChange({ ...values, [key]: e.target.value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" className="sm:col-span-2">
        <input
          value={values.name}
          onChange={set("name")}
          disabled={disabled}
          maxLength={60}
          autoComplete="off"
          placeholder="iPhone 1"
          className={DEVICE_INPUT}
        />
      </Field>
      <Field label="Model">
        <input
          value={values.model}
          onChange={set("model")}
          disabled={disabled}
          maxLength={60}
          autoComplete="off"
          placeholder="iPhone 12"
          className={DEVICE_INPUT}
        />
      </Field>
      <Field label="iOS version">
        <input
          value={values.iosVersion}
          onChange={set("iosVersion")}
          disabled={disabled}
          maxLength={20}
          autoComplete="off"
          inputMode="decimal"
          placeholder="18.5"
          className={DEVICE_INPUT}
        />
      </Field>
      <Field label="Proxy">
        <input
          value={values.proxy}
          onChange={set("proxy")}
          disabled={disabled}
          maxLength={200}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="IP:PORT"
          className={cn(DEVICE_INPUT, "font-mono")}
        />
      </Field>
      <Field label="Time zone">
        <input
          value={values.timezone}
          onChange={set("timezone")}
          disabled={disabled}
          maxLength={60}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          list="device-timezones"
          placeholder="America/New_York"
          className={DEVICE_INPUT}
        />
        <datalist id="device-timezones">
          {US_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <textarea
          value={values.notes}
          onChange={set("notes")}
          disabled={disabled}
          maxLength={1000}
          rows={3}
          className={cn(DEVICE_INPUT, "resize-y")}
        />
      </Field>
    </div>
  );
}

/** Read a JSON error body without throwing on an HTML error page. */
export async function errorFrom(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

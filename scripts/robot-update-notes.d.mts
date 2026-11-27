export interface InstallNotes {
  label: string;
  whatChanged: string;
  extraSteps: { do: string; expect?: string }[];
  afterwards: string | null;
}

export function parseInstallNotes(text: string): InstallNotes;

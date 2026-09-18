import { DevicesCard } from "@/components/dashboard/devices-card";
import { GeelarkWalletCard } from "@/components/dashboard/geelark-wallet-card";
import { getFleet } from "@/lib/fleet-server";

/**
 * The card at the top of the homepage's middle column. Cloud keeps the GeeLark
 * wallet exactly as it was; Physical shows its phones instead (Garreth,
 * 2026-09-18).
 */
export async function FleetTopCard() {
  const fleet = await getFleet();
  if (fleet === "physical") return <DevicesCard className="max-h-64 overflow-auto" />;
  return <GeelarkWalletCard />;
}

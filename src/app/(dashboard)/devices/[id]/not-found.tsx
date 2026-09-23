import { NotFoundState } from "@/components/shell/not-found-state";
import { Smartphone } from "@/components/ui/icons";

/** A phone that was deleted, or a link to one that never existed (P13 review). */
export default function PhoneNotFound() {
  return (
    <NotFoundState icon={Smartphone} href="/devices" linkLabel="All phones">
      This phone is gone
    </NotFoundState>
  );
}

import { NotFoundState } from "@/components/shell/not-found-state";
import { Users } from "@/components/ui/icons";

/** An account number the database does not know (P13 review). */
export default function AccountNotFound() {
  return (
    <NotFoundState icon={Users} href="/accounts" linkLabel="All accounts">
      This account is gone
    </NotFoundState>
  );
}

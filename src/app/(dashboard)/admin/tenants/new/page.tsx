import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { NewTenantForm } from "./new-tenant-form";

export default async function NewTenantPage() {
  const session = await auth();
  if (session?.user?.dataScope !== "ALL") redirect("/");

  setTenantContext({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    dataScope: "ALL",
  });

  return <NewTenantForm />;
}

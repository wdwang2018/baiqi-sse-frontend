import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setTenantContext } from "@/lib/tenant-context";
import { NewUserForm } from "./new-user-form";

export default async function NewUserPage() {
  const session = await auth();
  if (session?.user?.dataScope !== "ALL") redirect("/");

  setTenantContext({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    dataScope: "ALL",
  });

  const tenants = await db.tenant.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NewUserForm tenants={tenants} />;
}

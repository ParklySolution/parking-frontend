export async function impersonateTenant(ownerUserId: string, tenantId: string) {
  const { data, error } = await window.supabase.functions.invoke(
    "generate-impersonation-token",
    {
      body: {
        owner_user_id: ownerUserId,
        tenant_id: tenantId,
      },
    }
  );

  if (error) {
    console.error("Errore impersonation:", error);
    return null;
  }

  return data?.token ?? null;
}

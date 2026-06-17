"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ClientList from "../../../web/screens/ClientList";
import ClientDetail from "../../../web/screens/ClientDetail";
import { RequireAuth } from "../../../auth/RequireAuth";
import { SPECIALIST_ROUTES } from "../../../web/navRoutes";

export default function SpecialistClientsPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const onNav = (label: string) => {
    const path = SPECIALIST_ROUTES[label];
    if (path) router.push(path);
  };

  return (
    <RequireAuth role="wellness_specialist">
      {client ? (
        <ClientDetail client={client} onBack={() => setClient(null)} onNav={onNav} />
      ) : (
        <ClientList onOpenClient={setClient} onNav={onNav} />
      )}
    </RequireAuth>
  );
}

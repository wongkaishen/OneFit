"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Messaging } from "@/components/Messaging";

function GymMessages() {
  const params = useSearchParams();
  return (
    <Messaging
      avatarLetter="G"
      initialPartnerId={params.get("to")}
      initialPartnerName={params.get("name")}
    />
  );
}

export default function GymMessagesPage() {
  return (
    <Suspense fallback={null}>
      <GymMessages />
    </Suspense>
  );
}

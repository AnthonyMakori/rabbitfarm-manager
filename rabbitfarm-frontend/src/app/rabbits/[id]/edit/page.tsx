"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import RabbitEditForm from "@/components/rabbits/RabbitEditForm";


function EditRabbitContent() {
  const params = useParams<{ id: string }>();
  const rabbitId = Number(params.id);

  return (
    <div className="min-h-screen bg-stone-50">
      <AppSidebar />

      <main className="lg:pl-64">
        <AppHeader />

        <div className="p-4 sm:p-6 lg:p-8">
          <RabbitEditForm rabbitId={rabbitId} />
        </div>
      </main>
    </div>
  );
}

export default function EditRabbitPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="min-h-screen bg-stone-50 p-8 text-center text-stone-500"
        >
          Loading rabbit edit page...
        </div>
      }
    >
      <EditRabbitContent />
    </Suspense>
  );
}

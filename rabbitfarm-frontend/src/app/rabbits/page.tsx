import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import RabbitRegistry from "@/components/rabbits/RabbitRegistry";

export default function RabbitsPage() {
  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1 lg:ml-64">
          <AppHeader />

          <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-green-700"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            <div className="mb-8">
              <p className="text-sm font-medium text-green-700">
                FARM OPERATIONS
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Rabbit Management
              </h1>

              <p className="mt-2 text-sm text-stone-500">
                Register, search, and manage the rabbits on your farm.
              </p>
            </div>

            <RabbitRegistry />
          </main>
        </div>
      </div>
    </div>
  );
}
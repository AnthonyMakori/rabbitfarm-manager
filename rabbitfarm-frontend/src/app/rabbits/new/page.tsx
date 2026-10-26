import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import RabbitForm from "@/components/rabbits/RabbitForm";

export default function NewRabbitPage() {
  return (
    <div className="min-h-screen bg-[#f8f9f6] text-stone-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <div className="min-w-0 flex-1">
          <AppHeader />

          <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-medium text-green-700">
                RABBIT MANAGEMENT
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Register a rabbit
              </h1>

              <p className="mt-2 text-sm text-stone-500">
                Add a rabbit to your farm records.
              </p>
            </div>

            <RabbitForm />
          </main>
        </div>
      </div>
    </div>
  );
}
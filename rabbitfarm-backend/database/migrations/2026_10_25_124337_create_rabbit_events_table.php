
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rabbit_events', function (Blueprint $table) {
            $table->id();

            // The rabbit this event belongs to.
            $table->foreignId('rabbit_id')
                ->constrained('rabbits')
                ->cascadeOnDelete();

            // Examples: weight, vaccination, breeding, birth, sale.
            $table->string('event_type', 40);

            $table->string('title', 150);

            // When the event actually happened.
            $table->date('event_date');

            $table->text('description')->nullable();

            // Optional measurement recorded during this event.
            $table->decimal('weight_kg', 8, 3)->nullable();

            // Optional cost, for example medication or treatment.
            $table->decimal('cost', 12, 2)->nullable();

            // Useful for vaccinations, treatments, or follow-up tasks.
            $table->date('next_due_date')->nullable();

            $table->timestamps();

            $table->index(['rabbit_id', 'event_date']);
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rabbit_events');
    }
};

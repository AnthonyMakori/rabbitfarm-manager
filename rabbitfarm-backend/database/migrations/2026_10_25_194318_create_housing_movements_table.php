
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('housing_movements', function (Blueprint $table) {
            $table->id();

            // Rabbit that was assigned or transferred.
            // Its movement history is removed if the rabbit is deleted.
            $table->foreignId('rabbit_id')
                ->constrained('rabbits')
                ->cascadeOnDelete();

            // Previous housing unit; null means the rabbit was unassigned.
            // Keep the history record if a housing unit is deleted.
            $table->foreignId('from_housing_unit_id')
                ->nullable()
                ->constrained('housing_units')
                ->nullOnDelete();

            // Destination housing unit; null means the rabbit was removed
            // from its housing unit without being assigned to another one.
            $table->foreignId('to_housing_unit_id')
                ->nullable()
                ->constrained('housing_units')
                ->nullOnDelete();

            // Date and time the movement took place.
            $table->timestamp('moved_at')->useCurrent();

            // Examples: initial assignment, transfer, cleaning, isolation.
            $table->string('reason', 120)->nullable();

            // Additional details about the movement.
            $table->text('notes')->nullable();

            $table->timestamps();

            // Quickly retrieve a rabbit's movement history in date order.
            $table->index(['rabbit_id', 'moved_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('housing_movements');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('health_records', function (Blueprint $table) {
            $table->id();

            // Link each health record to an existing rabbit.
            $table->foreignId('rabbit_id')
                ->constrained('rabbits')
                ->cascadeOnDelete();

            // Date the illness, examination, or treatment occurred.
            $table->date('record_date');

            // Examples: checkup, illness, vaccination, treatment, injury.
            $table->string('category', 50);

            // Short description of the health issue or procedure.
            $table->string('title', 150);

            // Medical details.
            $table->text('diagnosis')->nullable();
            $table->text('symptoms')->nullable();
            $table->text('treatment')->nullable();

            // Medication information, if applicable.
            $table->string('medication', 150)->nullable();
            $table->string('dosage', 100)->nullable();

            // Person who administered the treatment or examination.
            $table->string('administered_by', 150)->nullable();

            // Optional reminder for the next vaccination or checkup.
            $table->date('next_due_date')->nullable();

            // Optional veterinary or treatment expense.
            $table->decimal('cost', 10, 2)->nullable();

            // Examples: completed, ongoing, follow_up.
            $table->string('status', 30)->default('completed');

            // Additional observations.
            $table->text('notes')->nullable();

            $table->timestamps();

            // Improve filtering and sorting by rabbit and date.
            $table->index(['rabbit_id', 'record_date']);
            $table->index('category');
            $table->index('next_due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('health_records');
    }
};
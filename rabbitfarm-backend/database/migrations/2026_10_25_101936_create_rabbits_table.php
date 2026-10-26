<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the rabbits table.
     */
    public function up(): void
    {
        Schema::create('rabbits', function (Blueprint $table) {
            $table->id();

            // Unique identification code assigned to each rabbit.
            // Example: RBT-0001
            $table->string('rabbit_code', 30)->unique()->nullable();

            // Basic rabbit information.
            $table->string('name', 100)->nullable();
            $table->string('breed', 100);
            $table->string('sex', 10);

            // Date of birth is optional when the exact date is unknown.
            $table->date('date_of_birth')->nullable();

            // Current weight, measured in kilograms.
            $table->decimal('weight_kg', 8, 3)->nullable();

            // Intended production role.
            // Examples: breeding, growing, kit.
            $table->string('category', 30)->default('growing');

            // Current operational status.
            // Examples: active, sold, deceased, culled, transferred.
            $table->string('status', 30)->default('active');

            // Where the rabbit came from.
            // Examples: born_on_farm, purchased, transferred.
            $table->string('acquisition_source', 30)
                ->default('born_on_farm');

            // Purchase or acquisition cost, in the farm's currency.
            $table->decimal('acquisition_cost', 12, 2)->nullable();

            // Optional date when the rabbit was acquired.
            $table->date('acquired_at')->nullable();

            // Optional date when the rabbit left the farm or died.
            $table->date('exit_date')->nullable();

            // Additional observations.
            $table->text('notes')->nullable();

            $table->timestamps();

            // Useful when filtering the registry.
            $table->index(['status', 'category']);
            $table->index(['sex', 'breed']);
        });
    }

    /**
     * Drop the rabbits table if the migration is rolled back.
     */
    public function down(): void
    {
        Schema::dropIfExists('rabbits');
    }
};
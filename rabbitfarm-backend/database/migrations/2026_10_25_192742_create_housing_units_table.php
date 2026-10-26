<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('housing_units', function (Blueprint $table) {
            $table->id();

            // Unique identifier, e.g. HUT-001 or PEN-001.
            $table->string('unit_code', 50)->unique();

            // Optional friendly name, e.g. Main Rabbitry Hutch 1.
            $table->string('name', 120)->nullable();

            // Examples: hutch, cage, pen, colony.
            $table->string('unit_type', 50);

            // Physical location within the farm.
            $table->string('location', 150)->nullable();

            // Maximum permitted number of rabbits in this unit.
            $table->unsignedSmallInteger('capacity');

            // Optional physical dimensions.
            $table->decimal('length_cm', 8, 2)->nullable();
            $table->decimal('width_cm', 8, 2)->nullable();
            $table->decimal('height_cm', 8, 2)->nullable();

            // Active units can house rabbits.
            // Maintenance and inactive units should not accept assignments.
            $table->string('status', 30)->default('active');

            // Additional housing information.
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('unit_type');
            $table->index('status');
            $table->index('location');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('housing_units');
    }
};
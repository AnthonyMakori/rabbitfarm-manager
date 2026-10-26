<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('breedings', function (Blueprint $table) {
            $table->id();

            // The male rabbit involved in this breeding attempt.
            $table->foreignId('male_rabbit_id')
                ->constrained('rabbits')
                ->cascadeOnDelete();

            // The female rabbit involved in this breeding attempt.
            $table->foreignId('female_rabbit_id')
                ->constrained('rabbits')
                ->cascadeOnDelete();

            // The date the rabbits were mated.
            $table->date('mating_date');

            // Estimated kindling date, normally 31 days after mating.
            $table->date('expected_kindling_date')->nullable();

            // Actual date the female gave birth, if applicable.
            $table->date('actual_kindling_date')->nullable();

            // Pregnancy assessment.
            $table->string('pregnancy_status', 30)
                ->default('unknown');

            // Overall progress of the breeding attempt.
            $table->string('status', 30)
                ->default('planned');

            // Additional observations about the breeding.
            $table->text('notes')->nullable();

            $table->timestamps();

            // Indexes to speed up searches by rabbit and date.
            $table->index(['female_rabbit_id', 'mating_date']);
            $table->index(['male_rabbit_id', 'mating_date']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('breedings');
    }
};
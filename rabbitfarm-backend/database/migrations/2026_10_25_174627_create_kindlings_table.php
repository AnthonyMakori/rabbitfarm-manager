<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
 
public function up(): void
{
    Schema::create('kindlings', function (Blueprint $table) {
        $table->id();

        // One kindling record per breeding record.
        $table->foreignId('breeding_id')
            ->unique()
            ->constrained('breedings')
            ->cascadeOnDelete();

        // The date the doe actually gave birth.
        $table->date('kindling_date');

        // Litter statistics at birth.
        $table->unsignedSmallInteger('total_born');
        $table->unsignedSmallInteger('born_alive');
        $table->unsignedSmallInteger('stillborn')->default(0);

        // Current litter progress.
        $table->unsignedSmallInteger('current_alive')->nullable();
        $table->unsignedSmallInteger('weaned_count')->default(0);
        $table->date('weaning_date')->nullable();

        $table->text('notes')->nullable();

        $table->timestamps();

        $table->index('kindling_date');
    });
}

public function down(): void
{
    Schema::dropIfExists('kindlings');
}

};

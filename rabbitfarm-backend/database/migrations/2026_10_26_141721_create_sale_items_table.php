<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    
public function up(): void
{
    Schema::create('sale_items', function (Blueprint $table) {
        $table->id();

        $table->foreignId('sale_id')
            ->constrained('sales')
            ->restrictOnDelete();

        $table->foreignId('rabbit_id')
            ->constrained('rabbits')
            ->restrictOnDelete();

        $table->decimal('unit_price', 12, 2);
        $table->decimal('line_total', 12, 2);

        $table->timestamps();

        $table->index(['sale_id', 'rabbit_id']);
    });
}

public function down(): void
{
    Schema::dropIfExists('sale_items');
}

};

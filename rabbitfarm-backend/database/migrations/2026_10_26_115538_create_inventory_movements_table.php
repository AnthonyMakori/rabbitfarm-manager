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
    Schema::create('inventory_movements', function (Blueprint $table) {
        $table->id();

        // The inventory item affected by this movement.
        $table->foreignId('inventory_item_id')
            ->constrained('inventory_items')
            ->restrictOnDelete();

        // received, consumed, damaged, adjustment_in, adjustment_out
        $table->string('movement_type', 30);

        // Always record a positive quantity.
        $table->decimal('quantity', 12, 3);

        // Optional historical cost for received stock.
        $table->decimal('unit_cost', 12, 2)->nullable();

        $table->dateTime('moved_at');

        $table->string('reference')->nullable();
        $table->text('notes')->nullable();

        $table->timestamps();

        $table->index(['inventory_item_id', 'moved_at']);
        $table->index('movement_type');
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};

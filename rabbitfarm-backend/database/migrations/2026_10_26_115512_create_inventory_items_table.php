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
    Schema::create('inventory_items', function (Blueprint $table) {
        $table->id();

        // Unique code used to identify the item.
        $table->string('item_code', 50)->unique();

        $table->string('name');
        $table->string('category', 50);
        // Examples: feed, medicine, cleaning, equipment, supplies.

        // Examples: kg, g, litre, ml, bag, piece.
        $table->string('unit', 20);

        // Current stock, updated whenever a movement is recorded.
        $table->decimal('quantity_on_hand', 12, 3)->default(0);

        // Alert when available stock reaches this quantity.
        $table->decimal('reorder_level', 12, 3)->default(0);

        // Estimated purchase cost per stock unit.
        $table->decimal('unit_cost', 12, 2)->default(0);

        $table->string('supplier')->nullable();
        $table->string('storage_location')->nullable();

        $table->boolean('is_active')->default(true);
        $table->text('notes')->nullable();

        $table->timestamps();

        $table->index(['category', 'is_active']);
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};

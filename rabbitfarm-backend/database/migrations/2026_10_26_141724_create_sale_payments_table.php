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
    Schema::create('sale_payments', function (Blueprint $table) {
        $table->id();

        $table->foreignId('sale_id')
            ->constrained('sales')
            ->restrictOnDelete();

        $table->decimal('amount', 12, 2);

        $table->string('payment_method', 30);
        $table->string('reference', 100)->nullable();

        $table->dateTime('paid_at');
        $table->text('notes')->nullable();

        $table->timestamps();

        $table->index(['sale_id', 'paid_at']);
    });
}

public function down(): void
{
    Schema::dropIfExists('sale_payments');
}

};

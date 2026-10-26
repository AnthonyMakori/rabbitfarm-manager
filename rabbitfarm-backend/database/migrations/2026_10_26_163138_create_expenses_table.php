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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();

            // Expense details
            $table->string('category', 50)->index();
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->date('expense_date')->index();

            // Who received the payment and how it was paid
            $table->string('paid_to')->nullable();
            $table->string('payment_method', 30)->default('cash');
            $table->string('reference')->nullable();

            // Additional information
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }

};

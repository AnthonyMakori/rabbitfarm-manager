<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('farm_settings', function (Blueprint $table) {
            $table->id();

            // Farm identity and contact details
            $table->string('farm_name')->default('RabbitFarm Manager');
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->default('Kenya');
            $table->string('logo_path')->nullable();

            // Application preferences
            $table->string('currency', 3)->default('KES');
            $table->string('timezone')->default('Africa/Nairobi');
            $table->string('date_format')->default('Y-m-d');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('farm_settings');
    }
};
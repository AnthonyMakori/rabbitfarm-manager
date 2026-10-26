<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rabbits', function (Blueprint $table) {
            // Stores the relative path to the rabbit's photo.
            $table->string('image_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('rabbits', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }
};
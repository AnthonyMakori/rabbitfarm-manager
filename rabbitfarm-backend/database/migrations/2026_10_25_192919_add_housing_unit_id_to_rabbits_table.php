<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rabbits', function (Blueprint $table) {
            // A rabbit may temporarily have no assigned housing unit.
            $table->foreignId('housing_unit_id')
                ->nullable()
                ->constrained('housing_units')
                ->nullOnDelete();

            $table->index('housing_unit_id');
        });
    }

    public function down(): void
    {
        Schema::table('rabbits', function (Blueprint $table) {
            $table->dropForeign(['housing_unit_id']);
            $table->dropIndex(['housing_unit_id']);
            $table->dropColumn('housing_unit_id');
        });
    }
};
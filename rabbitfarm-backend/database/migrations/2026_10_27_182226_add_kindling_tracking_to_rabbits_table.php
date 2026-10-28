<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rabbits', function (Blueprint $table) {
            // Links a kit to the litter in which it was born.
            // Manually registered rabbits will have a null kindling_id.
            $table->foreignId('kindling_id')
                ->nullable()
                ->after('id')
                ->constrained('kindlings')
                ->nullOnDelete();

            // Identifies an individual kit within its litter:
            // kit 1, kit 2, kit 3, and so on.
            $table->unsignedSmallInteger('litter_kit_number')
                ->nullable()
                ->after('kindling_id');

            // Prevents two rabbit records from using the same
            // kit number within the same litter.
            $table->unique(
                ['kindling_id', 'litter_kit_number'],
                'rabbits_kindling_kit_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('rabbits', function (Blueprint $table) {
            $table->dropUnique('rabbits_kindling_kit_unique');

            $table->dropConstrainedForeignId('kindling_id');

            $table->dropColumn('litter_kit_number');
        });
    }
};
<?php

namespace Database\Seeders;

use App\Models\WatcherRelationshipType;
use Illuminate\Database\Seeder;

class WatcherRelationshipTypeSeeder extends Seeder
{
    public function run(): void
    {
        $relationships = [
            'spouse' => 'Spouse',
            'parent' => 'Parent',
            'child' => 'Child',
            'sibling' => 'Sibling',
            'grandparent' => 'Grandparent',
            'grandchild' => 'Grandchild',
            'relative' => 'Relative',
            'guardian' => 'Guardian',
            'friend' => 'Friend',
            'neighbor' => 'Neighbor',
            'employer' => 'Employer',
            'barangay_official' => 'Barangay Official',
            'other' => 'Other',
        ];

        foreach ($relationships as $code => $name) {
            WatcherRelationshipType::firstOrCreate(['code' => $code], ['name' => $name]);
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\DocumentType;
use Illuminate\Database\Seeder;

class DocumentTypeSeeder extends Seeder
{
    /** The type the finalized social case study PDFs are filed under. */
    public const SOCIAL_CASE_STUDY = 'Social Case Study Report';

    /** The requirements MSWD files for a patient, in dropdown order. */
    public const TYPES = [
        'Barangay Certificate of Indigency',
        'Valid ID',
        'Medical Abstract',
        'Prescription',
        'Quotation / Bill',
        self::SOCIAL_CASE_STUDY,
        'Others',
    ];

    public function run(): void
    {
        foreach (self::TYPES as $index => $name) {
            // withTrashed: a type staff deleted is not re-created on the next seed.
            DocumentType::withTrashed()->firstOrCreate(['name' => $name], ['sort_order' => $index + 1]);
        }
    }
}

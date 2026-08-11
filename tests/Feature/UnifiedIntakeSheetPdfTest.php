<?php

use App\DTOs\UnifiedIntakeSheetDto;
use App\Models\AssistantType;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use App\Services\UnifiedIntakeSheetService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake();
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->assistType = AssistantType::create(['name' => 'Medicine', 'code' => 'MED', 'category' => 'medical', 'is_active' => true]);
});

function pdfIntakeWorker(string $role = 'MSS Head'): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

function makeIntakeDraft(int $sectorId, int $assistTypeId, User $worker): UnifiedIntakeSheet
{
    return app(UnifiedIntakeSheetService::class)->createDraft(
        UnifiedIntakeSheetDto::fromArray([
            'referral_source' => 'walk_in',
            'date_of_intake' => now()->toDateString(),
            'patient' => [
                'sector_id' => $sectorId, 'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
                'sex' => 'male', 'birthdate' => '1980-05-01', 'address' => 'Sta. Maria',
            ],
            'family_members' => [['name' => 'Maria Dela Cruz', 'relationship' => 'spouse', 'monthly_income' => 5000]],
            'patient_ids' => [['id_type' => 'philhealth', 'id_number' => 'PH-123']],
            'case' => ['case_type' => 'medical', 'priority_level' => 'high', 'admission_type' => 'ER'],
            'assessment' => ['classification' => 'indigent', 'presenting_problem' => 'Cannot afford medicine'],
            'assistances' => [['assistant_type_id' => $assistTypeId, 'amount' => 1500, 'notes' => 'Meds']],
        ]),
        $worker,
    );
}

it('streams a PDF for a finalized intake', function () {
    $worker = pdfIntakeWorker('MSS Head');
    $sheet = makeIntakeDraft($this->sector->id, $this->assistType->id, $worker);
    app(UnifiedIntakeSheetService::class)->finalize($sheet, $worker);

    Sanctum::actingAs($worker);

    $response = $this->get("/api/intake-sheets/{$sheet->id}/pdf")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');
});

it('streams a draft PDF (unofficial copy)', function () {
    $worker = pdfIntakeWorker('Case Manager');
    $sheet = makeIntakeDraft($this->sector->id, $this->assistType->id, $worker);

    Sanctum::actingAs($worker);

    $response = $this->get("/api/intake-sheets/{$sheet->id}/pdf")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');
});

it('forces an attachment download with ?download=1', function () {
    $worker = pdfIntakeWorker('MSS Head');
    $sheet = makeIntakeDraft($this->sector->id, $this->assistType->id, $worker);

    Sanctum::actingAs($worker);

    $this->get("/api/intake-sheets/{$sheet->id}/pdf?download=1")
        ->assertOk()
        ->assertHeader('content-disposition', "attachment; filename={$sheet->intake_no}.pdf");
});

it('forbids the PDF without intake.view', function () {
    $worker = pdfIntakeWorker('MSS Head');
    $sheet = makeIntakeDraft($this->sector->id, $this->assistType->id, $worker);

    Sanctum::actingAs(User::factory()->create()); // no roles

    $this->get("/api/intake-sheets/{$sheet->id}/pdf")->assertForbidden();
});

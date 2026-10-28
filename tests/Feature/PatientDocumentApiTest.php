<?php

use App\Models\CaseModel;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\DocumentTypeSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(DocumentTypeSeeder::class);

    $this->sector = Sector::create(['name' => 'Medical', 'code' => 'MED']);
    $this->worker = User::factory()->create(['role' => 'Case Manager']);
    $this->worker->assignRole('Case Manager');
    $this->worker->givePermissionTo('patients.update'); // watchers and documents are patient records
    Sanctum::actingAs($this->worker);

    $this->patient = documentPatient();
    $this->type = DocumentType::query()->ordered()->first();
});

function documentPatient(): Patient
{
    return Patient::create([
        'sector_id' => test()->sector->id, 'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ]);
}

function documentCase(Patient $patient): CaseModel
{
    return CaseModel::create([
        'patient_id' => $patient->id, 'assigned_user_id' => test()->worker->id,
        'case_code' => 'CASE-'.uniqid(), 'case_type' => 'medical', 'priority_level' => 'high',
        'status' => 'open', 'admission_type' => 'OPD', 'date_opened' => now(),
    ]);
}

function uploadDocument(Patient $patient, array $overrides = [])
{
    return test()->postJson("/api/patients/{$patient->id}/documents", array_merge([
        'file' => UploadedFile::fake()->create('indigency.pdf', 120, 'application/pdf'),
        'document_type_id' => test()->type->id,
    ], $overrides));
}

it('uploads a document without a case and records its details', function () {
    $response = uploadDocument($this->patient)->assertCreated();

    $document = Document::findOrFail($response->json('data.id'));

    expect($document->case_id)->toBeNull()
        ->and($document->patient_id)->toBe($this->patient->id)
        ->and($document->uploaded_by)->toBe($this->worker->id)
        ->and($document->document_type)->toBe($this->type->name)
        ->and($document->document_type_id)->toBe($this->type->id)
        ->and($document->file_name)->toBe('indigency.pdf')
        ->and($document->file_size)->toBeGreaterThan(0)
        ->and($document->disk)->toBe('local');

    Storage::disk('local')->assertExists($document->file_path);

    $response->assertJsonPath('data.uploaded_by_name', $this->worker->name)
        ->assertJsonMissingPath('data.file_path');
});

it('uploads a document tied to one of the patient\'s cases', function () {
    $case = documentCase($this->patient);

    uploadDocument($this->patient, ['case_id' => $case->id])
        ->assertCreated()
        ->assertJsonPath('data.case_id', $case->id)
        ->assertJsonPath('data.case_code', $case->case_code);
});

it('rejects a case that belongs to another patient', function () {
    $case = documentCase(documentPatient());

    uploadDocument($this->patient, ['case_id' => $case->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('case_id');
});

it('rejects a disallowed file type, an oversized file and a missing file', function () {
    uploadDocument($this->patient, ['file' => UploadedFile::fake()->create('notes.docx', 10)])
        ->assertJsonValidationErrors('file');

    uploadDocument($this->patient, ['file' => UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf')])
        ->assertJsonValidationErrors('file');

    uploadDocument($this->patient, ['file' => null])->assertJsonValidationErrors('file');
});

it('rejects an inactive, deleted or unknown document type', function () {
    $this->type->update(['is_active' => false]);
    uploadDocument($this->patient)->assertJsonValidationErrors('document_type_id');

    $this->type->update(['is_active' => true]);
    $this->type->delete();
    uploadDocument($this->patient)->assertJsonValidationErrors('document_type_id');

    uploadDocument($this->patient, ['document_type_id' => 99999])->assertJsonValidationErrors('document_type_id');
});

it('lists a patient\'s documents newest first and filters them', function () {
    $other = DocumentType::query()->ordered()->skip(1)->first();
    $first = uploadDocument($this->patient)->json('data.id');
    $second = uploadDocument($this->patient, ['document_type_id' => $other->id])->json('data.id');
    Document::whereKey($first)->update(['created_at' => now()->subDay()]);

    $this->getJson("/api/patients/{$this->patient->id}/documents")
        ->assertOk()
        ->assertJsonPath('data.0.id', $second)
        ->assertJsonPath('data.1.id', $first)
        ->assertJsonMissingPath('data.0.file_path');

    $this->getJson("/api/patients/{$this->patient->id}/documents?document_type_id={$other->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $second);
});

it('streams the file inline, or as an attachment with download=1', function () {
    $id = uploadDocument($this->patient)->json('data.id');
    $url = "/api/patients/{$this->patient->id}/documents/{$id}/file";

    $this->get($url)
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeaderContains('Content-Disposition', 'inline');

    $this->get("{$url}?download=1")
        ->assertOk()
        ->assertHeaderContains('Content-Disposition', 'attachment');
});

it('exposes a file_url that serves the file', function () {
    $response = uploadDocument($this->patient)->assertCreated();

    $this->get($response->json('data.file_url'))->assertOk();
});

it('returns 404 for a file or delete that is not the patient\'s', function () {
    $other = documentPatient();
    $id = uploadDocument($other)->json('data.id');

    $this->get("/api/patients/{$this->patient->id}/documents/{$id}/file")->assertNotFound();
    $this->deleteJson("/api/patients/{$this->patient->id}/documents/{$id}")->assertNotFound();
});

it('soft-deletes a document and keeps the stored file', function () {
    $id = uploadDocument($this->patient)->json('data.id');
    $path = Document::findOrFail($id)->file_path;

    $this->deleteJson("/api/patients/{$this->patient->id}/documents/{$id}")->assertNoContent();

    expect(Document::find($id))->toBeNull()
        ->and(Document::withTrashed()->find($id))->not->toBeNull();
    Storage::disk('local')->assertExists($path);

    $this->getJson("/api/patients/{$this->patient->id}/documents")->assertJsonCount(0, 'data');
});

it('reads a file stored on a disk recorded before the default changed', function () {
    $id = uploadDocument($this->patient)->json('data.id');
    Document::whereKey($id)->update(['disk' => null]);

    $this->get("/api/patients/{$this->patient->id}/documents/{$id}/file")->assertOk();
});

it('lets a viewer read documents but not upload or delete', function () {
    $id = uploadDocument($this->patient)->json('data.id');

    $viewer = User::factory()->create(['role' => 'Processor']);
    $viewer->assignRole('Processor');
    Sanctum::actingAs($viewer);

    $this->getJson("/api/patients/{$this->patient->id}/documents")->assertOk();
    $this->get("/api/patients/{$this->patient->id}/documents/{$id}/file")->assertOk();
    uploadDocument($this->patient)->assertForbidden();
    $this->deleteJson("/api/patients/{$this->patient->id}/documents/{$id}")->assertForbidden();
});

it('uploads from the case route with a type id and links the case', function () {
    $case = documentCase($this->patient);

    $this->postJson("/api/cases/{$case->id}/documents", [
        'file' => UploadedFile::fake()->image('id.png'),
        'document_type_id' => $this->type->id,
    ])
        ->assertCreated()
        ->assertJsonPath('data.case_id', $case->id)
        ->assertJsonPath('data.patient_id', $this->patient->id);
});

<?php

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Patient;
use App\Models\Sector;
use App\Models\User;
use Database\Seeders\DocumentTypeSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(DocumentTypeSeeder::class);

    $this->head = User::factory()->create(['role' => 'Admin']);
    $this->head->assignRole('Admin');
    Sanctum::actingAs($this->head);
});

it('lists the seeded types in order, with the active filter', function () {
    $retired = DocumentType::query()->ordered()->first();
    $retired->update(['is_active' => false]);

    $all = $this->getJson('/api/document-types')->assertOk();
    expect($all->json('data'))->toHaveCount(count(DocumentTypeSeeder::TYPES));

    $active = $this->getJson('/api/document-types?active=1')->assertOk();
    expect($active->json('data'))->toHaveCount(count(DocumentTypeSeeder::TYPES) - 1)
        ->and(collect($active->json('data'))->pluck('id'))->not->toContain($retired->id);
});

it('creates, renames, retires and deletes a type', function () {
    $id = $this->postJson('/api/document-types', ['name' => 'Death Certificate', 'sort_order' => 9])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Death Certificate')
        ->assertJsonPath('data.usage_count', 0)
        ->json('data.id');

    $this->putJson("/api/document-types/{$id}", ['name' => 'Death Certificate (copy)'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Death Certificate (copy)');

    $this->putJson("/api/document-types/{$id}", ['is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    $this->deleteJson("/api/document-types/{$id}")->assertNoContent();
    expect(DocumentType::find($id))->toBeNull();
});

it('rejects a duplicate name but allows reusing a deleted one', function () {
    $this->postJson('/api/document-types', ['name' => 'Valid ID'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    DocumentType::where('name', 'Valid ID')->first()->delete();

    $this->postJson('/api/document-types', ['name' => 'Valid ID'])->assertCreated();
});

it('counts the documents filed under a type', function () {
    $type = DocumentType::query()->ordered()->first();
    $patient = Patient::create([
        'sector_id' => Sector::create(['name' => 'Medical', 'code' => 'MED'])->id,
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female',
        'birthdate' => now()->subYears(30)->toDateString(),
    ]);

    expect($this->getJson("/api/document-types/{$type->id}")->json('data.usage_count'))->toBe(0);

    Document::create([
        'patient_id' => $patient->id, 'uploaded_by' => $this->head->id,
        'document_type_id' => $type->id, 'document_type' => $type->name,
        'file_name' => 'a.pdf', 'file_path' => 'patients/1/documents/a.pdf', 'file_type' => 'application/pdf',
    ]);

    expect($this->getJson("/api/document-types/{$type->id}")->json('data.usage_count'))->toBe(1);
});

it('lets anyone read the list but only library.manage write it', function () {
    $worker = User::factory()->create(['role' => 'Processor']);
    $worker->assignRole('Processor');
    Sanctum::actingAs($worker);

    $this->getJson('/api/document-types')->assertOk();
    $this->postJson('/api/document-types', ['name' => 'Anything'])->assertForbidden();
    $this->putJson('/api/document-types/'.DocumentType::first()->id, ['name' => 'X'])->assertForbidden();
    $this->deleteJson('/api/document-types/'.DocumentType::first()->id)->assertForbidden();
});

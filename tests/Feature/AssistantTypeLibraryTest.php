<?php

use App\Filament\Resources\AssistantTypes\Pages\CreateAssistantType;
use App\Filament\Resources\AssistantTypes\Pages\EditAssistantType;
use App\Filament\Resources\AssistantTypes\Pages\ListAssistantTypes;
use App\Models\AssistantType;
use App\Models\User;
use Database\Seeders\AssistantTypeSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Actions\DeleteAction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Livewire\Livewire;
use Spatie\Activitylog\Models\Activity;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    Sanctum::actingAs(typeUser('Supervisor'));
});

function typeUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

it('seeds the starting Types of Assistance in the migration', function () {
    expect(AssistantType::ordered()->pluck('name', 'code')->sortKeys()->all())
        ->toBe(collect(AssistantTypeSeeder::TYPES)->map(fn ($type) => $type[0])->sortKeys()->all())
        ->and(AssistantType::pluck('category')->unique()->all())->toBe(['medical']);

    (new AssistantTypeSeeder)->run();
    expect(AssistantType::count())->toBe(count(AssistantTypeSeeder::TYPES));
});

it('adds, renames, retires and deletes a type', function () {
    $id = $this->postJson('/api/assistant-types', ['name' => 'Burial Aid', 'code' => 'burial_aid', 'category' => 'burial'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Burial Aid')
        ->assertJsonPath('data.category', 'burial')
        ->assertJsonPath('data.category_label', 'Burial')
        ->assertJsonPath('data.is_active', true)
        ->assertJsonPath('data.usage_count', 0)
        ->assertJsonPath('data.usage.assistance_records', 0)
        ->assertJsonPath('data.usage.guarantee_lines', 0)
        ->json('data.id');

    $this->putJson("/api/assistant-types/{$id}", ['name' => 'Burial Assistance', 'description' => 'Funeral costs'])
        ->assertOk()->assertJsonPath('data.name', 'Burial Assistance')->assertJsonPath('data.description', 'Funeral costs');
    $this->putJson("/api/assistant-types/{$id}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);

    expect($this->getJson('/api/assistant-types?active=1')->json('data.*.code'))->not->toContain('burial_aid');

    $this->deleteJson("/api/assistant-types/{$id}")->assertNoContent();

    expect(AssistantType::withTrashed()->find($id)->trashed())->toBeTrue();
});

it('validates a type', function (array $payload, string $error) {
    $this->postJson('/api/assistant-types', $payload)->assertUnprocessable()->assertJsonValidationErrors($error);
})->with([
    'missing name' => [['code' => 'x', 'category' => 'medical'], 'name'],
    'missing code' => [['name' => 'X', 'category' => 'medical'], 'code'],
    'bad code' => [['name' => 'X', 'code' => 'Two Words', 'category' => 'medical'], 'code'],
    'missing category' => [['name' => 'X', 'code' => 'x'], 'category'],
    'unknown category' => [['name' => 'X', 'code' => 'x', 'category' => 'pharmacy'], 'category'],
    'duplicate name' => [['name' => 'Medicines', 'code' => 'x', 'category' => 'medical'], 'name'],
    'duplicate code' => [['name' => 'X', 'code' => 'medicines', 'category' => 'medical'], 'code'],
]);

it('lets an older type keep a category outside the vocabulary', function () {
    $legacy = AssistantType::create(['name' => 'Medicine', 'code' => 'med', 'category' => 'pharmacy']);

    $this->putJson("/api/assistant-types/{$legacy->id}", ['name' => 'Medicine (legacy)', 'category' => 'pharmacy'])->assertOk();
    $this->putJson("/api/assistant-types/{$legacy->id}", ['category' => 'transportation'])->assertOk();
    $this->putJson("/api/assistant-types/{$legacy->id}", ['category' => 'pharmacy'])
        ->assertUnprocessable()->assertJsonValidationErrors('category');
});

it('reuses the name of a deleted type but not its code', function () {
    AssistantType::where('code', 'medicines')->firstOrFail()->delete();

    $this->postJson('/api/assistant-types', ['name' => 'Medicines', 'code' => 'medicines_2', 'category' => 'medical'])->assertCreated();
    $this->postJson('/api/assistant-types', ['name' => 'Drugs', 'code' => 'medicines', 'category' => 'medical'])
        ->assertUnprocessable()->assertJsonValidationErrors('code');
});

it('lets library.manage write and everyone else only read', function () {
    Sanctum::actingAs(typeUser('Case Manager'));
    $this->getJson('/api/assistant-types')->assertOk();
    $this->postJson('/api/assistant-types', ['name' => 'X', 'code' => 'x', 'category' => 'food'])->assertForbidden();

    Sanctum::actingAs(typeUser('MSS Head'));
    $this->postJson('/api/assistant-types', ['name' => 'X', 'code' => 'x', 'category' => 'food'])->assertCreated();
});

it('rejects unauthenticated writes', function () {
    $this->app['auth']->forgetGuards();

    $this->postJson('/api/assistant-types', ['name' => 'X', 'code' => 'x', 'category' => 'food'])->assertUnauthorized();
});

it('audits every change to a type', function () {
    $id = $this->postJson('/api/assistant-types', ['name' => 'Audited', 'code' => 'audited', 'category' => 'others'])->json('data.id');
    $this->putJson("/api/assistant-types/{$id}", ['name' => 'Audited Again']);
    $this->deleteJson("/api/assistant-types/{$id}");

    expect(Activity::where('subject_type', (new AssistantType)->getMorphClass())->where('subject_id', $id)->pluck('event')->all())
        ->toBe(['created', 'updated', 'deleted']);
});

it('offers active types plus the ones a record already uses', function () {
    $retired = AssistantType::where('code', 'hospital_bill')->firstOrFail();
    $retired->update(['is_active' => false]);

    expect(AssistantType::idOptions())->not->toHaveKey($retired->id)
        ->and(AssistantType::idOptions([$retired->id]))->toHaveKey($retired->id);
});

it('manages Types of Assistance in the admin panel', function () {
    actingAs(typeUser('Admin'));

    Livewire::test(ListAssistantTypes::class)->assertOk()->assertCanSeeTableRecords(AssistantType::all());

    Livewire::test(CreateAssistantType::class)
        ->fillForm(['name' => 'Food Packs', 'code' => 'food_packs', 'category' => 'food', 'is_active' => true])
        ->call('create')
        ->assertHasNoFormErrors();

    $food = AssistantType::where('code', 'food_packs')->firstOrFail();

    Livewire::test(CreateAssistantType::class)
        ->fillForm(['name' => 'Food Packs', 'code' => 'Food Packs', 'category' => 'food'])
        ->call('create')
        ->assertHasFormErrors(['name' => 'unique', 'code' => 'regex']);

    Livewire::test(EditAssistantType::class, ['record' => $food->getRouteKey()])
        ->fillForm(['description' => 'Relief goods'])
        ->call('save')
        ->assertHasNoFormErrors()
        ->callAction(DeleteAction::class);

    expect(AssistantType::find($food->id))->toBeNull();

    Livewire::test(EditAssistantType::class, ['record' => $food->getRouteKey()])->callAction('restore');

    expect(AssistantType::find($food->id)?->description)->toBe('Relief goods');
});

it('keeps Types of Assistance away from users without settings.manage in the admin panel', function () {
    actingAs(typeUser('Case Manager'));

    Livewire::test(ListAssistantTypes::class)->assertForbidden();
});

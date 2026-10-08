<?php

use App\Models\Signatory;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function signatoryUser(string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    $user->assignRole($role);

    return $user;
}

it('seeds the current approver through the migration', function () {
    expect(Signatory::activeFor('allied_health_chief')?->name)
        ->toBe('DR. JAIME KRISTOFFER T. PUNZALAN, MPH');
});

it('lets library.manage create, update and soft-delete a signatory', function () {
    Sanctum::actingAs(signatoryUser('Supervisor'));
    Signatory::query()->update(['is_active' => false]);

    $id = $this->postJson('/api/signatories', [
        'name' => 'DR. ANA REYES', 'title' => "Chief\nAllied Health", 'role' => 'allied_health_chief',
    ])
        ->assertCreated()
        ->assertJsonPath('data.is_active', true)
        ->assertJsonPath('data.role_label', Signatory::ROLES['allied_health_chief'])
        ->json('data.id');

    $this->putJson("/api/signatories/{$id}", ['title' => 'OIC Chief'])
        ->assertOk()
        ->assertJsonPath('data.title', 'OIC Chief');

    $this->deleteJson("/api/signatories/{$id}")->assertNoContent();

    expect(Signatory::withTrashed()->find($id)->trashed())->toBeTrue();
});

it('allows only one active signatory per role', function () {
    Sanctum::actingAs(signatoryUser('Supervisor'));

    $this->postJson('/api/signatories', ['name' => 'DR. NEW', 'role' => 'allied_health_chief'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('is_active');

    // An inactive successor is fine, and becomes active once the incumbent steps down.
    $id = $this->postJson('/api/signatories', ['name' => 'DR. NEW', 'role' => 'allied_health_chief', 'is_active' => false])
        ->assertCreated()
        ->json('data.id');

    $this->putJson("/api/signatories/{$id}", ['is_active' => true])->assertUnprocessable();

    $incumbent = Signatory::activeFor('allied_health_chief');
    $this->putJson("/api/signatories/{$incumbent->id}", ['is_active' => false])->assertOk();
    $this->putJson("/api/signatories/{$id}", ['is_active' => true])->assertOk();

    expect(Signatory::activeFor('allied_health_chief')->id)->toBe($id);
});

it('rejects an unknown role', function () {
    Sanctum::actingAs(signatoryUser('Supervisor'));

    $this->postJson('/api/signatories', ['name' => 'X', 'role' => 'janitor', 'is_active' => false])
        ->assertJsonValidationErrors('role');
});

it('lets any signed-in user read but only library.manage write', function () {
    Sanctum::actingAs(signatoryUser('Case Manager'));

    $this->getJson('/api/signatories')->assertOk()->assertJsonCount(1, 'data');
    $this->postJson('/api/signatories', ['name' => 'X', 'role' => 'allied_health_chief', 'is_active' => false])
        ->assertForbidden();
});

it('refuses an unauthenticated caller', function () {
    $this->getJson('/api/signatories')->assertUnauthorized();
});

it('records an audit trail of edits', function () {
    Sanctum::actingAs(signatoryUser('Supervisor'));
    $signatory = Signatory::activeFor('allied_health_chief');

    $this->putJson("/api/signatories/{$signatory->id}", ['title' => 'Chief, AHPS'])->assertOk();

    expect(Activity::query()
        ->where('subject_type', $signatory->getMorphClass())
        ->where('subject_id', $signatory->id)
        ->where('event', 'updated')
        ->exists())->toBeTrue();
});

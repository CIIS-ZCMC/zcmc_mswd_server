<?php

use App\Models\CaseModel;
use App\Models\CaseWatcher;
use App\Models\PatientWatcher;
use Illuminate\Support\Arr;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
 // ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Assigns a watcher to a case. Accepts the old flat shape (name, relationship,
 * contact_number, address) and creates the patient watcher behind it, unless a
 * patient_watcher_id is given.
 *
 * @param  array<string, mixed>  $attributes
 */
function assignWatcher(array $attributes): CaseWatcher
{
    $patientWatcherId = $attributes['patient_watcher_id'] ?? PatientWatcher::create([
        'patient_id' => CaseModel::findOrFail($attributes['case_id'])->patient_id,
        'name' => $attributes['name'] ?? 'Watcher',
        'relationship_code' => $attributes['relationship'] ?? 'other',
        'contact_number' => $attributes['contact_number'] ?? null,
        'address' => $attributes['address'] ?? null,
    ])->id;

    return CaseWatcher::create(
        Arr::except($attributes, ['name', 'relationship', 'contact_number', 'address'])
        + ['patient_watcher_id' => $patientWatcherId],
    );
}

<?php

use App\Support\UisExpenseSlots;

function expenseLines(array $lines): array
{
    return array_map(fn (array $line) => (object) ['expense_type' => $line[0], 'amount' => $line[1]], $lines);
}

it('maps expense labels onto the ANNEX B section III slots', function () {
    $slots = UisExpenseSlots::slots(expenseLines([
        ['Food', 3500], ['Transport', 300], ['Medical', 800],
        ['Insurance Premium', 150], ['Education', 400], ['Clothing', 321], ['House help', 777],
    ]));

    expect($slots)->toBe([
        'food' => 3500.0, 'education' => 400.0, 'transport' => 300.0,
        'clothing' => 321.0, 'medical' => 800.0, 'house_help' => 777.0, 'insurance' => 150.0, 'others' => null,
    ]);
});

it('keeps House help and Clothing in their own slots', function () {
    $slots = UisExpenseSlots::slots(expenseLines([['House help', 500], ['Clothing', 200]]));

    expect($slots['house_help'])->toBe(500.0)
        ->and($slots['clothing'])->toBe(200.0);
});

it('sums several lines of the same slot', function () {
    $slots = UisExpenseSlots::slots(expenseLines([['Food', 100.10], ['Food (extra)', 50.20]]));

    expect($slots['food'])->toBe(150.3);
});

it('has no slot for house rent, light or water', function () {
    $slots = UisExpenseSlots::slots(expenseLines([['House rent', 1200], ['Light source', 800], ['Water source', 350]]));

    expect($slots)->not->toHaveKeys(['housing', 'light', 'water'])
        ->and(array_filter($slots, fn ($v) => $v !== null))->toBe([]);
});

it('counts an Others line under Others only, whatever its detail text says', function () {
    $slots = UisExpenseSlots::slots(expenseLines([['Others: School fees', 100], ['Others', 50]]));

    expect($slots['others'])->toBe(150.0)
        ->and($slots['education'])->toBeNull();
});

it('leaves every slot null for no lines, and ignores unmatched labels', function () {
    expect(array_filter(UisExpenseSlots::slots([]), fn ($v) => $v !== null))->toBe([])
        ->and(array_filter(UisExpenseSlots::slots(expenseLines([['Light / Power (Electricity)', 900]])), fn ($v) => $v !== null))->toBe([]);
});

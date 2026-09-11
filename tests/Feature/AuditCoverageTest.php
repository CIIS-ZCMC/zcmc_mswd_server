<?php

use App\Models\Assessment;
use App\Models\AssessmentExpense;
use App\Models\AssistantType;
use App\Models\CaseActivity;
use App\Models\CaseModel;
use App\Models\CaseProgressNote;
use App\Models\CaseWatcher;
use App\Models\Concerns\Auditable;
use App\Models\Diagnostic;
use App\Models\DiagnosticReport;
use App\Models\Document;
use App\Models\Guarantor;
use App\Models\Intervention;
use App\Models\InterventionType;
use App\Models\Patient;
use App\Models\PatientAssistance;
use App\Models\PatientAssistanceLog;
use App\Models\PatientAssistanceReport;
use App\Models\PatientCaretaker;
use App\Models\PatientFamilyMember;
use App\Models\PatientId;
use App\Models\PatientMerge;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\UnifiedIntakeSheet;
use App\Models\User;
use App\Models\WatcherRelationshipType;

/**
 * Guards the audit coverage Phase 1 of the Patient Caretake plan establishes.
 * A model dropped from this trail goes unnoticed otherwise — nothing else in
 * the suite asserts that a given model records activity at all.
 */
$audited = [
    // Patient-level
    Patient::class,
    PatientId::class,
    PatientFamilyMember::class,
    PatientWatcher::class,
    PatientCaretaker::class,
    PatientMerge::class,
    // Episode-level
    CaseModel::class,
    CaseWatcher::class,
    Assessment::class,
    AssessmentExpense::class,
    CaseProgressNote::class,
    Intervention::class,
    Diagnostic::class,
    DiagnosticReport::class,
    PatientAssistance::class,
    PatientAssistanceLog::class,
    PatientAssistanceReport::class,
    Document::class,
    UnifiedIntakeSheet::class,
    Guarantor::class,
];

it('records an audit trail on every model the caretake module covers', function (string $model) {
    expect(class_uses_recursive($model))->toContain(Auditable::class);
})->with($audited);

it('logs only dirty attributes and skips empty logs', function (string $model) {
    $options = (new $model)->getActivitylogOptions();

    expect($options->logOnlyDirty)->toBeTrue()
        ->and($options->submitEmptyLogs)->toBeFalse();
})->with($audited);

it('keeps the unified intake sheet on its curated field list and log name', function () {
    $options = (new UnifiedIntakeSheet)->getActivitylogOptions();

    expect($options->logName)->toBe('intake')
        ->and($options->logFillable)->toBeFalse()
        ->and($options->logAttributes)->not->toContain('submitted_at', 'finalized_at');
});

it('leaves master data and identity models out of the trail', function (string $model) {
    expect(class_uses_recursive($model))->not->toContain(Auditable::class);
})->with([
    User::class,
    Sector::class,
    AssistantType::class,
    InterventionType::class,
    WatcherRelationshipType::class,
    CaseActivity::class,
]);

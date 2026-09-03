@php
    $p = $sheet->patient;
    $case = $sheet->case;
    $a = $sheet->assessment;
    $isFinal = $sheet->status === \App\Models\UnifiedIntakeSheet::STATUS_FINALIZED;

    $fullName = collect([$p?->last_name, $p?->first_name, $p?->middle_name, $p?->extension_name])
        ->filter()->join(' ');

    $age = $p?->birthdate ? \Illuminate\Support\Carbon::parse($p->birthdate)->age : $p?->estimated_age;

    $address = collect([$p?->address, $p?->barangay, $p?->municipality, $p?->province])
        ->filter()->join(', ');

    // Same birthdate-first, fallback-second rule the patient header uses above.
    $memberAge = fn ($m) => $m->birthdate
        ? \Illuminate\Support\Carbon::parse($m->birthdate)->age
        : $m->age;

    $peso = fn ($v) => $v === null ? '—' : '₱ '.number_format((float) $v, 2);
    $val = fn ($v) => filled($v) ? e($v) : '—';
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 10px; color: #1a1a1a; margin: 0; }
        h1, h2, h3 { margin: 0; }
        .muted { color: #666; }
        .center { text-align: center; }
        .right { text-align: right; }

        .letterhead { border-bottom: 2px solid #b45309; padding-bottom: 8px; margin-bottom: 10px; }
        .letterhead .office { font-size: 13px; font-weight: bold; letter-spacing: 1px; }
        .letterhead .sub { font-size: 9px; color: #666; }
        .doc-title { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; }

        .meta { width: 100%; margin-bottom: 10px; }
        .meta td { padding: 1px 0; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: bold;
                 text-transform: uppercase; background: #fde68a; color: #92400e; }
        .badge-final { background: #bbf7d0; color: #166534; }

        .section-title { background: #f3f4f6; border-left: 3px solid #b45309; padding: 4px 8px; margin: 12px 0 6px;
                         font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }

        table.data { width: 100%; border-collapse: collapse; }
        table.data td { padding: 3px 6px; vertical-align: top; }
        .label { color: #666; width: 24%; }
        .value { font-weight: bold; }

        table.grid { width: 100%; border-collapse: collapse; margin-top: 4px; }
        table.grid th { background: #f3f4f6; text-align: left; padding: 4px 6px; font-size: 9px;
                        border: 1px solid #d1d5db; }
        table.grid td { padding: 4px 6px; border: 1px solid #d1d5db; }
        /* Seven columns on A4 portrait: fixed layout makes the percentage widths
           authoritative, without it a long occupation blows the column out. */
        table.grid.family { table-layout: fixed; }
        table.grid.family th, table.grid.family td { padding: 3px 4px; font-size: 9px; word-wrap: break-word; }
        table.grid.family .sub { font-size: 8px; color: #666; }

        .prose { padding: 4px 6px; }
        .prose .q { color: #666; font-style: italic; }

        .signatures { width: 100%; margin-top: 28px; }
        .signatures td { width: 33%; text-align: center; padding: 0 10px; vertical-align: bottom; }
        .sig-line { border-top: 1px solid #333; padding-top: 3px; font-weight: bold; }
        .sig-role { font-size: 8px; color: #666; text-transform: uppercase; }

        .footer { position: fixed; bottom: -10px; left: 0; right: 0; font-size: 8px; color: #999;
                  border-top: 1px solid #e5e7eb; padding-top: 4px; }

        .watermark { position: fixed; top: 40%; left: 12%; font-size: 110px; color: #000;
                     opacity: 0.06; transform: rotate(-35deg); font-weight: bold; }
    </style>
</head>
<body>

@unless($isFinal)
    <div class="watermark">{{ strtoupper($sheet->status) }}</div>
@endunless

<div class="letterhead">
    <table style="width:100%"><tr>
        <td>
            <div class="office">ZAMBOANGA CITY MEDICAL CENTER</div>
            <div class="sub">Medical Social Services — Unified Intake System</div>
        </td>
        <td class="right">
            <span class="badge {{ $isFinal ? 'badge-final' : '' }}">{{ $sheet->status }}</span>
        </td>
    </tr></table>
    <div class="doc-title center">Unified Intake Sheet</div>
</div>

<table class="meta">
    <tr>
        <td class="label">Intake No.</td><td class="value">{{ $sheet->intake_no }}</td>
        <td class="label">Date of Intake</td><td class="value">{{ optional($sheet->date_of_intake)->format('M d, Y') ?? '—' }}</td>
    </tr>
    <tr>
        <td class="label">Referral Source</td><td>{{ $val($sheet->referral_source) }}</td>
        <td class="label">Intake Worker</td><td>{{ $val($sheet->intakeWorker?->employee_name) }}</td>
    </tr>
</table>

<div class="section-title">1. Patient Information</div>
<table class="data">
    <tr>
        <td class="label">Full Name</td><td class="value" colspan="3">{{ $val($fullName) }}</td>
    </tr>
    <tr>
        <td class="label">Sex</td><td>{{ $val($p?->sex) }}</td>
        <td class="label">Age</td><td>{{ $val($age) }}</td>
    </tr>
    <tr>
        <td class="label">Birthdate</td><td>{{ optional($p?->birthdate)->format('M d, Y') ?? '—' }}</td>
        <td class="label">Civil Status</td><td>{{ $val($p?->civil_status) }}</td>
    </tr>
    <tr>
        <td class="label">Address</td><td colspan="3">{{ $val($address) }}</td>
    </tr>
    <tr>
        <td class="label">Contact No.</td><td>{{ $val($p?->contact_number) }}</td>
        <td class="label">Sector</td><td>{{ $val($p?->sector?->name) }}</td>
    </tr>
</table>

@if($p && $p->patientIds->isNotEmpty())
    <div class="section-title">2. Valid Identification</div>
    <table class="grid">
        <tr><th>ID Type</th><th>ID Number</th></tr>
        @foreach($p->patientIds as $id)
            <tr><td>{{ $val($id->id_type) }}</td><td>{{ $val($id->id_number) }}</td></tr>
        @endforeach
    </table>
@endif

<div class="section-title">3. Family Composition & Socioeconomic Profile</div>
@if($p && $p->familyMembers->isNotEmpty())
    <table class="grid family">
        <tr>
            <th style="width:22%">Name</th>
            <th style="width:13%">Relationship</th>
            <th style="width:8%">Sex</th>
            <th style="width:8%">Age</th>
            <th style="width:17%">Educational Attainment</th>
            <th style="width:17%">Occupation</th>
            <th class="right" style="width:15%">Monthly Income</th>
        </tr>
        @foreach($p->familyMembers as $m)
            <tr>
                <td>{{ $val($m->name) }}</td>
                <td>{{ $val($m->relationship) }}</td>
                <td>{{ $val($m->sex) }}</td>
                <td>
                    {{ $val($memberAge($m)) }}
                    @if($m->birthdate)
                        <div class="sub">{{ $m->birthdate->format('m/d/Y') }}</div>
                    @endif
                </td>
                <td>{{ $val($m->educational_attainment) }}</td>
                <td>{{ $val($m->occupation) }}</td>
                <td class="right">{{ $peso($m->monthly_income) }}</td>
            </tr>
        @endforeach
    </table>
@else
    <div class="prose muted">No family members recorded.</div>
@endif
<table class="data" style="margin-top:4px">
    <tr>
        <td class="label">Total Family Income</td><td class="value">{{ $peso($a?->total_family_income) }}</td>
        <td class="label">Classification</td><td class="value">{{ $val($a?->classification) }}</td>
    </tr>
    <tr>
        <td class="label">Housing Type</td><td>{{ $val($a?->housing_type) }}</td>
        <td class="label">Utilities</td><td>{{ $val($a?->utilities_access) }}</td>
    </tr>
</table>

<div class="section-title">4. Case Details</div>
<table class="data">
    <tr>
        <td class="label">Case Code</td><td class="value">{{ $val($case?->case_code) }}</td>
        <td class="label">Case Type</td><td>{{ $val($case?->case_type) }}</td>
    </tr>
    <tr>
        <td class="label">Priority</td><td>{{ $val($case?->priority_level) }}</td>
        <td class="label">Admission Type</td><td>{{ $val($case?->admission_type) }}</td>
    </tr>
    <tr>
        <td class="label">Date Opened</td><td>{{ optional($case?->date_opened)->format('M d, Y') ?? '—' }}</td>
        <td class="label">Assigned Worker</td><td>{{ $val($case?->assignedUser?->employee_name) }}</td>
    </tr>
</table>

<div class="section-title">5. Assessment</div>
<table class="data">
    <tr><td class="label">Presenting Problem</td><td class="prose">{{ $val($a?->presenting_problem) }}</td></tr>
    <tr><td class="label">Family Background</td><td class="prose">{{ $val($a?->family_background) }}</td></tr>
    <tr><td class="label">Social Functioning</td><td class="prose">{{ $val($a?->social_functioning) }}</td></tr>
    <tr><td class="label">Intervention Plan</td><td class="prose">{{ $val($a?->intervention_plan) }}</td></tr>
</table>

@if($case && $case->patientAssistances->isNotEmpty())
    <div class="section-title">6. Recommended Assistance</div>
    <table class="grid">
        <tr><th>Type</th><th class="right">Amount</th><th>Status</th><th>Notes</th></tr>
        @foreach($case->patientAssistances as $aid)
            <tr>
                <td>{{ $val($aid->assistantType?->name) }}</td>
                <td class="right">{{ $peso($aid->amount) }}</td>
                <td>{{ $val($aid->status) }}</td>
                <td>{{ $val($aid->notes) }}</td>
            </tr>
        @endforeach
    </table>
@endif

<table class="signatures">
    <tr>
        <td><div class="sig-line">{{ $val($sheet->intakeWorker?->employee_name) }}</div><div class="sig-role">Intake Worker</div></td>
        <td><div class="sig-line">{{ $isFinal ? $val($sheet->finalizer?->employee_name) : '&nbsp;' }}</div><div class="sig-role">Reviewed / Approved by</div></td>
        <td><div class="sig-line">&nbsp;</div><div class="sig-role">Client / Representative</div></td>
    </tr>
</table>

<div class="footer">
    <table style="width:100%"><tr>
        <td>{{ $sheet->intake_no }} @if($isFinal && $sheet->finalized_at) · Finalized {{ $sheet->finalized_at->format('M d, Y g:i A') }} @endif</td>
        <td class="right">Generated {{ now()->format('M d, Y g:i A') }}</td>
    </tr></table>
</div>

</body>
</html>

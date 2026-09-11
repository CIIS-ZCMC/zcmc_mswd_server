@php
    $case = $scsr->case;
    $p = $case?->patient;
    $isFinal = $scsr->social_case_status === \App\Models\Assessment::SOCIAL_CASE_FINALIZED;

    $fullName = collect([$p?->last_name, $p?->first_name, $p?->middle_name, $p?->extension_name])
        ->filter()->join(' ');

    $age = $p?->birthdate ? \Illuminate\Support\Carbon::parse($p->birthdate)->age : $p?->estimated_age;

    $address = collect([$p?->address, $p?->barangay, $p?->municipality, $p?->province])
        ->filter()->join(', ');

    // Same birthdate-first, fallback-second rule the patient header uses.
    $memberAge = fn ($m) => $m->birthdate
        ? \Illuminate\Support\Carbon::parse($m->birthdate)->age
        : $m->age;

    $peso = fn ($v) => $v === null ? '—' : '₱ '.number_format((float) $v, 2);
    $val = fn ($v) => filled($v) ? e($v) : '—';
    $prose = fn ($v) => filled($v) ? nl2br(e($v)) : '<span class="muted">Not on file.</span>';

    $expensesTotal = $scsr->expenses->sum('amount');
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
@include('pdf.partials._styles')
</head>
<body>

@unless($isFinal)
    <div class="watermark">{{ strtoupper(str_replace('_', ' ', (string) $scsr->social_case_status)) }}</div>
@endunless

<div class="letterhead">
    <table style="width:100%"><tr>
        <td>
            <div class="office">ZAMBOANGA CITY MEDICAL CENTER</div>
            <div class="sub">Medical Social Services</div>
        </td>
        <td class="right">
            <span class="badge {{ $isFinal ? 'badge-final' : '' }}">{{ str_replace('_', ' ', (string) $scsr->social_case_status) }}</span>
        </td>
    </tr></table>
    <div class="doc-title center">Social Case Study Report</div>
</div>

<table class="meta">
    <tr>
        <td class="label">SCSR No.</td><td class="value">{{ $val($scsr->social_case_no) }}</td>
        <td class="label">Revision</td><td class="value">{{ $scsr->revision }}</td>
    </tr>
    <tr>
        <td class="label">Case Code</td><td>{{ $val($case?->case_code) }}</td>
        <td class="label">Date Opened</td><td>{{ optional($case?->date_opened)->format('M d, Y') ?? '—' }}</td>
    </tr>
    <tr>
        <td class="label">Case Manager</td><td>{{ $val($case?->assignedUser?->employee_name) }}</td>
        <td class="label">Classification</td><td>{{ $val($scsr->classification) }}</td>
    </tr>
</table>

{{-- I. Identifying data is derived at render, never stored: the patient record
     mutates, and the archived PDF is what freezes it. --}}
<div class="section-title">I. Identifying Data</div>
<table class="data">
    <tr>
        <td class="label">Name</td><td class="value">{{ $val($fullName) }}</td>
        <td class="label">Age / Sex</td><td>{{ $age ?? '—' }} / {{ $val($p?->sex) }}</td>
    </tr>
    <tr>
        <td class="label">Birthdate</td><td>{{ optional($p?->birthdate)->format('M d, Y') ?? '—' }}</td>
        <td class="label">Civil Status</td><td>{{ $val($p?->civil_status) }}</td>
    </tr>
    <tr>
        <td class="label">Address</td><td colspan="3">{{ $val($address) }}</td>
    </tr>
    <tr>
        <td class="label">Sector</td><td>{{ $val($p?->sector?->name) }}</td>
        <td class="label">Contact No.</td><td>{{ $val($p?->contact_number) }}</td>
    </tr>
    @if($p?->patientIds?->isNotEmpty())
        <tr>
            <td class="label">Identification</td>
            <td colspan="3">{{ $p->patientIds->map(fn ($id) => "{$id->id_type}: {$id->id_number}")->join(' · ') }}</td>
        </tr>
    @endif
</table>

<div class="section-title">II. Source and Reason for Referral</div>
<table class="data">
    <tr><td class="label">Referral Source</td><td>{{ $val($scsr->referral_source) }}</td></tr>
</table>
<div class="prose">{!! $prose($scsr->reason_for_referral) !!}</div>

<div class="section-title">III. Problem Presented</div>
<div class="prose">{!! $prose($scsr->presenting_problem) !!}</div>

<div class="section-title">IV. Family Composition and Background</div>
@if($p?->familyMembers?->isNotEmpty())
    <table class="grid family">
        <thead><tr>
            <th style="width:24%">Name</th>
            <th style="width:13%">Relationship</th>
            <th style="width:7%">Age</th>
            <th style="width:8%">Sex</th>
            <th style="width:18%">Education</th>
            <th style="width:16%">Occupation</th>
            <th style="width:14%">Monthly Income</th>
        </tr></thead>
        <tbody>
        @foreach($p->familyMembers as $m)
            <tr>
                <td>{{ $val($m->name) }}</td>
                <td>{{ $val($m->relationship) }}</td>
                <td>{{ $memberAge($m) ?? '—' }}</td>
                <td>{{ $val($m->sex) }}</td>
                <td>{{ $val($m->educational_attainment) }}</td>
                <td>{{ $val($m->occupation) }}</td>
                <td class="right">{{ $peso($m->monthly_income) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@else
    <div class="prose muted">No family members on file.</div>
@endif
<div class="prose">{!! $prose($scsr->family_background) !!}</div>

<div class="section-title">V. Economic and Environmental Situation</div>
<table class="data">
    <tr>
        <td class="label">Total Family Income</td><td class="value">{{ $peso($scsr->total_family_income) }}</td>
        <td class="label">Housing Type</td><td>{{ $val($scsr->housing_type) }}</td>
    </tr>
    <tr>
        <td class="label">Utilities Access</td><td colspan="3">{{ $val($scsr->utilities_access) }}</td>
    </tr>
</table>
@if($scsr->expenses->isNotEmpty())
    <table class="grid">
        <thead><tr><th>Household Expense</th><th class="right" style="width:25%">Amount</th></tr></thead>
        <tbody>
        @foreach($scsr->expenses as $expense)
            <tr>
                <td>{{ $val($expense->expense_type) }}</td>
                <td class="right">{{ $peso($expense->amount) }}</td>
            </tr>
        @endforeach
        <tr>
            <td class="value">Total Expenses</td>
            <td class="right value">{{ $peso($expensesTotal) }}</td>
        </tr>
        </tbody>
    </table>
@endif

<div class="section-title">VI. Health and Medical History</div>
<div class="prose">{!! $prose($scsr->medical_history) !!}</div>

<div class="section-title">VII. Social Functioning</div>
<div class="prose">{!! $prose($scsr->social_functioning) !!}</div>

<div class="section-title">VIII. Assessment and Analysis</div>
<div class="prose">{!! $prose($scsr->assessment_notes) !!}</div>

<div class="section-title">IX. Recommendation</div>
<table class="data">
    <tr>
        <td class="label">Recommended Assistance</td><td>{{ $val($scsr->recommended_assistance) }}</td>
        <td class="label">Recommended Amount</td><td class="value">{{ $peso($scsr->recommended_amount) }}</td>
    </tr>
</table>
<div class="prose">{!! $prose($scsr->recommendation) !!}</div>

<div class="section-title">X. Plan of Intervention</div>
<div class="prose">{!! $prose($scsr->intervention_plan) !!}</div>
@if($case?->interventions?->isNotEmpty())
    <table class="grid">
        <thead><tr><th style="width:25%">Intervention</th><th style="width:15%">Date Given</th><th>Outcome</th></tr></thead>
        <tbody>
        @foreach($case->interventions as $intervention)
            <tr>
                <td>{{ $val($intervention->interventionType?->name) }}</td>
                <td>{{ optional($intervention->date_given)->format('M d, Y') ?? '—' }}</td>
                <td>{{ $val($intervention->outcome) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif

<table class="signatures">
    <tr>
        <td><div class="sig-line">{{ $val($scsr->preparedBy?->employee_name) }}</div><div class="sig-role">Prepared by — Medical Social Worker</div></td>
        <td>&nbsp;</td>
        <td><div class="sig-line">{{ $isFinal ? $val($scsr->notedBy?->employee_name) : '&nbsp;' }}</div><div class="sig-role">Noted by — Section Head</div></td>
    </tr>
</table>

<div class="footer">
    <table style="width:100%"><tr>
        <td>{{ $val($scsr->social_case_no) }} · Revision {{ $scsr->revision }}
            @if($isFinal && $scsr->noted_at) · Noted {{ $scsr->noted_at->format('M d, Y g:i A') }} @endif
        </td>
        <td class="right">Generated {{ now()->format('M d, Y g:i A') }}</td>
    </tr></table>
</div>

</body>
</html>

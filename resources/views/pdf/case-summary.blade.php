@php
    $p = $case->patient;
    $scsr = $case->socialCase;

    $fullName = collect([$p?->last_name, $p?->first_name, $p?->middle_name, $p?->extension_name])
        ->filter()->join(' ');

    $age = $p?->birthdate ? \Illuminate\Support\Carbon::parse($p->birthdate)->age : $p?->estimated_age;

    $address = collect([$p?->address, $p?->barangay, $p?->municipality, $p?->province])
        ->filter()->join(', ');

    $peso = fn ($v) => $v === null ? '—' : '₱ '.number_format((float) $v, 2);
    $val = fn ($v) => filled($v) ? e($v) : '—';
    $prose = fn ($v) => filled($v) ? nl2br(e($v)) : '<span class="muted">Not on file.</span>';
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
@include('pdf.partials._styles')
</head>
<body>

<div class="letterhead">
    <table style="width:100%"><tr>
        <td>
            <div class="office">ZAMBOANGA CITY MEDICAL CENTER</div>
            <div class="sub">Medical Social Services</div>
        </td>
        <td class="right">
            <span class="badge {{ $case->status === 'closed' ? 'badge-final' : '' }}">{{ $case->status }}</span>
        </td>
    </tr></table>
    <div class="doc-title center">Case Summary</div>
</div>

<table class="meta">
    <tr>
        <td class="label">Case Code</td><td class="value">{{ $val($case->case_code) }}</td>
        <td class="label">Date Opened</td><td>{{ optional($case->date_opened)->format('M d, Y') ?? '—' }}</td>
    </tr>
    <tr>
        <td class="label">Case Manager</td><td>{{ $val($case->assignedUser?->employee_name) }}</td>
        <td class="label">Case Type</td><td>{{ $val($case->case_type) }}</td>
    </tr>
</table>

<div class="section-title">Patient</div>
<table class="data">
    <tr>
        <td class="label">Name</td><td class="value">{{ $val($fullName) }}</td>
        <td class="label">Age / Sex</td><td>{{ $age ?? '—' }} / {{ $val($p?->sex) }}</td>
    </tr>
    <tr>
        <td class="label">Address</td><td colspan="3">{{ $val($address) }}</td>
    </tr>
    <tr>
        <td class="label">Sector</td><td>{{ $val($p?->sector?->name) }}</td>
        <td class="label">Contact No.</td><td>{{ $val($p?->contact_number) }}</td>
    </tr>
</table>

@if($case->watchers->isNotEmpty())
    <div class="section-title">Watchers</div>
    <table class="grid">
        <thead><tr><th>Name</th><th style="width:25%">Relationship</th><th style="width:18%">Primary</th></tr></thead>
        <tbody>
        @foreach($case->watchers as $watcher)
            <tr>
                <td>{{ $val($watcher->name) }}</td>
                <td>{{ $val($watcher->relationship) }}</td>
                <td>{{ $watcher->is_primary ? 'Yes' : 'No' }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif

<div class="section-title">Social Case Study</div>
@if($scsr === null)
    <div class="prose muted">No social case study has been started for this case.</div>
@else
    <table class="data">
        <tr>
            <td class="label">SCSR No.</td><td class="value">{{ $val($scsr->social_case_no) }}</td>
            <td class="label">Status</td><td>{{ str_replace('_', ' ', (string) $scsr->social_case_status) }} (rev {{ $scsr->revision }})</td>
        </tr>
        <tr>
            <td class="label">Classification</td><td>{{ $val($scsr->classification) }}</td>
            <td class="label">Family Income</td><td>{{ $peso($scsr->total_family_income) }}</td>
        </tr>
        <tr>
            <td class="label">Prepared by</td><td>{{ $val($scsr->preparedBy?->employee_name) }}</td>
            <td class="label">Noted by</td><td>{{ $val($scsr->notedBy?->employee_name) }}</td>
        </tr>
    </table>

    <div class="section-title">Problem Presented</div>
    <div class="prose">{!! $prose($scsr->presenting_problem) !!}</div>

    <div class="section-title">Assessment</div>
    <div class="prose">{!! $prose($scsr->assessment_notes) !!}</div>

    <div class="section-title">Recommendation</div>
    <table class="data">
        <tr>
            <td class="label">Recommended Assistance</td><td>{{ $val($scsr->recommended_assistance) }}</td>
            <td class="label">Recommended Amount</td><td class="value">{{ $peso($scsr->recommended_amount) }}</td>
        </tr>
    </table>
    <div class="prose">{!! $prose($scsr->recommendation) !!}</div>

    <div class="section-title">Plan of Intervention</div>
    <div class="prose">{!! $prose($scsr->intervention_plan) !!}</div>
@endif

<div class="section-title">Interventions Delivered</div>
@if($case->interventions->isEmpty())
    <div class="prose muted">None recorded.</div>
@else
    <table class="grid">
        <thead><tr><th style="width:25%">Type</th><th style="width:15%">Date Given</th><th>Outcome</th></tr></thead>
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

<div class="section-title">Assistance</div>
@if($case->patientAssistances->isEmpty())
    <div class="prose muted">None recorded.</div>
@else
    <table class="grid">
        <thead><tr><th style="width:30%">Type</th><th style="width:20%">Status</th><th class="right" style="width:20%">Amount</th><th>Notes</th></tr></thead>
        <tbody>
        @foreach($case->patientAssistances as $assistance)
            <tr>
                <td>{{ $val($assistance->assistantType?->name) }}</td>
                <td>{{ $val($assistance->status) }}</td>
                <td class="right">{{ $peso($assistance->amount) }}</td>
                <td>{{ $val($assistance->notes) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif

<div class="section-title">Progress Notes</div>
@if($case->progressNotes->isEmpty())
    <div class="prose muted">None recorded.</div>
@else
    <table class="grid">
        <thead><tr>
            <th style="width:14%">Date</th>
            <th style="width:18%">Type</th>
            <th>Narrative</th>
            <th style="width:18%">Author</th>
        </tr></thead>
        <tbody>
        @foreach($case->progressNotes->sortByDesc('note_date') as $note)
            <tr>
                <td>{{ optional($note->note_date)->format('M d, Y') ?? '—' }}</td>
                <td>{{ str_replace('_', ' ', (string) $note->note_type) }}</td>
                <td>{{ $val($note->narrative) }}</td>
                <td>{{ $val($note->author?->employee_name) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif

<div class="footer">
    <table style="width:100%"><tr>
        <td>{{ $val($case->case_code) }} — Case Summary</td>
        <td class="right">Generated {{ now()->format('M d, Y g:i A') }}</td>
    </tr></table>
</div>

</body>
</html>

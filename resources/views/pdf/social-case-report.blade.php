@php
    $val = fn ($v) => filled($v) ? e($v) : '—';

    $table = [
        'Social Case Study Status' => $summary['by_social_case_status'],
        'Classification' => $summary['by_classification'],
        'Case Type' => $summary['by_case_type'],
        'Admission Type' => $summary['by_admission_type'],
        'Assigned Worker' => $summary['by_assigned_user'],
    ];
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
@include('pdf.partials._styles')
</head>
<body>

<div class="letterhead">
    <div class="office">ZAMBOANGA CITY MEDICAL CENTER</div>
    <div class="sub">Medical Social Services</div>
    <div class="doc-title center">Social Case Study Report Summary</div>
</div>

<table class="meta">
    <tr>
        <td class="label">Period</td>
        <td class="value">{{ $summary['from'] }} to {{ $summary['to'] }}</td>
        <td class="label">Reports Started</td>
        <td class="value">{{ $summary['total'] }}</td>
    </tr>
    <tr>
        <td class="label">Median Days to Finalize</td>
        <td>{{ $summary['median_days_to_finalize'] ?? '—' }}</td>
        <td class="label">Cases With No Report</td>
        <td>{{ $summary['cases_without_social_case'] }}</td>
    </tr>
    <tr>
        <td class="label">Overdue Follow-ups</td>
        <td colspan="3">{{ $summary['overdue_follow_ups'] }}</td>
    </tr>
</table>

@if($summary['protective_excluded'])
    {{-- Never let a filtered total read as a complete one. --}}
    <div class="prose muted">
        Protective cases are excluded from every figure above. A user with the
        <strong>audit.view_protective</strong> permission sees the complete counts.
    </div>
@endif

@foreach($table as $heading => $counts)
    <div class="section-title">{{ $heading }}</div>
    @if($counts === [])
        <div class="prose muted">No data in this period.</div>
    @else
        <table class="grid">
            <thead><tr><th>{{ $heading }}</th><th class="right" style="width:25%">Count</th></tr></thead>
            <tbody>
            @foreach($counts as $label => $count)
                <tr>
                    <td>{{ $val(str_replace('_', ' ', (string) $label)) }}</td>
                    <td class="right">{{ $count }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
    @endif
@endforeach

<div class="footer">
    <table style="width:100%"><tr>
        <td>Social Case Study Report Summary · {{ $summary['from'] }} to {{ $summary['to'] }}</td>
        <td class="right">Generated {{ now()->format('M d, Y g:i A') }}</td>
    </tr></table>
</div>

</body>
</html>

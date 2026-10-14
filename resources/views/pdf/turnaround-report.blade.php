@php
    $num = fn ($v) => $v === null ? '—' : e($v);
    $pct = fn ($v) => $v === null ? '—' : e($v).'%';
    $stageLabels = \App\Models\TurnaroundTarget::STAGE_LABELS;
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
    <div class="doc-title center">Turnaround Time Report</div>
</div>

<table class="meta">
    <tr>
        <td class="label">Period</td>
        <td class="value">{{ $summary['from'] }} to {{ $summary['to'] }}</td>
        <td class="label">Visits Completed</td>
        <td class="value">{{ $summary['completed'] }}</td>
    </tr>
    <tr>
        <td class="label">Median Total (min)</td>
        <td>{{ $num($summary['stages']['total']['median']) }}</td>
        <td class="label">Visits Cancelled</td>
        <td>{{ $summary['cancelled'] }}</td>
    </tr>
</table>

@if($summary['protective_excluded'])
    {{-- Never let a filtered total read as a complete one. --}}
    <div class="prose muted">
        Visits of patients with a protective case are excluded from every figure. A user with the
        <strong>audit.view_protective</strong> permission sees the complete figures.
    </div>
@endif

<div class="section-title">By Stage (minutes)</div>
<table class="grid">
    <thead><tr>
        <th>Stage</th><th class="right">Target</th><th class="right">Count</th><th class="right">Average</th>
        <th class="right">Median</th><th class="right">90th pct.</th><th class="right">Max</th><th class="right">Within Target</th>
    </tr></thead>
    <tbody>
    @foreach($summary['stages'] as $stage => $stats)
        <tr>
            <td>{{ $stageLabels[$stage] ?? $stage }}</td>
            <td class="right">{{ $num($summary['targets'][$stage]) }}</td>
            <td class="right">{{ $stats['count'] }}</td>
            <td class="right">{{ $num($stats['avg']) }}</td>
            <td class="right">{{ $num($stats['median']) }}</td>
            <td class="right">{{ $num($stats['p90']) }}</td>
            <td class="right">{{ $num($stats['max']) }}</td>
            <td class="right">{{ $pct($stats['within_target_pct']) }}</td>
        </tr>
    @endforeach
    </tbody>
</table>

<div class="section-title">By Worker (total turnaround, minutes)</div>
@if($summary['by_employee'] === [])
    <div class="prose muted">No completed visits in this period.</div>
@else
    <table class="grid">
        <thead><tr>
            <th>Served By</th><th class="right">Visits</th><th class="right">Average</th><th class="right">Median</th>
            <th class="right">Max</th><th class="right">Within Target</th>
        </tr></thead>
        <tbody>
        @foreach($summary['by_employee'] as $row)
            <tr>
                <td>{{ $row['name'] }}</td>
                <td class="right">{{ $row['count'] }}</td>
                <td class="right">{{ $num($row['avg']) }}</td>
                <td class="right">{{ $num($row['median']) }}</td>
                <td class="right">{{ $num($row['max']) }}</td>
                <td class="right">{{ $pct($row['within_target_pct']) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif

<div class="section-title">By Day (total turnaround, minutes)</div>
@if($summary['by_day'] === [])
    <div class="prose muted">No completed visits in this period.</div>
@else
    <table class="grid">
        <thead><tr>
            <th>Date</th><th class="right">Visits</th><th class="right">Average</th><th class="right">Median</th>
            <th class="right">Within Target</th>
        </tr></thead>
        <tbody>
        @foreach($summary['by_day'] as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="right">{{ $row['count'] }}</td>
                <td class="right">{{ $num($row['avg']) }}</td>
                <td class="right">{{ $num($row['median']) }}</td>
                <td class="right">{{ $pct($row['within_target_pct']) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif

<div class="footer">
    <table style="width:100%"><tr>
        <td>Turnaround Time Report · {{ $summary['from'] }} to {{ $summary['to'] }}</td>
        <td class="right">Generated {{ now()->format('M d, Y g:i A') }}</td>
    </tr></table>
</div>

</body>
</html>

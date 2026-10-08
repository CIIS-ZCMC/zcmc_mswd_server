@php
    $val = fn ($v) => filled($v) ? e($v) : '—';
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
@include('pdf.partials._styles')
    <style>
        /* Seven columns on A4 portrait: fixed layout keeps a long address or remark
           from blowing the table out. */
        table.grid.dar { table-layout: fixed; }
        table.grid.dar th, table.grid.dar td { padding: 3px 4px; font-size: 9px; word-wrap: break-word; }
        table.grid.dar .sub { font-size: 8px; color: #666; }
        .signatures td { width: 40%; text-align: left; }
    </style>
</head>
<body>

<div class="letterhead">
    <div class="office">ZAMBOANGA CITY MEDICAL CENTER</div>
    <div class="sub">Medical Social Services</div>
    <div class="doc-title center">Daily Accomplishment Report</div>
</div>

<table class="meta">
    <tr>
        <td class="label">Name</td>
        <td class="value">{{ $val($worker->employee_name) }}</td>
        <td class="label">Date</td>
        <td class="value">{{ $date->format('F d, Y (l)') }}</td>
    </tr>
    <tr>
        <td class="label">Position</td>
        <td>{{ $val($worker->position) }}</td>
        <td class="label">Patients Served</td>
        <td>{{ $summary['patients_served'] }}</td>
    </tr>
</table>

<div class="section-title">Patients Served</div>
@if($lines === [])
    <div class="prose muted">No patients recorded for this day.</div>
@else
    <table class="grid dar">
        <thead>
        <tr>
            <th style="width:4%">#</th>
            <th style="width:9%">Time</th>
            <th style="width:25%">Patient</th>
            <th style="width:12%">Hospital No.</th>
            <th style="width:9%">Age / Sex</th>
            <th style="width:15%">Activity</th>
            <th style="width:26%">Remarks</th>
        </tr>
        </thead>
        <tbody>
        @foreach($lines as $line)
            <tr>
                <td class="right">{{ $line['no'] }}</td>
                <td>{{ $val($line['time']) }}</td>
                <td>
                    {{ $line['patient']['name'] }}
                    @if(filled($line['patient']['address']))
                        <div class="sub">{{ $line['patient']['address'] }}</div>
                    @endif
                </td>
                <td>{{ $val($line['patient']['hospital_id']) }}</td>
                <td>{{ $val($line['patient']['age']) }} / {{ $val($line['patient']['sex'] ? ucfirst($line['patient']['sex']) : null) }}</td>
                <td>{{ $line['activity'] }}</td>
                <td>{{ $val($line['remarks']) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif

@if($summary['by_activity'] !== [])
    <div class="section-title">Summary by Activity</div>
    <table class="grid" style="width:50%">
        <thead><tr><th>Activity</th><th class="right" style="width:30%">Count</th></tr></thead>
        <tbody>
        @foreach($summary['by_activity'] as $label => $count)
            <tr><td>{{ $label }}</td><td class="right">{{ $count }}</td></tr>
        @endforeach
        <tr><td class="value">Total entries</td><td class="right value">{{ $summary['entries'] }}</td></tr>
        </tbody>
    </table>
@endif

<table class="signatures">
    <tr>
        <td>
            <div class="sig-role">Prepared by:</div>
            <div style="height:28px"></div>
            <div class="sig-line">{{ $val($worker->employee_name) }}</div>
            <div>{{ $worker->position }}</div>
            @if(filled($worker->license_no))
                <div class="sig-role">License No. {{ $worker->license_no }}</div>
            @endif
        </td>
        <td></td>
    </tr>
</table>

<div class="footer">
    <table style="width:100%"><tr>
        <td>Daily Accomplishment Report · {{ $val($worker->employee_name) }} · {{ $date->toDateString() }}</td>
        <td class="right">Generated {{ now()->format('M d, Y g:i A') }}</td>
    </tr></table>
</div>

</body>
</html>

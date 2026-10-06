@php
    use Illuminate\Support\Carbon;

    // The UIS is a printable of the case's data, not a stored record. Inputs:
    //   $patient, $case, $assessment (nullable), $printedBy (nullable User), $printedAt (Carbon).
    // See UnifiedIntakeSheetPdfService::renderForCase().
    $p = $patient;
    $a = $assessment;

    $fullName = collect([$p?->last_name, $p?->first_name, $p?->middle_name, $p?->extension_name])
        ->filter()->join(', ');

    // Age as of the print date, which is the interview date on the form.
    $age = $p?->birthdate
        ? (int) Carbon::parse($p->birthdate)->diffInYears($printedAt ?? now())
        : $p?->estimated_age;

    $composedAddress = collect([$p?->address, $p?->barangay, $p?->municipality, $p?->province])
        ->filter()->join(', ');
    $permanentAddress = filled($p?->permanent_address) ? $p->permanent_address : $composedAddress;
    $presentAddress = filled($p?->present_address) ? $p->present_address : $composedAddress;

    // The informant's own address/contact when the worker recorded them; the
    // patient's otherwise (the informant is usually the patient or a relative).
    $informantAddress = filled($a?->informant_address) ? $a->informant_address : $presentAddress;
    $informantContact = filled($a?->informant_contact_number) ? $a->informant_contact_number : $p?->contact_number;

    $philhealthNo = optional($p?->patientIds?->first(
        fn ($id) => str_contains(strtolower((string) $id->id_type), 'philhealth')
    ))->id_number;

    // Plain numbers matching the paper form (no currency symbol / thousands comma;
    // decimals only when present). Empty stays blank for hand fill-in.
    $num = function ($v) {
        if ($v === null || $v === '') {
            return '';
        }
        $f = (float) $v;

        return $f == floor($f) ? (string) (int) $f : rtrim(rtrim(number_format($f, 2, '.', ''), '0'), '.');
    };

    // Underlined fill-in value (blank keeps the ruled line for handwriting).
    $u = fn ($v) => '<span class="u">'.(filled($v) ? e($v) : '&nbsp;').'</span>';

    // A ruled box + label kept on one line; the label is bolded when ticked.
    $optL = fn ($checked, $label) => '<span class="opt"><span class="cb">'.($checked ? 'X' : '&nbsp;').'</span> <span'.($checked ? ' class="b"' : '').'>'.$label.'</span></span>';
    $optR = fn ($checked, $label) => '<span class="opt"><span'.($checked ? ' class="b"' : '').'>'.$label.'</span> <span class="cb">'.($checked ? 'X' : '&nbsp;').'</span></span>';

    $civil = strtolower((string) $p?->civil_status);

    // Other family income: stored as [{source, amount}]; the form has one line.
    $otherIncome = collect($a?->other_income_sources ?? []);
    $otherIncomeLabel = $otherIncome->pluck('source')->filter()->implode(', ');
    $otherIncomeTotal = $otherIncome->isEmpty() ? null : $otherIncome->sum(fn ($i) => (float) ($i['amount'] ?? 0));
    $edu = strtolower((string) $p?->educational_attainment);

    // Section III amounts come from the generic assessment_expenses key/value rows,
    // matched to the form's fixed slots by keyword. The checkbox fields (tenure,
    // light/water source, problem categories) are stored on the assessment.
    $has = fn ($list, $value) => in_array($value, (array) $list, true);
    // The keyword matching lives in UisExpenseSlots, shared with the patient UIS API.
    $slots = \App\Support\UisExpenseSlots::slots($a?->expenses ?? collect());

    $assistances = $case?->patientAssistances ?? collect();

    // §V mode of assistance / fund source print their label; a legacy free-text
    // value (entered before these became fixed lists) prints as typed.
    $modeLabel = \App\Models\Assessment::RECOMMENDATION_MODES[$a?->recommendation_mode] ?? $a?->recommendation_mode;
    $fundLabel = \App\Models\Assessment::FUND_SOURCES[$a?->fund_source] ?? $a?->fund_source;

    $logo = fn ($name) => public_path("images/intake/{$name}.png");
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    {{-- Self-contained styles: ANNEX B is a bordered, checkbox-heavy government
         form unlike the other MSWD PDFs, so it does NOT reuse
         pdf/partials/_styles.blade.php. DejaVu Sans keeps glyphs consistent in
         DomPDF. --}}
    <style>
        @page { margin: 12px 18px 12px 18px; }
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 9px; color: #000; margin: 0; }
        b, .b { font-weight: bold; }
        i { font-style: italic; }
        .center { text-align: center; }
        .right { text-align: right; }
        .sub { font-size: 7px; font-style: italic; color: #333; }

        /* Letterhead (outside the ruled form) */
        .head { width: 100%; border-collapse: collapse; }
        .head td { vertical-align: middle; padding: 0; }
        .head .logos img { height: 34px; margin: 0 4px; vertical-align: middle; }
        .head .malasakit { height: 45px; }
        .annex { font-size: 12px; font-weight: bold; text-decoration: underline; }
        .title { text-align: center; font-size: 13px; font-weight: bold; margin-top: 2px; }
        .idrow { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 2px; }
        .idrow td { padding: 2px 0; font-size: 9px; vertical-align: middle; }

        /* The ruled form */
        table.sheet { border-collapse: collapse; width: 100%; border: 1px solid #000; }
        table.sheet > tbody > tr > td { border: 1px solid #000; padding: 0; vertical-align: top; }

        table.plain { width: 100%; border-collapse: collapse; }
        table.plain > tbody > tr > td { padding: 2.5px 5px; vertical-align: middle; }
        .vdiv { border-left: 1px solid #000; }

        .section { font-weight: bold; padding: 2px 5px; font-size: 9px; }

        table.cells { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.cells > tbody > tr > td, table.cells > tbody > tr > th { border: 1px solid #000; padding: 1.5px 3px;
            vertical-align: top; word-wrap: break-word; }
        table.cells th { text-align: center; font-weight: bold; }

        .cb { display: inline-block; width: 10px; height: 10px; line-height: 10px; text-align: center;
              border: 1px solid #000; font-size: 8.5px; font-weight: bold; vertical-align: middle; margin-right: 3px; }
        .opt { display: inline-block; white-space: nowrap; }
        .u { border-bottom: 1px solid #000; display: inline-block; min-width: 40px; padding: 0 3px;
             text-align: center; font-weight: bold; }
        .uwide { min-width: 220px; }
        .expense-grid td .u { float: right; min-width: 45px; }

        .prose { padding: 3px 4px; min-height: 26px; }
        .cert { text-align: center; font-weight: bold; font-style: italic; margin: 3px 0 1px; font-size: 7px; }
        .clientname { text-align: center; font-weight: bold; font-size: 11px; text-decoration: underline; margin-top: 2px; }
        .thumb { text-align: center; padding: 4px; }
        .thumbbox { border: 1px solid #000; height: 75px; }

        .signame { text-align: center; font-weight: bold; text-decoration: underline; padding-top: 10px; }
        .sigcap { text-align: center; font-size: 7.5px; }
    </style>
</head>
<body>

{{-- ── Letterhead ─────────────────────────────────────────────── --}}
<table class="head">
    <tr>
        <td style="width:22%"><img src="{{ $logo('malasakit') }}" class="malasakit" alt=""></td>
        <td class="center">
            <div class="logos">
                <img src="{{ $logo('doh') }}" alt="">
                <img src="{{ $logo('dswd') }}" alt="">
                <img src="{{ $logo('pcso') }}" alt="">
                <img src="{{ $logo('philhealth') }}" alt="">
            </div>
            <div class="title">UNIFIED INTAKE SHEET</div>
        </td>
        <td style="width:22%" class="right"><span class="annex">ANNEX B</span></td>
    </tr>
</table>

<table class="plain idrow">
    <tr>
        <td style="width:60%"><b>Philhealth Identification No.:</b> {!! filled($philhealthNo) ? '<span class="u">'.e($philhealthNo).'</span>' : '' !!}</td>
        <td class="right"><b>Hospital No.:</b> {!! filled($p?->hospital_id) ? '<u>'.e($p?->hospital_id).'</u>' : '' !!}</td>
    </tr>
</table>

{{-- ── Ruled form ─────────────────────────────────────────────── --}}
<table class="sheet">

    {{-- Date/Time, Informant, Address — one open block, no internal rules
         (matches the paper form). --}}
    <tr><td>
        <table class="plain">
            <tr>
                <td style="width:55%"><b>Date of Intake/Interview</b> <i>(Petsa ng Panayam)</i>: {!! $u(optional($printedAt)->format('m/d/Y g:i:s A')) !!}</td>
                <td><b>Time of Interview</b> <i>(Oras ng Panayam)</i>: {!! $u(optional($printedAt)->format('g:i:s A')) !!}</td>
            </tr>
            <tr>
                <td><b>Name of Informant</b> <i>(Pangalan ng impormante)</i>: {!! $u($a?->informant_name) !!}</td>
                <td><b>Relation to Patient</b> <i>(Relasyon sa Pasyente)</i>: {!! $u($a?->informant_relationship) !!}</td>
            </tr>
            <tr>
                <td class="center">
                    <span class="u uwide">{!! filled($informantAddress) ? e($informantAddress) : '&nbsp;' !!}</span>
                    <div class="sub"><b>Address</b> (Tirahan)</div>
                </td>
                <td class="center">
                    <span class="u">{!! filled($informantContact) ? e($informantContact) : '&nbsp;' !!}</span>
                    <div class="sub"><b>Contact Number</b> (Telepono Bilang)</div>
                </td>
            </tr>
        </table>
    </td></tr>

    {{-- ── I. IDENTIFYING INFORMATION ── --}}
    <tr><td>
        <div class="section">I. IDENTIFYING INFORMATION <i>(Impormasyon ng Pagkakakilanlan)</i></div>
        <table class="plain" style="margin-top: 1px; margin-bottom: 2px;">
            <tr>
                <td style="width:18%; vertical-align: middle;" class="center">
                    <b>Client's Name</b><br><span class="sub"><i>(Pangalan ng pasyente)</i></span>
                </td>
                <td style="padding-right: 14px; vertical-align: top;">
                    <div style="border-bottom: 1px solid #000; padding: 0 4px 1px 4px; font-weight: bold; text-align: left; min-height: 11px;">
                        {!! filled($fullName) ? e($fullName) : '&nbsp;' !!}
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 1px;">
                        <tr>
                            <td class="sub" style="text-align: left; width: 26%;"><b>Last Name</b><i>(Apelyido)</i></td>
                            <td class="sub center" style="width: 26%;"><b>First Name</b> <i>(Pangalan)</i></td>
                            <td class="sub center" style="width: 32%;"><b>Middle Name</b> <i>(Gitnang Pangalan)</i></td>
                            <td class="sub right" style="width: 16%;"><b>Ext.</b> <i>(Sr., Jr.)</i></td>
                        </tr>
                    </table>
                </td>
                <td style="width:15%; vertical-align: top;" class="center">
                    <div style="border-bottom: 1px solid #000; padding-bottom: 1px; font-weight: bold; text-align: center; margin: 0 auto; width: 85%; min-height: 11px;">
                        {!! filled($p?->sex) ? e(ucfirst($p->sex)) : '&nbsp;' !!}
                    </div>
                    <div class="sub" style="margin-top: 1px;"><b>Sex</b> <i>(Kasarian)</i></div>
                </td>
            </tr>
        </table>
    </td></tr>

    {{-- DOB / Age / Place of birth (value over label) --}}
    <tr><td>
        <table class="plain" style="table-layout: fixed; width: 100%;"><tr>
            <td style="width:45%" class="center"><span class="u" style="min-width: 160px;">{!! optional($p?->birthdate)->format('d/m/Y') ?: '&nbsp;' !!}</span><div class="sub"><b>Date of Birth</b> (Petsa ng Kapanganakan) (dd/mm/yyyy)</div></td>
            <td style="width:18%" class="center"><span class="u" style="min-width: 60px;">{!! $age !== null && $age !== '' ? e($age) : '&nbsp;' !!}</span><div class="sub"><b>Age</b> (Edad)</div></td>
            <td style="width:37%" class="center"><span class="u" style="min-width: 140px;">{!! filled($p?->place_of_birth) ? e($p->place_of_birth) : '&nbsp;' !!}</span><div class="sub"><b>Place of Birth</b> (Lugar ng Kapanganakan)</div></td>
        </tr></table>
    </td></tr>

    {{-- Permanent address --}}
    <tr><td>
        <table class="plain" style="table-layout: fixed; width: 100%;"><tr>
            <td style="width:24%; vertical-align: middle;"><b>Permanent Address</b> / <i>(Permanenteng Tirahan)</i>:</td>
            <td class="center" style="width:76%;"><span class="u uwide" style="width:96%;">{!! filled($permanentAddress) ? e($permanentAddress) : '&nbsp;' !!}</span><div class="sub">Street Number, Barangay, City/Municipality, District, Province, Region</div></td>
        </tr></table>
    </td></tr>

    {{-- Present address --}}
    <tr><td>
        <table class="plain" style="table-layout: fixed; width: 100%;"><tr>
            <td style="width:24%; vertical-align: middle;"><b>Present Address</b> / <i>(Kasalukuyang Tirahan)</i>:</td>
            <td class="center" style="width:76%;"><span class="u uwide" style="width:96%;">{!! filled($presentAddress) ? e($presentAddress) : '&nbsp;' !!}</span><div class="sub">Street Number, Barangay, City/Municipality, District, Province, Region</div></td>
        </tr></table>
    </td></tr>

    {{-- Civil status --}}
    <tr><td>
        <table class="plain" style="width: 100%;"><tr>
            <td style="width: 10%; white-space: nowrap; vertical-align: middle;"><b>Civil Status:</b></td>
            <td style="vertical-align: middle;">
                {!! $optL(str_contains($civil, 'single'), 'Single') !!} &nbsp;&nbsp;&nbsp;&nbsp;
                {!! $optL(str_contains($civil, 'married'), 'Married') !!} &nbsp;&nbsp;&nbsp;&nbsp;
                {!! $optL(str_contains($civil, 'widow'), 'Widow/Widower') !!} &nbsp;&nbsp;&nbsp;&nbsp;
                {!! $optL(str_contains($civil, 'separat') || str_contains($civil, 'common') || str_contains($civil, 'law'), 'Separated with common Law Partner') !!} &nbsp;&nbsp;&nbsp;&nbsp;
                {!! $optL($civil !== '' && ! preg_match('/single|married|widow|separat|common|law/', $civil), 'Others') !!}
            </td>
        </tr></table>
    </td></tr>

    {{-- Religion / Nationality --}}
    <tr><td>
        <table class="plain" style="width: 100%;"><tr>
            <td style="width: 50%; vertical-align: middle; padding: 4px 6px; white-space: nowrap;">
                <b>Religion</b> <i>(Relihiyon)</i>:
                <span class="u" style="min-width: 150px; margin-left: 4px;">{!! filled($p?->religion) ? e($p->religion) : '&nbsp;' !!}</span>
            </td>
            <td style="width: 50%; vertical-align: middle; padding: 4px 6px; white-space: nowrap;">
                <b>Nationality</b> <i>(Nasyonalidad)</i>:
                <span class="u" style="min-width: 150px; margin-left: 4px;">{!! filled($p?->nationality ?: $p?->citizenship) ? e($p->nationality ?: $p->citizenship) : '&nbsp;' !!}</span>
            </td>
        </tr></table>
    </td></tr>

    {{-- Highest educational attainment (inline boxes) --}}
    <tr><td>
        <table class="plain" style="width: 100%;"><tr>
            <td style="white-space: nowrap; vertical-align: middle; padding-right: 2px; font-size: 8px;">
                <b>Highest Educational Attainment</b> / <i>(Pinaka-mataas na Edukasyon)</i>:
            </td>
            <td style="vertical-align: middle; white-space: nowrap; font-size: 8px; padding-left: 0;">
                {!! $optL(str_contains($edu, 'post'), 'Post Grad') !!}&nbsp;
                {!! $optL(str_contains($edu, 'college'), 'College') !!}&nbsp;
                {!! $optL(str_contains($edu, 'high'), 'High School') !!}&nbsp;
                {!! $optL(str_contains($edu, 'element'), 'Elementary') !!}&nbsp;
                {!! $optL(str_contains($edu, 'none'), 'None') !!}&nbsp;
                {!! $optL($edu !== '' && ! preg_match('/post|college|high|element|none/', $edu), 'others') !!}
            </td>
        </tr></table>
    </td></tr>

    {{-- Occupation / Monthly income --}}
    <tr><td>
        <table class="plain" style="width: 100%;"><tr>
            <td style="width: 50%; vertical-align: middle; padding: 4px 6px; white-space: nowrap;">
                <b>Occupation</b> / <i>(Trabaho)</i>:
                <span class="u" style="min-width: 150px; margin-left: 4px;">{!! filled($p?->occupation) ? e($p->occupation) : '&nbsp;' !!}</span>
            </td>
            <td style="width: 50%; vertical-align: middle; padding: 4px 6px; white-space: nowrap;">
                <b>Monthly Income</b> / <i>(Kinikita Kada Buwan)</i>:
                <span class="u" style="min-width: 120px; margin-left: 4px;">{!! filled($num($p?->monthly_income)) ? e($num($p->monthly_income)) : '&nbsp;' !!}</span>
            </td>
        </tr></table>
    </td></tr>

    {{-- ── II. FAMILY COMPOSITION ── --}}
    <tr><td class="section">II. FAMILY COMPOSITION <i>(Komposisyon ng Pamilya)</i></td></tr>
    <tr><td>
        <table class="cells">
            <tr>
                <th style="width:20%">Last/1st/Middle</th>
                <th style="width:11%">Birthdate<br>YY/MM/DD</th>
                <th style="width:7%">Sex</th>
                <th style="width:10%">Civil Status</th>
                <th style="width:15%">Relation to Patient</th>
                <th style="width:15%">Highest Educational Attainment</th>
                <th style="width:13%">Occupation</th>
                <th>Monthly Income</th>
            </tr>
            @forelse($p?->familyMembers ?? [] as $m)
                <tr>
                    <td>{{ $m->name }}</td>
                    <td class="center">{{ $m->birthdate ? $m->birthdate->format('y/m/d') : '' }}</td>
                    <td>{{ $m->sex ? ucfirst($m->sex) : '' }}</td>
                    <td>{{ $m->civil_status ? ucfirst($m->civil_status) : '' }}</td>
                    <td>{{ $m->relationship }}</td>
                    <td>{{ $m->educational_attainment }}</td>
                    <td>{{ $m->occupation }}</td>
                    <td>{{ $num($m->monthly_income) }}</td>
                </tr>
            @empty
                <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            @endforelse
        </table>
    </td></tr>
    <tr><td>
        <table class="plain" style="width: 100%;"><tr>
            <td style="padding: 4px 6px; vertical-align: top;">
                <table class="plain" style="width: auto;"><tr>
                    <td style="padding: 0; vertical-align: top; white-space: nowrap;">
                        Other source/s of Family Income<br>
                        (Ibang Pinagkakakitaan ng Pamilya)
                    </td>
                    <td style="padding: 0 0 0 10px; vertical-align: top; white-space: nowrap;">
                        {{ filled($otherIncomeLabel) ? $otherIncomeLabel : 'NONE' }}<br>
                        Amount: {{ filled($otherIncomeTotal) ? $num($otherIncomeTotal) : '0' }}
                    </td>
                </tr></table>
            </td>
            <td style="padding: 4px 6px; vertical-align: top; text-align: right;">
                <table class="plain" style="width: auto; margin-left: auto;"><tr>
                    <td style="padding: 0; vertical-align: top; text-align: left; white-space: nowrap;">
                        Total Family Income<br>
                        (Kabuuang Kita ng Pamilya)
                    </td>
                    <td style="padding: 0 0 0 12px; vertical-align: top; text-align: right; white-space: nowrap;">
                        {{ filled($a?->total_family_income) ? $num($a->total_family_income) : ($num($otherIncomeTotal) ?: '0') }}
                    </td>
                </tr></table>
            </td>
        </tr></table>
    </td></tr>

    {{-- ── III. LIST OF EXPENSES ── --}}
    {{-- Open layout: like the paper form, only the checkbox squares are ruled —
         no cell grid, no row separators, no left/right divider. --}}
    <tr><td class="section">III. LIST OF EXPENSES <i>(Talaan ng mga Gastusin)</i></td></tr>
    <tr><td>
        <table class="plain" style="table-layout: fixed; width: 100%;"><tr>
            {{-- left: home/utilities checkboxes --}}
            <td style="width: 54%; padding: 3px 4px; vertical-align: top;">
                <table class="plain" style="table-layout: fixed; width: 100%; font-size: 7.5px;">
                    <tr>
                        <td style="width: 24%; padding: 2px 1px; vertical-align: middle;"><b>House/Lot:</b></td>
                        <td style="width: 20%; padding: 2px 1px; vertical-align: middle;">{!! $optL($a?->house_tenure === 'owned', 'Owned/Sarili') !!}</td>
                        <td style="width: 26%; padding: 2px 1px; vertical-align: middle;">{!! $optL($a?->house_tenure === 'rented', 'Rented/Inuupahan') !!}</td>
                        <td style="width: 30%; padding: 2px 1px 2px 6px; vertical-align: middle; white-space: nowrap;">How much/Magkano: {{ $num($slots['housing']) }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 2px 1px; vertical-align: middle;"><b>Light Source</b><br><i>(Pinagmumulan ng ilaw)</i>:</td>
                        <td style="padding: 2px 1px; vertical-align: middle;">{!! $optL($has($a?->light_source, 'electricity'), 'Electricity') !!}</td>
                        <td style="padding: 2px 1px; vertical-align: middle;">{!! $optL($has($a?->light_source, 'kerosene'), 'Kerosene') !!}</td>
                        <td style="padding: 2px 1px 2px 6px; vertical-align: middle;">{!! $optL($has($a?->light_source, 'candle'), 'Candle') !!}</td>
                    </tr>
                    <tr>
                        <td style="padding: 2px 1px; vertical-align: middle;"><b>Water Source</b><br><i>(Pinagmumulan ng Tubig)</i>:</td>
                        <td style="padding: 2px 1px; vertical-align: middle;">{!! $optL($has($a?->water_source, 'owned'), 'Owned') !!}</td>
                        <td style="padding: 2px 1px; vertical-align: middle;">{!! $optL($has($a?->water_source, 'public'), 'Public') !!}</td>
                        <td style="padding: 2px 1px 2px 6px; vertical-align: middle;">{!! $optL($has($a?->water_source, 'artesian_well'), 'Artesian Well') !!}</td>
                    </tr>
                </table>
            </td>
            {{-- right: itemised amounts matching official ANNEX B layout --}}
            <td style="width: 50%; padding: 3px 4px; vertical-align: top;">
                <table class="plain" style="width: 100%; border-collapse: collapse; font-size: 7.5px;"><tr>
                    <td style="width: 50%; padding: 0; vertical-align: top;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="text-align: right; padding: 2px 4px 2px 0; white-space: nowrap; vertical-align: middle;">Food(Pagkain):</td>
                                <td style="width: 35px; text-align: left; padding: 2px 0; vertical-align: middle;">{{ filled($num($slots['food'])) ? $num($slots['food']) : '0' }}</td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 2px 4px 2px 0; white-space: nowrap; vertical-align: middle;">Transportation(Pamasahe):</td>
                                <td style="width: 35px; text-align: left; padding: 2px 0; vertical-align: middle;">{{ filled($num($slots['transport'])) ? $num($slots['transport']) : '0' }}</td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 2px 4px 2px 0; white-space: nowrap; vertical-align: middle;">Medikal(Medikal):</td>
                                <td style="width: 35px; text-align: left; padding: 2px 0; vertical-align: middle;">{{ filled($num($slots['medical'])) ? $num($slots['medical']) : '0' }}</td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 2px 4px 2px 0; white-space: nowrap; vertical-align: middle;">Insurance Premium:</td>
                                <td style="width: 35px; text-align: left; padding: 2px 0; vertical-align: middle;">{{ filled($num($slots['insurance'])) ? $num($slots['insurance']) : '0' }}</td>
                            </tr>
                        </table>
                    </td>
                    <td style="width: 50%; padding: 0 0 0 6px; vertical-align: top;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="text-align: right; padding: 1px 4px 1px 0; white-space: nowrap; vertical-align: top;">Education<br>(Edukasyon):</td>
                                <td style="width: 35px; text-align: left; padding: 1px 0; vertical-align: top;">{{ filled($num($slots['education'])) ? $num($slots['education']) : '0' }}</td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 2px 4px 2px 0; white-space: nowrap; vertical-align: middle;">Clothing(Kasuotan):</td>
                                <td style="width: 35px; text-align: left; padding: 2px 0; vertical-align: middle;">{{ filled($num($slots['clothing'])) ? $num($slots['clothing']) : '0' }}</td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 1px 4px 1px 0; white-space: nowrap; vertical-align: top;">HouseHelp<br>(Kasambahay):</td>
                                <td style="width: 35px; text-align: left; padding: 1px 0; vertical-align: top;">{{ filled($num($slots['house_help'])) ? $num($slots['house_help']) : '0' }}</td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 2px 4px 2px 0; white-space: nowrap; vertical-align: middle;">Others(Iba pa):</td>
                                <td style="width: 35px; text-align: left; padding: 2px 0; vertical-align: middle;">{{ filled($num($slots['others'])) ? $num($slots['others']) : '0' }}</td>
                            </tr>
                        </table>
                    </td>
                </tr></table>
            </td>
        </tr></table>
    </td></tr>

    {{-- ── IV. PROBLEM PRESENTED ── --}}
    <tr><td class="section">IV. PROBLEM PRESENTED<i>(Problemang idinulog)</i>:</td></tr>
    <tr><td>
        <table class="plain"><tr>
            <td style="width:70%; padding:0">
                <table class="plain" style="table-layout: fixed; width: 100%; font-size: 7.5px;">
                    <tr>
                        <td style="width: 44%; padding: 3px 2px; white-space: nowrap;">{!! $optL($has($a?->problem_categories, 'health'), 'Health Condition of Patient (Specify)') !!}</td>
                        <td style="width: 32%; padding: 3px 2px; white-space: nowrap;">{!! $optL($has($a?->problem_categories, 'economic'), 'Economic Resources(specify)') !!}</td>
                        <td style="width: 24%; padding: 3px 2px; white-space: nowrap;">{!! $optL($has($a?->problem_categories, 'housing'), 'Housing (Specify)') !!}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 2px; white-space: nowrap;">{!! $optL($has($a?->problem_categories, 'food_nutrition'), 'Food/Nutrition (Specify)') !!}</td>
                        <td style="padding: 3px 2px; white-space: nowrap;">{!! $optL($has($a?->problem_categories, 'employment'), 'Employment (Specify)') !!}</td>
                        <td style="padding: 3px 2px; white-space: nowrap;">{!! $optL($has($a?->problem_categories, 'other'), 'Other (Specify)') !!}</td>
                    </tr>
                    @php $specify = $a?->problem_specify ?: $a?->presenting_problem; @endphp
                    <tr>
                        <td style="padding: 2px;">&nbsp;</td>
                        <td style="padding: 2px;">&nbsp;</td>
                        <td style="padding: 2px 2px 2px 14px;"><span class="u" style="width: 85%; min-width: 80px; text-align: left;">{!! filled($specify) ? e($specify) : '&nbsp;' !!}</span></td>
                    </tr>
                    <tr><td colspan="3" class="center"><u>{{ $assistances->map(fn ($x) => strtoupper((string) $x->assistantType?->name))->filter()->unique()->implode(', ') }}</u></td></tr>
                </table>
                <div class="cert">*AKO AY NAGPAPATUNAY ANG IMPORMASYONG NAKASULAT SA IBABAW AY TOTOO AT TAMA</div>
                <div class="clientname">{!! filled($fullName) ? e($fullName) : '&nbsp;' !!}</div>
                <div class="sigcap"><b>Name and Signature of the Client</b>(Pangalan at Lagda ng Kliyente)</div>
            </td>
            <td class="vdiv thumb" style="width:30%">
                <div class="thumbbox">&nbsp;</div>
                Thumb Mark
            </td>
        </tr></table>
    </td></tr>

    {{-- ── V. SOCIAL WORKER'S ASSESSMENT ── --}}
    {{-- The official form labels both this section and the next "V." — reproduced
         verbatim to match ANNEX B rather than renumbered. --}}
    <tr><td class="section">V. SOCIAL WORKER'S ASSESSMENT<i>(Problemang Idinulog)</i></td></tr>
    <tr><td>
        <div class="prose">{!! filled($a?->assessment_notes) ? nl2br(e($a->assessment_notes)) : (filled($a?->presenting_problem) ? nl2br(e($a->presenting_problem)) : '&nbsp;') !!}</div>
    </td></tr>

    {{-- ── V. RECOMMENDATION ── --}}
    <tr><td class="section">V. RECOMMENDATION <i>(Rekomendasyon)</i></td></tr>
    <tr><td>
        <table class="cells">
            <tr>
                <th style="width:30%">TYPE OF ASSISTANCE</th>
                <th style="width:20%">AMOUNT OF ASSISTANCE</th>
                <th style="width:25%">MODE OF ASSISTANCE</th>
                <th>FUND SOURCE</th>
            </tr>
            @forelse($assistances as $aid)
                <tr>
                    <td>{{ $aid->assistantType?->name }}</td>
                    <td class="center">{{ $num($aid->amount) }}</td>
                    <td>{{ $modeLabel }}</td>
                    <td>{{ $fundLabel }}</td>
                </tr>
            @empty
                <tr>
                    <td>{{ $a?->recommended_assistance }}</td>
                    <td class="center">{{ $num($a?->recommended_amount) }}</td>
                    <td>{{ $modeLabel }}</td>
                    <td>{{ $fundLabel }}</td>
                </tr>
            @endforelse
        </table>
    </td></tr>

    {{-- Signatures --}}
    <tr><td>
        <table class="cells"><tr>
            <td style="width:15%">Interviewed by:</td>
            <td style="width:35%"><div class="signame">{!! filled($printedBy?->employee_name) ? e($printedBy->employee_name) : '&nbsp;' !!}</div><div class="sigcap">Signature over Name of Medical Social Worker</div></td>
            <td style="width:15%">Reviewed and<br>Approved by:</td>
            <td><div class="signame">&nbsp;</div><div class="sigcap">Signature over Name</div></td>
        </tr></table>
    </td></tr>

</table>

</body>
</html>

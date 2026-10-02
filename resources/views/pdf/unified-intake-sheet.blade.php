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
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 8.5px; color: #000; margin: 0; }
        b, .b { font-weight: bold; }
        i { font-style: italic; }
        .center { text-align: center; }
        .right { text-align: right; }
        .sub { font-size: 6.5px; font-style: italic; color: #333; }

        /* Letterhead (outside the ruled form) */
        .head td { vertical-align: middle; padding: 0; }
        .head .logos img { height: 40px; margin: 0 5px; vertical-align: middle; }
        .head .malasakit { height: 52px; }
        .annex { font-size: 12px; font-weight: bold; text-decoration: underline; }
        .title { text-align: center; font-size: 14px; font-weight: bold; margin: 2px 0 6px; }
        .idrow { margin-bottom: 3px; }
        .idrow td { font-weight: bold; }

        /* The ruled form */
        table.sheet { border-collapse: collapse; width: 100%; border: 1px solid #000; }
        table.sheet > tbody > tr > td { border: 1px solid #000; padding: 0; vertical-align: top; }

        table.plain { width: 100%; border-collapse: collapse; }
        table.plain > tbody > tr > td { padding: 2px 5px; vertical-align: top; }
        .vdiv { border-left: 1px solid #000; }

        .section { font-weight: bold; padding: 2px 5px; }

        table.cells { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.cells > tbody > tr > td, table.cells > tbody > tr > th { border: 1px solid #000; padding: 2px 4px;
            vertical-align: top; word-wrap: break-word; }
        table.cells th { text-align: center; font-weight: bold; }

        .cb { display: inline-block; width: 10px; height: 10px; line-height: 10px; text-align: center;
              border: 1px solid #000; font-size: 8px; font-weight: bold; vertical-align: middle; }
        .opt { white-space: nowrap; }
        .u { border-bottom: 1px solid #000; display: inline-block; min-width: 40px; padding: 0 3px;
             text-align: center; font-weight: bold; }
        .uwide { min-width: 220px; }

        .prose { padding: 4px 5px; min-height: 34px; }
        .cert { text-align: center; font-weight: bold; font-style: italic; margin: 6px 0 2px; }
        .clientname { text-align: center; font-weight: bold; font-size: 11px; text-decoration: underline; margin-top: 4px; }
        .thumb { text-align: center; padding: 6px; }
        .thumbbox { border: 1px solid #000; height: 92px; }

        .signame { text-align: center; font-weight: bold; text-decoration: underline; padding-top: 14px; }
        .sigcap { text-align: center; font-size: 7px; }
    </style>
</head>
<body>

{{-- ── Letterhead ─────────────────────────────────────────────── --}}
<table class="head">
    <tr>
        <td style="width:22%"><img src="{{ $logo('malasakit') }}" class="malasakit" alt=""></td>
        <td class="center logos">
            <img src="{{ $logo('doh') }}" alt="">
            <img src="{{ $logo('dswd') }}" alt="">
            <img src="{{ $logo('pcso') }}" alt="">
            <img src="{{ $logo('philhealth') }}" alt="">
        </td>
        <td style="width:22%" class="right"><span class="annex">ANNEX B</span></td>
    </tr>
</table>
<div class="title">UNIFIED INTAKE SHEET</div>

<table class="plain idrow">
    <tr>
        <td style="width:60%">Philhealth Identification No.: {!! $u($philhealthNo) !!}</td>
        <td class="right">Hospital No.: {!! $u($p?->hospital_id) !!}</td>
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
    <tr><td class="section">I. IDENTIFYING INFORMATION <i>(Impormasyon ng Pagkakakilanlan)</i></td></tr>

    {{-- Client's name / Sex --}}
    <tr><td>
        <table class="plain"><tr>
            <td style="width:22%"><b>Client's Name</b><br><i>(Pangalan ng pasyente)</i></td>
            <td class="center">
                <span class="u" style="min-width:340px">{!! filled($fullName) ? e($fullName) : '&nbsp;' !!}</span>
                <table class="plain"><tr>
                    <td class="sub center">Last Name (Apelyido)</td>
                    <td class="sub center">First Name (Pangalan)</td>
                    <td class="sub center">Middle Name (Gitnang Pangalan)</td>
                    <td class="sub center">Ext. (Sr., Jr.)</td>
                </tr></table>
            </td>
            <td style="width:18%" class="center"><span class="u">{!! filled($p?->sex) ? e(ucfirst($p->sex)) : '&nbsp;' !!}</span><div class="sub"><b>Sex</b> (Kasarian)</div></td>
        </tr></table>
    </td></tr>

    {{-- DOB / Age / Place of birth (value over label) --}}
    <tr><td>
        <table class="plain"><tr>
            <td style="width:45%" class="center"><span class="u">{!! optional($p?->birthdate)->format('d/m/Y') ?: '&nbsp;' !!}</span><div class="sub"><b>Date of Birth</b> (Petsa ng Kapanganakan) (dd/mm/yyyy)</div></td>
            <td style="width:20%" class="center"><span class="u">{!! $age !== null && $age !== '' ? e($age) : '&nbsp;' !!}</span><div class="sub"><b>Age</b> (Edad)</div></td>
            <td class="center"><span class="u">{!! filled($p?->place_of_birth) ? e($p->place_of_birth) : '&nbsp;' !!}</span><div class="sub"><b>Place of Birth</b> (Lugar ng Kapanganakan)</div></td>
        </tr></table>
    </td></tr>

    {{-- Permanent address --}}
    <tr><td>
        <table class="plain"><tr>
            <td style="width:22%"><b>Permanent Address</b>/<i>(Permanenteng Tirahan)</i>:</td>
            <td class="center"><span class="u uwide">{!! filled($permanentAddress) ? e($permanentAddress) : '&nbsp;' !!}</span><div class="sub">Street Number, Barangay, City/Municipality, District, Province, Region</div></td>
        </tr></table>
    </td></tr>

    {{-- Present address --}}
    <tr><td>
        <table class="plain"><tr>
            <td style="width:22%"><b>Present Address</b>/<i>(Kasalukuyang Tirahan)</i>:</td>
            <td class="center"><span class="u uwide">{!! filled($presentAddress) ? e($presentAddress) : '&nbsp;' !!}</span><div class="sub">Street Number, Barangay, City/Municipality, District, Province, Region</div></td>
        </tr></table>
    </td></tr>

    {{-- Civil status (boxed cells) --}}
    <tr><td>
        <table class="cells"><tr>
            <td style="width:11%"><b>Civil Status:</b></td>
            <td style="width:12%">{!! $optL(str_contains($civil, 'single'), 'Single') !!}</td>
            <td style="width:13%">{!! $optL(str_contains($civil, 'married'), 'Married') !!}</td>
            <td style="width:18%">{!! $optL(str_contains($civil, 'widow'), 'Widow/Widower') !!}</td>
            <td style="width:32%">{!! $optL(str_contains($civil, 'separat') || str_contains($civil, 'common') || str_contains($civil, 'law'), 'Separated with common Law Partner') !!}</td>
            <td>{!! $optL($civil !== '' && ! preg_match('/single|married|widow|separat|common|law/', $civil), 'Others') !!}</td>
        </tr></table>
    </td></tr>

    {{-- Religion / Nationality --}}
    <tr><td>
        <table class="plain"><tr>
            <td style="width:50%"><b>Religion</b><i>(Relihiyon)</i>: {!! $u($p?->religion) !!}</td>
            <td><b>Nationality</b><i>(Nasyonalidad)</i>: {!! $u($p?->nationality ?: $p?->citizenship) !!}</td>
        </tr></table>
    </td></tr>

    {{-- Highest educational attainment (inline boxes) --}}
    <tr><td>
        <table class="plain"><tr><td>
            <b>Highest Educational Attainment</b>/<i>(Pinaka-mataas na Edukasyon)</i>: &nbsp;
            {!! $optL(str_contains($edu, 'post'), 'Post Grad') !!} &nbsp;
            {!! $optL(str_contains($edu, 'college'), 'College') !!} &nbsp;
            {!! $optL(str_contains($edu, 'high'), 'High School') !!} &nbsp;
            {!! $optL(str_contains($edu, 'element'), 'Elementary') !!} &nbsp;
            {!! $optL(str_contains($edu, 'none'), 'None') !!} &nbsp;
            {!! $optL($edu !== '' && ! preg_match('/post|college|high|element|none/', $edu), 'others') !!}
        </td></tr></table>
    </td></tr>

    {{-- Occupation / Monthly income --}}
    <tr><td>
        <table class="plain"><tr>
            <td style="width:50%"><b>Occupation</b>/<i>(Trabaho)</i>: {!! $u($p?->occupation) !!}</td>
            <td><b>Monthly Income</b>/<i>(Kinikita Kada Buwan)</i>: {!! $u($num($p?->monthly_income)) !!}</td>
        </tr></table>
    </td></tr>

    {{-- ── II. FAMILY COMPOSITION ── --}}
    <tr><td class="section">II. FAMILY COMPOSITION<i>(Komposisyon ng Pamilya)</i></td></tr>
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
        <table class="plain"><tr>
            <td style="width:55%"><b>Other source/s of Family Income</b><br><i>(Ibang Pinagkakakitaan ng Pamilya)</i>: {!! $u($otherIncomeLabel) !!} &nbsp; Amount: {!! $u($num($otherIncomeTotal)) !!}</td>
            <td class="right"><b>Total Family Income</b><br><i>(Kabuuang Kita ng Pamilya)</i> &nbsp; {!! $u($num($a?->total_family_income)) !!}</td>
        </tr></table>
    </td></tr>

    {{-- ── III. LIST OF EXPENSES ── --}}
    {{-- Open layout: like the paper form, only the checkbox squares are ruled —
         no cell grid, no row separators, no left/right divider. --}}
    <tr><td class="section">III. LIST OF EXPENSES <i>(Talaan ng mga Gastusin)</i></td></tr>
    <tr><td>
        <table class="plain"><tr>
            {{-- left: home/utilities checkboxes --}}
            <td style="width:52%; padding:0">
                <table class="plain">
                    <tr>
                        <td style="width:24%"><b>House/Lot:</b></td>
                        <td style="width:26%">{!! $optR($a?->house_tenure === 'owned', 'Owned/Sarili') !!}</td>
                        <td style="width:28%">{!! $optR($a?->house_tenure === 'rented', 'Rented/Inuupahan') !!}</td>
                        <td>How much/Magkano: {{ $num($slots['housing']) }}</td>
                    </tr>
                    <tr>
                        <td><b>Light Source</b><br><i>(Pinagmumulan ng ilaw)</i>:</td>
                        <td>{!! $optL($has($a?->light_source, 'electricity'), 'Electricity') !!}</td>
                        <td>{!! $optL($has($a?->light_source, 'kerosene'), 'Kerosene') !!}</td>
                        <td>{!! $optL($has($a?->light_source, 'candle'), 'candle') !!}</td>
                    </tr>
                    <tr>
                        <td><b>Water Source</b><br><i>(Pinagmumulan ng Tubig)</i>:</td>
                        <td>{!! $optL($has($a?->water_source, 'owned'), 'Owned') !!}</td>
                        <td>{!! $optL($has($a?->water_source, 'public'), 'Public') !!}</td>
                        <td>{!! $optL($has($a?->water_source, 'artesian_well'), 'Artesian Well') !!}</td>
                    </tr>
                </table>
            </td>
            {{-- right: itemised amounts --}}
            <td style="padding:0">
                <table class="plain">
                    <tr><td>Food(Pagkain): {!! $u($num($slots['food'])) !!}</td><td>Education (Edukasyon): {!! $u($num($slots['education'])) !!}</td></tr>
                    <tr><td>Transportation(Pamasahe): {!! $u($num($slots['transport'])) !!}</td><td>Clothing(Kasuotan): {!! $u($num($slots['clothing'])) !!}</td></tr>
                    <tr><td>Medikal(Medikal): {!! $u($num($slots['medical'])) !!}</td><td>HouseHelp (Kasambahay): {!! $u($num($slots['house_help'])) !!}</td></tr>
                    <tr><td>Insurance Premium: {!! $u($num($slots['insurance'])) !!}</td><td>Others(Iba pa): {!! $u($num($slots['others'])) !!}</td></tr>
                </table>
            </td>
        </tr></table>
    </td></tr>

    {{-- ── IV. PROBLEM PRESENTED ── --}}
    <tr><td class="section">IV. PROBLEM PRESENTED<i>(Problemang idinulog)</i>:</td></tr>
    <tr><td>
        <table class="plain"><tr>
            <td style="width:70%; padding:0">
                <table class="plain">
                    <tr>
                        <td>{!! $optL($has($a?->problem_categories, 'health'), 'Health Condition of Patient (Specify)') !!}</td>
                        <td>{!! $optL($has($a?->problem_categories, 'economic'), 'Economic Resources(specify)') !!}</td>
                        <td>{!! $optL($has($a?->problem_categories, 'housing'), 'Housing (Specify)') !!}</td>
                    </tr>
                    <tr>
                        <td>{!! $optL($has($a?->problem_categories, 'food_nutrition'), 'Food/Nutrition (Specify)') !!}</td>
                        <td>{!! $optL($has($a?->problem_categories, 'employment'), 'Employment (Specify)') !!}</td>
                        <td>{!! $optL($has($a?->problem_categories, 'other'), 'Other (Specify)') !!}</td>
                    </tr>
                    @php $specify = $a?->problem_specify ?: $a?->presenting_problem; @endphp
                    <tr><td colspan="3" class="center">{!! filled($specify) ? nl2br(e($specify)) : '&nbsp;' !!}</td></tr>
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

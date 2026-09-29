@php
    use Illuminate\Support\Carbon;

    $p = $sheet->patient;
    $case = $sheet->case;
    $a = $sheet->assessment;
    $isFinal = $sheet->status === \App\Models\UnifiedIntakeSheet::STATUS_FINALIZED;

    $fullName = collect([$p?->last_name, $p?->first_name, $p?->middle_name, $p?->extension_name])
        ->filter()->join(', ');

    // Age as of the interview date (not today) — an intake sheet records the age
    // the client was when interviewed, so a reprint years later stays accurate.
    $age = $p?->birthdate
        ? (int) Carbon::parse($p->birthdate)->diffInYears($sheet->date_of_intake ?? now())
        : $p?->estimated_age;

    $composedAddress = collect([$p?->address, $p?->barangay, $p?->municipality, $p?->province])
        ->filter()->join(', ');
    $permanentAddress = filled($p?->permanent_address) ? $p->permanent_address : $composedAddress;
    $presentAddress = filled($p?->present_address) ? $p->present_address : $composedAddress;

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
    $edu = strtolower((string) $p?->educational_attainment);

    // Section III amounts come from the generic assessment_expenses key/value rows,
    // matched to the form's fixed slots by keyword. Categorical fields (ownership,
    // light, water source) are not stored and print as blank boxes.
    $expenses = $a?->expenses ?? collect();
    $expenseAmount = function (array $keywords) use ($expenses) {
        foreach ($expenses as $e) {
            $type = strtolower((string) $e->expense_type);
            foreach ($keywords as $k) {
                if (str_contains($type, $k)) {
                    return $e->amount;
                }
            }
        }

        return null;
    };

    $assistances = $case?->patientAssistances ?? collect();

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

        .watermark { position: fixed; top: 42%; left: 16%; font-size: 100px; color: #000;
                     opacity: 0.06; transform: rotate(-35deg); font-weight: bold; }
    </style>
</head>
<body>

@unless($isFinal)
    <div class="watermark">{{ strtoupper($sheet->status) }}</div>
@endunless

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
                <td style="width:55%"><b>Date of Intake/Interview</b> <i>(Petsa ng Panayam)</i>: {!! $u(optional($sheet->date_of_intake)->format('m/d/Y g:i:s A')) !!}</td>
                <td><b>Time of Interview</b> <i>(Oras ng Panayam)</i>: {!! $u(optional($sheet->date_of_intake)->format('g:i:s A')) !!}</td>
            </tr>
            <tr>
                <td><b>Name of Informant</b> <i>(Pangalan ng impormante)</i>: {!! $u(null) !!}</td>
                <td><b>Relation to Patient</b> <i>(Relasyon sa Pasyente)</i>: {!! $u(null) !!}</td>
            </tr>
            <tr>
                <td class="center">
                    <span class="u uwide">{!! filled($presentAddress) ? e($presentAddress) : '&nbsp;' !!}</span>
                    <div class="sub"><b>Address</b> (Tirahan)</div>
                </td>
                <td class="center">
                    <span class="u">{!! filled($p?->contact_number) ? e($p->contact_number) : '&nbsp;' !!}</span>
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
                    <td></td>
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
            <td style="width:55%"><b>Other source/s of Family Income</b><br><i>(Ibang Pinagkakakitaan ng Pamilya)</i> &nbsp; Amount: {!! $u(null) !!}</td>
            <td class="right"><b>Total Family Income</b><br><i>(Kabuuang Kita ng Pamilya)</i> &nbsp; {!! $u($num($a?->total_family_income)) !!}</td>
        </tr></table>
    </td></tr>

    {{-- ── III. LIST OF EXPENSES ── --}}
    {{-- Open layout: like the paper form, only the checkbox squares are ruled —
         no cell grid, no row separators, no left/right divider. --}}
    <tr><td class="section">III. LIST OF EXPENSES <i>(Talaan ng mga Gastusin)</i></td></tr>
    <tr><td>
        <table class="plain"><tr>
            {{-- left: home/utilities (categorical, blank) --}}
            <td style="width:52%; padding:0">
                <table class="plain">
                    <tr>
                        <td style="width:24%"><b>House/Lot:</b></td>
                        <td style="width:26%">{!! $optR(false, 'Owned/Sarili') !!}</td>
                        <td style="width:28%">{!! $optR(false, 'Rented/Inuupahan') !!}</td>
                        <td>How much/Magkano: {{ $num($expenseAmount(['rent', 'house', 'lot', 'inuupahan'])) }}</td>
                    </tr>
                    <tr>
                        <td><b>Light Source</b><br><i>(Pinagmumulan ng ilaw)</i>:</td>
                        <td>{!! $optL(false, 'Electricity') !!}</td>
                        <td>{!! $optL(false, 'Kerosene') !!}</td>
                        <td>{!! $optL(false, 'candle') !!}</td>
                    </tr>
                    <tr>
                        <td><b>Water Source</b><br><i>(Pinagmumulan ng Tubig)</i>:</td>
                        <td>{!! $optL(false, 'Owned') !!}</td>
                        <td>{!! $optL(false, 'Public') !!}</td>
                        <td>{!! $optL(false, 'Artesian Well') !!}</td>
                    </tr>
                </table>
            </td>
            {{-- right: itemised amounts --}}
            <td style="padding:0">
                <table class="plain">
                    <tr><td>Food(Pagkain): {!! $u($num($expenseAmount(['food', 'pagkain']))) !!}</td><td>Education (Edukasyon): {!! $u($num($expenseAmount(['educ', 'edukasyon', 'school', 'tuition']))) !!}</td></tr>
                    <tr><td>Transportation(Pamasahe): {!! $u($num($expenseAmount(['transport', 'pamasahe', 'fare']))) !!}</td><td>Clothing(Kasuotan): {!! $u($num($expenseAmount(['cloth', 'kasuot']))) !!}</td></tr>
                    <tr><td>Medikal(Medikal): {!! $u($num($expenseAmount(['medic', 'medik', 'medicine']))) !!}</td><td>HouseHelp (Kasambahay): {!! $u($num($expenseAmount(['househelp', 'kasambahay', 'helper']))) !!}</td></tr>
                    <tr><td>Insurance Premium: {!! $u($num($expenseAmount(['insurance', 'premium']))) !!}</td><td>Others(Iba pa): {!! $u($num($expenseAmount(['other', 'iba']))) !!}</td></tr>
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
                        <td>{!! $optL(false, 'Health Condition of Patient (Specify)') !!}</td>
                        <td>{!! $optL(false, 'Economic Resources(specify)') !!}</td>
                        <td>{!! $optL(false, 'Housing (Specify)') !!}</td>
                    </tr>
                    <tr>
                        <td>{!! $optL(false, 'Food/Nutrition (Specify)') !!}</td>
                        <td>{!! $optL(false, 'Employment (Specify)') !!}</td>
                        <td>{!! $optL(false, 'Other (Specify)') !!}</td>
                    </tr>
                    <tr><td colspan="3" class="center">{!! filled($a?->presenting_problem) ? nl2br(e($a->presenting_problem)) : '&nbsp;' !!}</td></tr>
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
                    <td></td>
                    <td></td>
                </tr>
            @empty
                <tr>
                    <td>{{ $a?->recommended_assistance }}</td>
                    <td class="center">{{ $num($a?->recommended_amount) }}</td>
                    <td></td>
                    <td></td>
                </tr>
            @endforelse
        </table>
    </td></tr>

    {{-- Signatures --}}
    <tr><td>
        <table class="cells"><tr>
            <td style="width:15%">Interviewed by:</td>
            <td style="width:35%"><div class="signame">{!! filled($sheet->intakeWorker?->employee_name) ? e($sheet->intakeWorker->employee_name) : '&nbsp;' !!}</div><div class="sigcap">Signature over Name of Medical Social Worker</div></td>
            <td style="width:15%">Reviewed and<br>Approved by:</td>
            <td><div class="signame">{!! $isFinal && filled($sheet->finalizer?->employee_name) ? e($sheet->finalizer->employee_name) : '&nbsp;' !!}</div><div class="sigcap">Signature over Name</div></td>
        </tr></table>
    </td></tr>

</table>

</body>
</html>

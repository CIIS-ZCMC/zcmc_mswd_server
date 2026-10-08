@php
    // City Mayor "Acknowledgement Slip (Medical Assistance)", ZCMC-F-MSS-04 Rev. 4.
    // Inputs are the pre-formatted values from CityMayorSlipPdfService::slip(); a
    // blank value keeps the ruled line for handwriting.
    $logo = fn (string $path) => public_path($path);

    // An underlined fill-in cell with its italic caption under the line.
    $field = fn ($value, ?string $caption = null, string $class = '') =>
        '<div class="fill '.$class.'">'.(filled($value) ? e($value) : '&nbsp;').'</div>'
        .($caption ? '<div class="cap">('.$caption.')</div>' : '');

    // Long values step down in size so the form stays on one page.
    $fit = fn ($value, int $small, int $tiny) => match (true) {
        mb_strlen((string) $value) > $tiny => 'tiny',
        mb_strlen((string) $value) > $small => 'small',
        default => '',
    };

    $box = fn (bool $checked) => '<span class="cb">'.($checked ? '&#10003;' : '&nbsp;').'</span>';
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    {{-- Self-contained styles like the MAIFIP slip: a one-page government form on
         US Letter, matching the paper ZCMC-F-MSS-04. DejaVu Sans for the check mark. --}}
    <style>
        @page { margin: 26px 42px 30px 42px; }
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 9.8px; color: #000; margin: 0; line-height: 1.28; }
        b, .b { font-weight: bold; }

        .head { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .head td { vertical-align: middle; text-align: center; padding: 0; }
        .head img { height: 72px; }
        .head .agency { font-size: 9px; line-height: 1.3; padding: 0 8px; }
        .title { text-align: center; font-size: 15px; font-weight: bold; margin-top: 3px; letter-spacing: 0.5px; }
        .subtitle { text-align: center; font-size: 8.5px; font-weight: bold; margin-top: 0; }

        table.line { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.line td { padding: 0 2.5px; vertical-align: top; font-size: 9.8px; font-weight: normal; }
        .label { font-weight: normal; white-space: nowrap; padding-top: 1.5px !important; }
        .fill { border-bottom: 1px solid #000; text-align: center; font-weight: bold; min-height: 13px; padding-bottom: 1px; font-size: 9.8px; }
        .fill.small { font-size: 8px; padding-top: 1.5px; }
        .fill.tiny { font-size: 6.5px; padding-top: 1.5px; }
        .cap { text-align: center; font-size: 7px; font-style: italic; font-weight: normal; padding-top: 1px; }
        .comma { width: 5px; padding-top: 1.5px !important; font-weight: normal; }

        .cb { display: inline-block; width: 9.5px; height: 9.5px; line-height: 9.5px; border: 1px solid #000;
              text-align: center; font-size: 8.5px; margin-right: 7px; vertical-align: middle; }
        .funds { border-collapse: collapse; margin: 2px 0 4px 60px; }
        .funds td { padding: 1px 0; vertical-align: middle; font-weight: normal; font-size: 9.2px; }
        .specify { display: inline-block; width: 110px; border-bottom: 1px solid #000; margin-left: 24px;
                   text-align: center; font-size: 8.5px; font-weight: bold; }
        .types { border-collapse: collapse; margin: 2px 0 0 50px; }
        .types td { vertical-align: top; padding: 0 20px 0 0; }
        .types div { padding: 1px 0; font-weight: normal; font-size: 9.2px; }
        .picked { text-decoration: underline; font-weight: bold; }

        .sig { width: 100%; border-collapse: collapse; font-size: 9.8px; }
        .sig td { vertical-align: bottom; padding: 0; }
        .signame { border-bottom: 1px solid #000; text-align: center; font-weight: bold; padding-bottom: 1px; min-height: 13px; font-size: 9.8px; }
        .sigcap { text-align: center; font-weight: normal; padding-top: 1.5px; font-size: 8px; }
        .mswline { text-align: center; line-height: 1.3; font-size: 9.2px; font-weight: normal; }

        .meta { border-collapse: collapse; margin-top: 12px; font-size: 9.2px; }
        .meta td { padding: 1px 5px 1px 0; font-weight: normal; vertical-align: bottom; }
        .meta .fill { font-weight: bold; font-size: 9.2px; }

        .footer { position: fixed; bottom: -20px; left: 0; right: 0; font-size: 7px; }
        .footer table { width: 100%; border-collapse: collapse; }
    </style>
</head>
<body>
    <table class="head">
        <tr>
            <td style="width: 18%; text-align: right;"><img src="{{ $logo('images/printables/zcmc.png') }}" alt="ZCMC"></td>
            <td class="agency">
                Republic of the Philippines<br>
                Department of Health<br>
                <b>ZAMBOANGA CITY MEDICAL CENTER</b><br>
                Dr. D. Evangelista St., Sta. Catalina, Zamboanga City, 7000
                <div class="title">ACKNOWLEDGEMENT SLIP</div>
                <div class="subtitle">(Medical Assistance)</div>
            </td>
            <td style="width: 18%; text-align: left;"><img src="{{ $logo('images/intake/doh.png') }}" alt="DOH"></td>
        </tr>
    </table>

    {{-- Ako si ____, __ (Edad), ____ (Kasarian), ____ (Katayuang Sibil), --}}
    <table class="line">
        <tr>
            <td class="label" style="width: 58px;">Ako si</td>
            <td style="width: 220px;">{!! $field($name, 'Pangalan', $fit($name, 32, 46)) !!}</td>
            <td class="comma">,</td>
            <td style="width: 46px;">{!! $field($age, 'Edad') !!}</td>
            <td class="comma">,</td>
            <td style="width: 70px;">{!! $field($sex, 'Kasarian') !!}</td>
            <td class="comma">,</td>
            <td>{!! $field($civilStatus, 'Katayuang Sibil') !!}</td>
            <td class="comma">,</td>
        </tr>
    </table>

    {{-- taga ____ (Tirahan) at ako ay ____ (Nakapagtapos ng pag-aaral), --}}
    <table class="line">
        <tr>
            <td class="label" style="width: 58px;">taga</td>
            <td style="width: 220px;">{!! $field($address, 'Tirahan', $fit($address, 36, 60)) !!}</td>
            <td class="label" style="width: 70px; text-align: center;">at ako ay</td>
            <td>{!! $field($education, 'Nakapagtapos ng pag-aaral', $fit($education, 34, 50)) !!}</td>
            <td class="comma">,</td>
        </tr>
    </table>

    {{-- ____ (Kaarawan), ____ (Relihiyon) at isang ____ (Trabaho) --}}
    <table class="line">
        <tr>
            <td style="width: 150px;">{!! $field($birthdate, 'Kaarawan') !!}</td>
            <td class="comma">,</td>
            <td style="width: 126px;">{!! $field($religion, 'Relihiyon', $fit($religion, 20, 32)) !!}</td>
            <td class="label" style="width: 70px; text-align: center;">at isang</td>
            <td>{!! $field($occupation, 'Trabaho', $fit($occupation, 34, 50)) !!}</td>
        </tr>
    </table>

    {{-- na tumatanggap nag buwanang sahod na ____ (Sahod). At kami ay __ (Bilang ng myembro) myembro sa --}}
    <table class="line">
        <tr>
            <td class="label" style="width: 196px;">na tumatanggap nag buwanang sahod na</td>
            <td style="width: 92px;">{!! $field($income, 'Sahod') !!}</td>
            <td class="label" style="width: 70px; text-align: center;">. At kami ay</td>
            <td style="width: 90px;">{!! $field($members, 'Bilang ng myembro') !!}</td>
            <td class="label">myembro sa</td>
        </tr>
    </table>

    {{-- pamilya. Ako ay ginagamot sa ZCMC sa Sakit ____ (diyagnosis) --}}
    <table class="line">
        <tr>
            <td class="label" style="width: 300px; padding-left: 40px !important;">pamilya. Ako ay ginagamot sa Zamboanga City Medical Center sa Sakit</td>
            <td>{!! $field($diagnosis, 'diyagnosis', $fit($diagnosis, 36, 70)) !!}</td>
        </tr>
    </table>

    <div>at tumatanggap ng kaukulang tulong na nagmula sa</div>

    {{-- The four agencies, then Others with its specify line. --}}
    <table class="funds">
        @foreach (array_slice($funds, 0, 4, true) as $key => $label)
            <tr>
                <td>{!! $box($fund === $key) !!}{{ $label }}</td>
            </tr>
        @endforeach
        <tr>
            <td>{!! $box($fund === 'others') !!}{{ $funds['others'] }}<span class="specify">{{ $fundOther ?: ' ' }}</span></td>
        </tr>
    </table>

    <table class="line" style="width: 46%; margin-bottom: 6px;">
        <tr>
            <td class="label" style="width: 92px;">sa halagang Php</td>
            <td>{!! $field($amount) !!}</td>
            <td class="comma">.</td>
        </tr>
    </table>

    <div>Para sa:</div>
    @php
        // The Library list can grow: past 10 types, two columns keep one page.
        $typeRows = collect($types)->map(fn ($label, $id) => ['id' => $id, 'label' => $label])->values();
        $typeColumns = $typeRows->count() > 10 ? $typeRows->chunk((int) ceil($typeRows->count() / 2)) : collect([$typeRows]);
    @endphp
    <table class="types">
        <tr>
            @foreach ($typeColumns as $column)
                <td>
                    @foreach ($column as $type)
                        @php $picked = in_array($type['id'], $typeIds, true); @endphp
                        <div>{!! $box($picked) !!}<span class="{{ $picked ? 'picked' : '' }}">{{ $type['label'] }}</span></div>
                    @endforeach
                </td>
            @endforeach
        </tr>
        <tr>
            <td colspan="{{ $typeColumns->count() }}">
                <div>{!! $box(false) !!}Others please specify<span class="specify" style="width: 150px;">&nbsp;</span></div>
            </td>
        </tr>
    </table>

    {{-- Patient (signer) and date, right column. --}}
    <table class="sig" style="margin-top: 6px;">
        <tr>
            <td style="width: 58%;"></td>
            <td>
                <div class="signame">{{ $name ?: ' ' }}</div>
                <div class="sigcap">Pasyente/ Kinatawan ng Pasyente</div>
            </td>
        </tr>
        <tr>
            <td></td>
            <td style="padding-top: 10px;">
                <div class="signame">{{ $date }}</div>
                <div class="sigcap">Petsa</div>
            </td>
        </tr>
    </table>

    {{-- Medical Social Worker: the printing user's name, license and position. --}}
    <table class="sig" style="margin-top: 4px;">
        <tr>
            <td style="width: 30%;">
                <div class="mswline">
                    <b>{{ $socialWorker ? mb_strtoupper($socialWorker) : ' ' }}</b><br>
                    @if (filled($socialWorkerLicense))License No. {{ $socialWorkerLicense }}<br>@endif
                    @if (filled($socialWorkerPosition)){{ $socialWorkerPosition }}@endif
                </div>
                <div class="signame" style="min-height: 0;"></div>
                <div class="sigcap">Medical Social Worker</div>
            </td>
            <td></td>
        </tr>
    </table>

    <table class="meta">
        <tr>
            <td>Patient Hospital Record Number:</td>
            <td style="width: 90px; padding-left: 40px;">{!! $field($hospitalNumber) !!}</td>
        </tr>
        <tr>
            <td>MSWD #:</td>
            <td style="width: 160px;" colspan="2">{!! $field($mswdNumber) !!}</td>
        </tr>
        <tr>
            <td>Time Started:</td>
            <td style="width: 160px;" colspan="2">{!! $field($timeStarted) !!}</td>
        </tr>
        <tr>
            <td>Time Ended:</td>
            <td style="width: 160px;" colspan="2">{!! $field($timeEnded) !!}</td>
        </tr>
    </table>

    <div class="footer">
        <table>
            <tr>
                <td style="width: 38%;">ZCMC-F-MSS-04</td>
                <td style="width: 24%;">Rev. 4</td>
                <td>Effectivity Date: February 13, 2023</td>
            </tr>
        </table>
    </div>
</body>
</html>

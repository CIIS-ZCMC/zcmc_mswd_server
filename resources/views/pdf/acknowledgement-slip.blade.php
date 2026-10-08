@php
    // DOH-MAIFIP Acknowledgement Slip (ZCMC-F-MSWD-46, Rev. 3). Inputs are the
    // pre-formatted values from AcknowledgementSlipPdfService::slip(); a blank
    // value keeps the ruled line for handwriting.
    $logo = fn (string $path) => public_path($path);

    // An underlined fill-in cell with its italic caption under the line.
    $field = fn ($value, ?string $caption = null, string $class = '') =>
        '<div class="fill '.$class.'">'.(filled($value) ? e($value) : '&nbsp;').'</div>'
        .($caption ? '<div class="cap">('.$caption.')</div>' : '');

    // Long values step down in size so the form stays on one page (a HIS
    // diagnosis can run to a few hundred characters).
    $fit = fn ($value, int $small, int $tiny) => match (true) {
        mb_strlen((string) $value) > $tiny => 'tiny',
        mb_strlen((string) $value) > $small => 'small',
        default => '',
    };

    $box = fn (bool $checked, string $label) =>
        '<div class="opt"><span class="cb">'.($checked ? '&#10003;' : '&nbsp;').'</span> <b>'.$label.'</b></div>';
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    {{-- Self-contained styles like the UIS: a one-page government form on US
         Letter, matching the paper ZCMC-F-MSWD-46. DejaVu Sans for the check mark. --}}
    <style>
        @page { margin: 44px 48px 48px 48px; }
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 10.5px; color: #000; margin: 0; line-height: 1.35; }
        b, .b { font-weight: bold; }

        .head { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .head td { vertical-align: middle; text-align: center; padding: 0; }
        .head img { height: 75px; }
        .head .agency { font-size: 9.5px; line-height: 1.4; padding: 0 10px; }
        .title { text-align: center; font-size: 16px; font-weight: bold; margin-top: 8px; letter-spacing: 0.5px; }

        table.line { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.line td { padding: 0 3px; vertical-align: top; font-size: 10.5px; font-weight: normal; }
        .label { font-weight: normal; white-space: nowrap; padding-top: 2px !important; }
        .fill { border-bottom: 1px solid #000; text-align: center; font-weight: bold; min-height: 14px; padding-bottom: 1px; font-size: 10.5px; }
        .fill.small { font-size: 8.5px; padding-top: 2px; }
        .fill.tiny { font-size: 7px; padding-top: 2px; }
        .cap { text-align: center; font-size: 7.5px; font-style: italic; font-weight: normal; padding-top: 1px; }
        .comma { width: 6px; padding-top: 2px !important; font-weight: normal; }

        .funds { margin: 10px 0 0 46px; font-size: 10.5px; }
        .opt { margin-bottom: 9px; }
        .cb { display: inline-block; width: 11px; height: 11px; line-height: 11px; border: 1px solid #000;
              text-align: center; font-size: 9.5px; margin-right: 10px; vertical-align: middle; }
        .others { display: inline-block; width: 130px; border-bottom: 1px solid #000; }

        .sig { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        .sig td { vertical-align: bottom; padding: 0; }
        .signame { border-bottom: 1px solid #000; text-align: center; font-weight: bold; padding-bottom: 1px; min-height: 14px; font-size: 10.5px; }
        .sigcap { text-align: center; font-weight: normal; padding-top: 2px; font-size: 8.5px; }
        .approver-title { text-align: center; font-size: 8px; font-weight: normal; padding-top: 2px; }

        .meta { border-collapse: collapse; margin-top: 36px; font-size: 10px; }
        .meta td { padding: 2.5px 4px 2.5px 0; font-weight: normal; vertical-align: bottom; }
        .meta .fill { font-weight: bold; font-size: 10px; }

        .footer { position: fixed; bottom: -30px; left: 0; right: 0; font-size: 7.5px; }
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
            </td>
            <td style="width: 18%; text-align: left;"><img src="{{ $logo('images/intake/doh.png') }}" alt="DOH"></td>
        </tr>
    </table>

    {{-- Ako si ____, __ (Edad), ____ (Kasarian), ____ (Katayuang Sibil), --}}
    <table class="line">
        <tr>
            <td class="label" style="width: 52px;">Ako si</td>
            <td style="width: 210px;">{!! $field($name, 'Pangalan', $fit($name, 30, 45)) !!}</td>
            <td class="comma">,</td>
            <td style="width: 52px;">{!! $field($age, 'Edad') !!}</td>
            <td class="comma">,</td>
            <td style="width: 70px;">{!! $field($sex, 'Kasarian') !!}</td>
            <td class="comma">,</td>
            <td>{!! $field($civilStatus, 'Katayuang Sibil') !!}</td>
            <td class="comma">,</td>
        </tr>
    </table>

    {{-- taga ____ Ako ay ginagamot sa Zamboanga City Medical Center, --}}
    <table class="line">
        <tr>
            <td class="label" style="width: 52px;">taga</td>
            <td style="width: 236px;">{!! $field($address, 'Tirahan', $fit($address, 0, 60)) !!}</td>
            <td class="label">Ako ay ginagamot sa Zamboanga City Medical Center</td>
            <td class="comma">,</td>
        </tr>
    </table>

    {{-- sa sakit na ____ (diyagnosis) at tumatanggap ng kaukulang tulong --}}
    <table class="line">
        <tr>
            <td class="label" style="width: 80px;">sa sakit na</td>
            <td style="width: 268px;">{!! $field($diagnosis, 'diyagnosis', $fit($diagnosis, 40, 80)) !!}</td>
            <td class="label" style="padding-left: 24px !important;">at tumatanggap ng kaukulang tulong</td>
        </tr>
    </table>

    {{-- sa halagang Php ____ para sa ____ . --}}
    <table class="line" style="width: 74%;">
        <tr>
            <td class="label" style="width: 92px;">sa halagang Php</td>
            <td style="width: 80px;">{!! $field($amount) !!}</td>
            <td class="label" style="width: 44px; text-align: center;">para sa</td>
            <td>{!! $field($purpose, null, $fit($purpose, 0, 45)) !!}</td>
            <td class="comma">.</td>
        </tr>
    </table>

    {{-- The form is the DOH-MAIFIP form: that box is always ticked. --}}
    <div class="funds">
        {!! $box(true, 'DOH-MAIFIP') !!}
        {!! $box(false, 'OPAV-SOCIO CIVIC FUND') !!}
        <div class="opt"><span class="cb">&nbsp;</span> <b>OTHERS:</b> <span class="others">&nbsp;</span></div>
    </div>

    {{-- Patient (signer) and date, right column. --}}
    <table class="sig" style="margin-top: 50px;">
        <tr>
            <td style="width: 62%;"></td>
            <td>
                <div class="signame">{{ $name ?: ' ' }}</div>
                <div class="sigcap">Pasyente/ Kinatawan ng Pasyente</div>
            </td>
        </tr>
        <tr>
            <td></td>
            <td style="padding-top: 26px;">
                <div class="signame">{{ $date }}</div>
                <div class="sigcap">Petsa</div>
            </td>
        </tr>
    </table>

    {{-- Medical Social Worker (left), approver (right). --}}
    <table class="sig" style="margin-top: 34px;">
        <tr>
            <td style="width: 38%;">
                <div class="signame">{{ $socialWorker ?: ' ' }}</div>
                <div class="sigcap">Medical Social Worker</div>
            </td>
            <td style="width: 24%;"></td>
            <td></td>
        </tr>
        <tr>
            <td></td>
            <td></td>
            <td style="padding-top: 34px;">
                <div style="margin-bottom: 8px;">Inaprobahan ni:</div>
                <div class="signame">{{ $approverName ?: ' ' }}</div>
                @if (filled($approverTitle))
                    <div class="approver-title">{!! nl2br(e(mb_strtoupper($approverTitle))) !!}</div>
                @endif
            </td>
        </tr>
    </table>

    <table class="meta">
        <tr>
            <td>Patient Hospital Record Number:</td>
            <td style="width: 70px;">{!! $field($hospitalNumber) !!}</td>
        </tr>
        <tr>
            <td>MSWD # :</td>
            <td style="width: 300px;" colspan="2">{!! $field($mswdNumber) !!}</td>
        </tr>
        <tr>
            <td>Timed Started:</td>
            <td style="width: 70px;">{!! $field($timeStarted) !!}</td>
        </tr>
        <tr>
            <td>Timed Ended:</td>
            <td style="width: 70px;">{!! $field($timeEnded) !!}</td>
        </tr>
    </table>

    <div class="footer">
        <table>
            <tr>
                <td style="width: 30%;">ZCMC-F-MSWD-46</td>
                <td style="width: 30%;">Rev. 3</td>
                <td style="width: 30%;">Effectivity Date: November 24, 2023</td>
                <td style="text-align: right;">Page 1 of 1</td>
            </tr>
        </table>
    </div>
</body>
</html>

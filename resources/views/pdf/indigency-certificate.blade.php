@php
    // "Certificate of Eligibility (Indigency)", Annex A (Malasakit Center).
    // Inputs are the pre-formatted values from IndigencyCertificatePdfService::certificate();
    // a blank value keeps the ruled line for handwriting.
    $logo = fn (string $name) => public_path("images/intake/{$name}.png");

    // An underlined fill-in cell with its italic caption under the line.
    $field = fn ($value, ?string $caption = null, string $class = '') =>
        '<div class="fill '.$class.'">'.(filled($value) ? e($value) : '&nbsp;').'</div>'
        .($caption ? '<div class="cap">('.$caption.')</div>' : '');

    // Long values step down in size so each stays on its line.
    $fit = fn ($value, int $small, int $tiny) => match (true) {
        mb_strlen((string) $value) > $tiny => 'tiny',
        mb_strlen((string) $value) > $small => 'small',
        default => '',
    };
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    {{-- Self-contained styles like the other slips: a one-page form on US Letter,
         matching the paper Annex A. --}}
    <style>
        @page { margin: 54px 72px 54px 72px; }
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 12px; color: #000; margin: 0; line-height: 1.3; }
        b, .b { font-weight: bold; }

        .logos { width: 100%; border-collapse: collapse; margin-top: 30px; }
        .logos td { text-align: center; vertical-align: middle; padding: 0 6px; }
        .logos img { height: 66px; }
        .logos img.wide { height: auto; width: 190px; }
        .annex { text-align: right; font-size: 15px; margin-top: 32px; }
        .title { text-align: center; font-size: 16.5px; font-weight: bold; text-decoration: underline; margin-top: 26px; }

        table.line { width: 100%; border-collapse: collapse; }
        table.line td { padding: 0 3px; vertical-align: top; }
        .label { white-space: nowrap; padding-top: 2px !important; }
        .fill { border-bottom: 1px solid #000; text-align: center; font-weight: bold; min-height: 15px; padding-bottom: 1px; }
        .fill.small { font-size: 10px; padding-top: 2px; }
        .fill.tiny { font-size: 8px; padding-top: 3px; }
        .cap { text-align: center; font-size: 10.5px; font-style: italic; padding-top: 1px; }
        .indent { padding-left: 70px !important; }
        .para { line-height: 2.1; margin: 0; }

        .signer { width: 78%; border-collapse: collapse; margin-top: 30px; }
        .signer td { padding: 0; vertical-align: bottom; }
        .signame { border-bottom: 1px solid #000; text-align: center; font-weight: bold; min-height: 15px; padding-bottom: 1px; }
        .license { display: inline-block; width: 150px; border-bottom: 1px solid #000; font-weight: bold; text-align: center; margin-left: 40px; }
    </style>
</head>
<body>
    <table class="logos">
        <tr>
            <td style="width: 16%;"><img src="{{ $logo('doh') }}" alt="DOH"></td>
            <td style="width: 22%;"><img src="{{ $logo('dswd') }}" alt="DSWD"></td>
            <td style="width: 22%;"><img src="{{ $logo('pcso') }}" alt="PCSO"></td>
            <td style="width: 40%;"><img src="{{ $logo('philhealth') }}" class="wide" alt="PhilHealth"></td>
        </tr>
    </table>

    <div class="annex">ANNEX A</div>
    <div class="title">CERTIFICATE OF ELIGIBILITY (INDIGENCY)</div>

    {{-- This is to certify that ____ (Name of Patient) --}}
    <table class="line" style="margin-top: 40px;">
        <tr>
            <td class="label indent" style="width: 150px;">This is to certify that</td>
            <td>{!! $field($name, 'Name of Patient', $fit($name, 40, 56)) !!}</td>
        </tr>
    </table>

    {{-- of ____ (Address) is an --}}
    <table class="line" style="margin-top: 10px;">
        <tr>
            <td class="label" style="width: 70px;">of</td>
            <td>{!! $field($address, 'Address', $fit($address, 50, 72)) !!}</td>
            <td class="label" style="width: 90px; text-align: right;">is an</td>
        </tr>
    </table>

    {{-- indigent/needy patient with classification of ____ --}}
    <table class="line" style="margin-top: 22px;">
        <tr>
            <td class="label" style="width: 300px;">indigent/needy patient with classification of</td>
            <td style="padding-left: 40px !important;">{!! $field($classification) !!}</td>
        </tr>
    </table>

    <p class="para" style="margin-top: 38px;">
        <span style="padding-left: 70px;"></span>This certification is issued as a requirement for seeking financial and medical<br>
        assistance from the Malasakit Center especially for the following assistance/service:
    </p>
    {!! $field($services, null, $fit($services, 60, 90)) !!}

    {{-- from ____ (Name of Participating Agency/Hospital) --}}
    <table class="line" style="margin-top: 26px;">
        <tr>
            <td class="label" style="width: 70px;">from</td>
            <td>{!! $field($hospital, 'Name of Participating Agency/Hospital') !!}</td>
        </tr>
    </table>

    {{-- This certificate is issued on ____ (Date). --}}
    <table class="line" style="margin-top: 50px; width: auto;">
        <tr>
            <td class="label indent" style="width: 200px;">This certificate is issued on</td>
            <td style="width: 130px; padding-left: 30px !important;">{!! $field($date, 'Date') !!}</td>
            <td class="label">.</td>
        </tr>
    </table>

    <div class="b" style="margin-top: 70px;">Issued by:</div>
    <table class="signer">
        <tr>
            <td style="padding-top: 26px;">
                <div class="signame">{{ $signerName ?: ' ' }}</div>
                <div>Signature over Name of the Head of the Medical Social Worker Department</div>
                <div style="margin-top: 6px;">Licence No. <span class="license">{{ $signerLicense ?: ' ' }}</span></div>
            </td>
        </tr>
    </table>
</body>
</html>

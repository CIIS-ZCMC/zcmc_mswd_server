{{-- Shared print styles for every MSWD PDF: the intake sheet and the social
     case study report. `font-family: DejaVu Sans` is required, not cosmetic —
     DomPDF's default fonts have no glyph for the peso sign. --}}
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 10px; color: #1a1a1a; margin: 0; }
        h1, h2, h3 { margin: 0; }
        .muted { color: #666; }
        .center { text-align: center; }
        .right { text-align: right; }

        .letterhead { border-bottom: 2px solid #b45309; padding-bottom: 8px; margin-bottom: 10px; }
        .letterhead .office { font-size: 13px; font-weight: bold; letter-spacing: 1px; }
        .letterhead .sub { font-size: 9px; color: #666; }
        .doc-title { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; }

        .meta { width: 100%; margin-bottom: 10px; }
        .meta td { padding: 1px 0; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: bold;
                 text-transform: uppercase; background: #fde68a; color: #92400e; }
        .badge-final { background: #bbf7d0; color: #166534; }

        .section-title { background: #f3f4f6; border-left: 3px solid #b45309; padding: 4px 8px; margin: 12px 0 6px;
                         font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }

        table.data { width: 100%; border-collapse: collapse; }
        table.data td { padding: 3px 6px; vertical-align: top; }
        .label { color: #666; width: 24%; }
        .value { font-weight: bold; }

        table.grid { width: 100%; border-collapse: collapse; margin-top: 4px; }
        table.grid th { background: #f3f4f6; text-align: left; padding: 4px 6px; font-size: 9px;
                        border: 1px solid #d1d5db; }
        table.grid td { padding: 4px 6px; border: 1px solid #d1d5db; }
        /* Seven columns on A4 portrait: fixed layout makes the percentage widths
           authoritative, without it a long occupation blows the column out. */
        table.grid.family { table-layout: fixed; }
        table.grid.family th, table.grid.family td { padding: 3px 4px; font-size: 9px; word-wrap: break-word; }
        table.grid.family .sub { font-size: 8px; color: #666; }

        .prose { padding: 4px 6px; }
        .prose .q { color: #666; font-style: italic; }

        .signatures { width: 100%; margin-top: 28px; }
        .signatures td { width: 33%; text-align: center; padding: 0 10px; vertical-align: bottom; }
        .sig-line { border-top: 1px solid #333; padding-top: 3px; font-weight: bold; }
        .sig-role { font-size: 8px; color: #666; text-transform: uppercase; }

        .footer { position: fixed; bottom: -10px; left: 0; right: 0; font-size: 8px; color: #999;
                  border-top: 1px solid #e5e7eb; padding-top: 4px; }

        .watermark { position: fixed; top: 40%; left: 12%; font-size: 110px; color: #000;
                     opacity: 0.06; transform: rotate(-35deg); font-weight: bold; }
    </style>

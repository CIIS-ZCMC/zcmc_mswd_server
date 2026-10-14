<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\TurnaroundReportController and
 * TurnaroundReportExportController. The dashboard requires `reports.view`;
 * the export requires `reports.generate`.
 */
#[OA\Schema(
    schema: 'TurnaroundStats',
    description: 'Durations in whole minutes. Every figure but count is null when count is 0; within_target_pct is null when the target is inactive.',
    properties: [
        new OA\Property(property: 'count', type: 'integer'),
        new OA\Property(property: 'avg', type: 'number', nullable: true),
        new OA\Property(property: 'median', type: 'number', nullable: true),
        new OA\Property(property: 'p90', type: 'integer', nullable: true, description: 'Nearest-rank 90th percentile.'),
        new OA\Property(property: 'max', type: 'integer', nullable: true),
        new OA\Property(property: 'within_target_pct', type: 'number', nullable: true, example: 87.5),
    ],
)]
final class TurnaroundReportDocs
{
    #[OA\Get(
        path: '/reports/turnaround',
        operationId: 'reports.turnaround',
        tags: ['Reports'],
        summary: 'Turnaround time dashboard',
        description: 'Completed visits in the range (by completion day): per stage, per serving worker (total turnaround) and per day, with compliance against the active Library targets. Visits of patients with a protective case are excluded without `audit.view_protective`. Requires the `reports.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'from', in: 'query', required: false, description: 'Defaults to a month before `to`.', schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'to', in: 'query', required: false, description: 'Defaults to today.', schema: new OA\Schema(type: 'string', format: 'date')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Report data', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'object', properties: [
                    new OA\Property(property: 'from', type: 'string', format: 'date'),
                    new OA\Property(property: 'to', type: 'string', format: 'date'),
                    new OA\Property(property: 'protective_excluded', type: 'boolean'),
                    new OA\Property(property: 'targets', type: 'object', description: 'stage => minutes, null when inactive', additionalProperties: new OA\AdditionalProperties(type: 'integer', nullable: true)),
                    new OA\Property(property: 'completed', type: 'integer'),
                    new OA\Property(property: 'cancelled', type: 'integer'),
                    new OA\Property(property: 'stages', type: 'object', properties: [
                        new OA\Property(property: 'waiting', ref: '#/components/schemas/TurnaroundStats'),
                        new OA\Property(property: 'processing', ref: '#/components/schemas/TurnaroundStats'),
                        new OA\Property(property: 'total', ref: '#/components/schemas/TurnaroundStats'),
                    ]),
                    new OA\Property(property: 'by_employee', type: 'array', items: new OA\Items(allOf: [
                        new OA\Schema(properties: [
                            new OA\Property(property: 'user_id', type: 'integer'),
                            new OA\Property(property: 'name', type: 'string'),
                        ]),
                        new OA\Schema(ref: '#/components/schemas/TurnaroundStats'),
                    ])),
                    new OA\Property(property: 'by_day', type: 'array', items: new OA\Items(allOf: [
                        new OA\Schema(properties: [new OA\Property(property: 'date', type: 'string', format: 'date')]),
                        new OA\Schema(ref: '#/components/schemas/TurnaroundStats'),
                    ])),
                ]),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/reports/turnaround/export',
        operationId: 'reports.turnaround.export',
        tags: ['Reports'],
        summary: 'Export the turnaround time report',
        description: 'CSV by default (one row per stage, worker and day); an A4 PDF with `format=pdf`, inline unless `download=1`. Requires the `reports.generate` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'from', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'to', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'format', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['csv', 'pdf'])),
            new OA\Parameter(name: 'download', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The report', content: [
                new OA\MediaType(mediaType: 'text/csv', schema: new OA\Schema(type: 'string')),
                new OA\MediaType(mediaType: 'application/pdf', schema: new OA\Schema(type: 'string', format: 'binary')),
            ]),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function export(): void {}
}

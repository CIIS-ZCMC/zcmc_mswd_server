<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\SocialCaseReportController and
 * SocialCaseReportExportController. The dashboard requires `reports.view`;
 * the export requires `reports.generate`.
 */
final class SocialCaseReportDocs
{
    #[OA\Get(
        path: '/reports/social-cases',
        operationId: 'reports.social-cases',
        tags: ['Reports'],
        summary: 'Social case report dashboard',
        description: 'Requires the `reports.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'date_from', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'date_to', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Report data', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'object', additionalProperties: true),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/reports/social-cases/export',
        operationId: 'reports.social-cases.export',
        tags: ['Reports'],
        summary: 'Export the social case report',
        description: 'Requires the `reports.generate` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'date_from', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'date_to', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The exported spreadsheet', content: new OA\MediaType(
                mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                schema: new OA\Schema(type: 'string', format: 'binary'),
            )),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function export(): void {}
}

<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\DiagnosticReportController. Writes require `cases.update`. */
final class DiagnosticReportDocs
{
    #[OA\Get(
        path: '/diagnostics/{diagnostic}/reports',
        operationId: 'diagnostics.reports.index',
        tags: ['Case Clinical'],
        summary: 'List a diagnostic\'s reports',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'diagnostic', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Reports', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/DiagnosticReport')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/diagnostics/{diagnostic}/reports',
        operationId: 'diagnostics.reports.store',
        tags: ['Case Clinical'],
        summary: 'Upload a diagnostic report',
        description: 'Multipart upload. Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'diagnostic', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\MediaType(
            mediaType: 'multipart/form-data',
            schema: new OA\Schema(ref: '#/components/schemas/DiagnosticReportRequest'),
        )),
        responses: [
            new OA\Response(response: 201, description: 'The created report', content: new OA\JsonContent(ref: '#/components/schemas/DiagnosticReport')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Delete(
        path: '/diagnostic-reports/{diagnosticReport}',
        operationId: 'diagnostic-reports.destroy',
        tags: ['Case Clinical'],
        summary: 'Delete a diagnostic report',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'diagnosticReport', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

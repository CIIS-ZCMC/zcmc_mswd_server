<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\PatientAssistanceReportController. */
final class PatientAssistanceReportDocs
{
    #[OA\Get(
        path: '/assistances/{assistance}/reports',
        operationId: 'assistances.reports.forAssistance',
        tags: ['Assistance'],
        summary: 'Report snapshots for one assistance',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Reports', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssistanceReport')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function forAssistance(): void {}

    #[OA\Get(
        path: '/assistance-reports',
        operationId: 'assistance-reports.index',
        tags: ['Assistance'],
        summary: 'List released-aid report snapshots',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/page'),
            new OA\Parameter(ref: '#/components/parameters/per_page'),
            new OA\Parameter(ref: '#/components/parameters/search'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Reports', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssistanceReport')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/assistance-reports/{report}',
        operationId: 'assistance-reports.show',
        tags: ['Assistance'],
        summary: 'Show a report snapshot',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'report', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The report', content: new OA\JsonContent(ref: '#/components/schemas/AssistanceReport')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Post(
        path: '/assistance-reports/{report}/void',
        operationId: 'assistance-reports.void',
        tags: ['Assistance'],
        summary: 'Void a report snapshot',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'report', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The voided report', content: new OA\JsonContent(ref: '#/components/schemas/AssistanceReport')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function void(): void {}
}

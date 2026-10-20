<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\TurnaroundTargetController.
 */
#[OA\Schema(
    schema: 'TurnaroundTarget',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'stage', type: 'string', enum: ['waiting', 'processing', 'total']),
        new OA\Property(property: 'label', type: 'string'),
        new OA\Property(property: 'description', type: 'string'),
        new OA\Property(property: 'minutes', type: 'integer', minimum: 1, maximum: 1440),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ],
)]
#[OA\Schema(
    schema: 'UpdateTurnaroundTargetRequest',
    properties: [
        new OA\Property(property: 'minutes', type: 'integer', minimum: 1, maximum: 1440, nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean', nullable: true),
    ],
)]
final class TurnaroundTargetDocs
{
    #[OA\Get(
        path: '/turnaround-targets',
        operationId: 'turnaroundTargets.index',
        tags: ['Library'],
        summary: 'List turnaround time targets',
        description: 'Returns the 3 Citizen\'s Charter targets (waiting, processing, total). Open to all authenticated users.',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Turnaround targets', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/TurnaroundTarget')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/turnaround-targets/{turnaroundTarget}',
        operationId: 'turnaroundTargets.show',
        tags: ['Library'],
        summary: 'Show a turnaround time target',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'turnaroundTarget', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The turnaround target', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/TurnaroundTarget'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/turnaround-targets/{turnaroundTarget}',
        operationId: 'turnaroundTargets.update',
        tags: ['Library'],
        summary: 'Update target minutes or active status',
        description: 'Requires the `library.manage` permission. The stage cannot be changed.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'turnaroundTarget', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/UpdateTurnaroundTargetRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated turnaround target', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/TurnaroundTarget'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}
}

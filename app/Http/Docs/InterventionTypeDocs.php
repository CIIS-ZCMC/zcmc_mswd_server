<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\InterventionTypeController (read-only apiResource). */
final class InterventionTypeDocs
{
    #[OA\Get(
        path: '/intervention-types',
        operationId: 'intervention-types.index',
        tags: ['Reference'],
        summary: 'List intervention types',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Intervention types', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/InterventionType')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/intervention-types/{interventionType}',
        operationId: 'intervention-types.show',
        tags: ['Reference'],
        summary: 'Show an intervention type',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'interventionType', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The intervention type', content: new OA\JsonContent(ref: '#/components/schemas/InterventionType')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}
}

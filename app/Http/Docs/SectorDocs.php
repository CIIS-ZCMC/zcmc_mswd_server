<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\SectorController (read-only apiResource). */
final class SectorDocs
{
    #[OA\Get(
        path: '/sectors',
        operationId: 'sectors.index',
        tags: ['Reference'],
        summary: 'List sectors',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Sectors', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Sector')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/sectors/{sector}',
        operationId: 'sectors.show',
        tags: ['Reference'],
        summary: 'Show a sector',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'sector', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The sector', content: new OA\JsonContent(ref: '#/components/schemas/Sector')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}
}

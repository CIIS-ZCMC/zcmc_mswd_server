<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\GuarantorController (read-only apiResource). */
final class GuarantorDocs
{
    #[OA\Get(
        path: '/guarantors',
        operationId: 'guarantors.index',
        tags: ['Reference'],
        summary: 'List guarantors',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Guarantors', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Guarantor')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/guarantors/{guarantor}',
        operationId: 'guarantors.show',
        tags: ['Reference'],
        summary: 'Show a guarantor',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'guarantor', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The guarantor', content: new OA\JsonContent(ref: '#/components/schemas/Guarantor')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}
}

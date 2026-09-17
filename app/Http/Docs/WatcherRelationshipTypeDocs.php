<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\WatcherRelationshipTypeController (read-only apiResource). */
final class WatcherRelationshipTypeDocs
{
    #[OA\Get(
        path: '/watcher-relationship-types',
        operationId: 'watcher-relationship-types.index',
        tags: ['Reference'],
        summary: 'List watcher relationship types',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Watcher relationship types', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/WatcherRelationshipType')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/watcher-relationship-types/{watcherRelationshipType}',
        operationId: 'watcher-relationship-types.show',
        tags: ['Reference'],
        summary: 'Show a watcher relationship type',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'watcherRelationshipType', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The watcher relationship type', content: new OA\JsonContent(ref: '#/components/schemas/WatcherRelationshipType')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}
}

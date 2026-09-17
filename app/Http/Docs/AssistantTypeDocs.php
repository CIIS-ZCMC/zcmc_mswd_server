<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\AssistantTypeController (read-only apiResource). */
final class AssistantTypeDocs
{
    #[OA\Get(
        path: '/assistant-types',
        operationId: 'assistant-types.index',
        tags: ['Reference'],
        summary: 'List assistant types',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Assistant types', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssistantType')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/assistant-types/{assistantType}',
        operationId: 'assistant-types.show',
        tags: ['Reference'],
        summary: 'Show an assistant type',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistantType', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The assistant type', content: new OA\JsonContent(ref: '#/components/schemas/AssistantType')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}
}

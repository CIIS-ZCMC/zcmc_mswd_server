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

    #[OA\Post(
        path: '/assistant-types',
        operationId: 'assistant-types.store',
        tags: ['Library'],
        summary: 'Add a Type of Assistance',
        description: 'Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssistantTypeRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created type', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssistantType'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/assistant-types/{assistantType}',
        operationId: 'assistant-types.update',
        tags: ['Library'],
        summary: 'Rename, recategorise, retire or reactivate a Type of Assistance',
        description: 'Partial update. Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistantType', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssistantTypeRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated type', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssistantType'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/assistant-types/{assistantType}',
        operationId: 'assistant-types.destroy',
        tags: ['Library'],
        summary: 'Delete a Type of Assistance (soft delete)',
        description: 'Records that already use the type keep showing it; new records can no longer pick it. Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistantType', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

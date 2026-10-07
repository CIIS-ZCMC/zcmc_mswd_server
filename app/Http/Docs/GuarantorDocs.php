<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\GuarantorController (apiResource; writes need guarantee.create). */
final class GuarantorDocs
{
    #[OA\Get(
        path: '/guarantors',
        operationId: 'guarantors.index',
        tags: ['Reference'],
        summary: 'List guarantors',
        description: '`?active=1` hides retired guarantors.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean'))],
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

    #[OA\Post(
        path: '/guarantors',
        operationId: 'guarantors.store',
        tags: ['Library'],
        summary: 'Add a guarantor',
        description: 'Requires the `guarantee.create` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/GuarantorRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created guarantor', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Guarantor'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/guarantors/{guarantor}',
        operationId: 'guarantors.update',
        tags: ['Library'],
        summary: 'Rename, retire or reactivate a guarantor',
        description: 'Partial update. Requires the `guarantee.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'guarantor', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/GuarantorRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated guarantor', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Guarantor'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/guarantors/{guarantor}',
        operationId: 'guarantors.destroy',
        tags: ['Library'],
        summary: 'Delete a guarantor (soft delete)',
        description: 'Records that already name the guarantor keep showing it; new records can no longer pick it. Requires the `guarantee.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'guarantor', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\CaseModelController (apiResource).
 * Per-action permissions: cases.view (index/show), cases.create (store),
 * cases.update (update), cases.delete (destroy).
 */
final class CaseModelDocs
{
    #[OA\Get(
        path: '/cases',
        operationId: 'cases.index',
        tags: ['Cases'],
        summary: 'List cases',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/page'),
            new OA\Parameter(ref: '#/components/parameters/per_page'),
            new OA\Parameter(ref: '#/components/parameters/search'),
            new OA\Parameter(ref: '#/components/parameters/sort'),
            new OA\Parameter(ref: '#/components/parameters/direction'),
            new OA\Parameter(ref: '#/components/parameters/filter'),
            new OA\Parameter(ref: '#/components/parameters/trashed'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated cases', content: new OA\JsonContent(ref: '#/components/schemas/CaseCollection')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/cases',
        operationId: 'cases.store',
        tags: ['Cases'],
        summary: 'Open a case',
        description: 'Requires the `cases.create` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/CaseStoreRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created case', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/cases/{case}',
        operationId: 'cases.show',
        tags: ['Cases'],
        summary: 'Show a case',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The case', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/cases/{case}',
        operationId: 'cases.update',
        tags: ['Cases'],
        summary: 'Update a case',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/CaseStoreRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated case', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/cases/{case}',
        operationId: 'cases.destroy',
        tags: ['Cases'],
        summary: 'Archive a case',
        description: 'Requires the `cases.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

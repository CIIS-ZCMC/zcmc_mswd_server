<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\DiagnosticController. */
final class DiagnosticDocs
{
    #[OA\Get(
        path: '/cases/{case}/diagnostics',
        operationId: 'cases.diagnostics.index',
        tags: ['Case Clinical'],
        summary: 'List a case\'s diagnostics',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Diagnostics', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Diagnostic')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/cases/{case}/diagnostics',
        operationId: 'cases.diagnostics.store',
        tags: ['Case Clinical'],
        summary: 'Add a diagnostic',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/DiagnosticRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created diagnostic', content: new OA\JsonContent(ref: '#/components/schemas/Diagnostic')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/diagnostics/{diagnostic}',
        operationId: 'diagnostics.update',
        tags: ['Case Clinical'],
        summary: 'Update a diagnostic',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'diagnostic', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/DiagnosticRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated diagnostic', content: new OA\JsonContent(ref: '#/components/schemas/Diagnostic')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/diagnostics/{diagnostic}',
        operationId: 'diagnostics.destroy',
        tags: ['Case Clinical'],
        summary: 'Delete a diagnostic',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'diagnostic', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

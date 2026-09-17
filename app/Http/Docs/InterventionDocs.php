<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\InterventionController. */
final class InterventionDocs
{
    #[OA\Get(
        path: '/cases/{case}/interventions',
        operationId: 'cases.interventions.index',
        tags: ['Case Clinical'],
        summary: 'List a case\'s interventions',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Interventions', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Intervention')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/cases/{case}/interventions',
        operationId: 'cases.interventions.store',
        tags: ['Case Clinical'],
        summary: 'Add an intervention',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/InterventionRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created intervention', content: new OA\JsonContent(ref: '#/components/schemas/Intervention')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/interventions/{intervention}',
        operationId: 'interventions.update',
        tags: ['Case Clinical'],
        summary: 'Update an intervention',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intervention', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/InterventionRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated intervention', content: new OA\JsonContent(ref: '#/components/schemas/Intervention')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/interventions/{intervention}',
        operationId: 'interventions.destroy',
        tags: ['Case Clinical'],
        summary: 'Delete an intervention',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intervention', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

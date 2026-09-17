<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\PatientAssistanceController.
 * Reads require `assistance.view`; create/update/delete require the matching
 * `assistance.*` permission.
 */
final class PatientAssistanceDocs
{
    #[OA\Get(
        path: '/cases/{case}/assistances',
        operationId: 'cases.assistances.index',
        tags: ['Assistance'],
        summary: 'List a case\'s assistances',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Assistances', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Assistance')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/cases/{case}/assistances',
        operationId: 'cases.assistances.store',
        tags: ['Assistance'],
        summary: 'Create an assistance',
        description: 'Requires the `assistance.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssistanceRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created assistance', content: new OA\JsonContent(ref: '#/components/schemas/Assistance')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/assistances/{assistance}',
        operationId: 'assistances.show',
        tags: ['Assistance'],
        summary: 'Show an assistance',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The assistance', content: new OA\JsonContent(ref: '#/components/schemas/Assistance')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/assistances/{assistance}',
        operationId: 'assistances.update',
        tags: ['Assistance'],
        summary: 'Update an assistance',
        description: 'Requires the `assistance.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssistanceRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated assistance', content: new OA\JsonContent(ref: '#/components/schemas/Assistance')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/assistances/{assistance}',
        operationId: 'assistances.destroy',
        tags: ['Assistance'],
        summary: 'Delete an assistance',
        description: 'Requires the `assistance.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\AssessmentController.
 * Reads require `cases.view`; create/update require `cases.create`/`cases.update`.
 */
final class AssessmentDocs
{
    #[OA\Get(
        path: '/cases/{case}/assessments',
        operationId: 'cases.assessments.index',
        tags: ['Case Clinical'],
        summary: 'List a case\'s assessments',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Assessments', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Assessment')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/cases/{case}/assessments',
        operationId: 'cases.assessments.store',
        tags: ['Case Clinical'],
        summary: 'Create an assessment',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created assessment', content: new OA\JsonContent(ref: '#/components/schemas/Assessment')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/assessments/{assessment}',
        operationId: 'assessments.update',
        tags: ['Case Clinical'],
        summary: 'Update an assessment',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assessment', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated assessment', content: new OA\JsonContent(ref: '#/components/schemas/Assessment')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/assessments/{assessment}',
        operationId: 'assessments.destroy',
        tags: ['Case Clinical'],
        summary: 'Delete an assessment',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assessment', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

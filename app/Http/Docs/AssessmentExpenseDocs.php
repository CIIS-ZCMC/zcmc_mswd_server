<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\AssessmentExpenseController. */
final class AssessmentExpenseDocs
{
    #[OA\Get(
        path: '/assessments/{assessment}/expenses',
        operationId: 'assessments.expenses.index',
        tags: ['Case Clinical'],
        summary: 'List an assessment\'s household expenses',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assessment', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Expenses', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssessmentExpense')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/assessments/{assessment}/expenses',
        operationId: 'assessments.expenses.store',
        tags: ['Case Clinical'],
        summary: 'Add an expense line',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assessment', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentExpenseRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created expense', content: new OA\JsonContent(ref: '#/components/schemas/AssessmentExpense')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/assessment-expenses/{expense}',
        operationId: 'assessment-expenses.update',
        tags: ['Case Clinical'],
        summary: 'Update an expense line',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'expense', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentExpenseRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated expense', content: new OA\JsonContent(ref: '#/components/schemas/AssessmentExpense')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/assessment-expenses/{expense}',
        operationId: 'assessment-expenses.destroy',
        tags: ['Case Clinical'],
        summary: 'Delete an expense line',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'expense', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

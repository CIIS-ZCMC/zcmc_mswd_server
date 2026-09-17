<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\DocumentController (patient documents).
 * Reads require `patients.view`; writes require `patients.update`.
 */
final class DocumentDocs
{
    #[OA\Get(
        path: '/patients/{patient}/documents',
        operationId: 'patients.documents.index',
        tags: ['Patient Records'],
        summary: 'List a patient\'s documents',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Documents', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Document')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/patients/{patient}/documents',
        operationId: 'patients.documents.store',
        tags: ['Patient Records'],
        summary: 'Add a document',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/DocumentRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created document', content: new OA\JsonContent(ref: '#/components/schemas/Document')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Delete(
        path: '/documents/{document}',
        operationId: 'documents.destroy',
        tags: ['Patient Records'],
        summary: 'Delete a document',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'document', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\CaseDocumentController. Writes require `cases.update`. */
final class CaseDocumentDocs
{
    #[OA\Get(
        path: '/cases/{case}/documents',
        operationId: 'cases.documents.index',
        tags: ['Case Clinical'],
        summary: 'List a case\'s documents',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
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
        path: '/cases/{case}/documents',
        operationId: 'cases.documents.store',
        tags: ['Case Clinical'],
        summary: 'Upload a case document',
        description: 'Multipart upload. Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\MediaType(
            mediaType: 'multipart/form-data',
            schema: new OA\Schema(ref: '#/components/schemas/CaseDocumentRequest'),
        )),
        responses: [
            new OA\Response(response: 201, description: 'The created document', content: new OA\JsonContent(ref: '#/components/schemas/Document')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Delete(
        path: '/cases/{case}/documents/{document}',
        operationId: 'cases.documents.destroy',
        tags: ['Case Clinical'],
        summary: 'Delete a case document',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'document', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

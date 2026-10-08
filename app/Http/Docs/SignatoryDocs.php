<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\SignatoryController: the officers printed
 * on MSWD forms (Library). Reads need sign-in; writes need `library.manage`.
 */
#[OA\Schema(
    schema: 'Signatory',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'title', type: 'string', nullable: true, description: 'Printed under the name; may contain line breaks.'),
        new OA\Property(property: 'role', type: 'string', enum: ['allied_health_chief']),
        new OA\Property(property: 'role_label', type: 'string'),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'sort_order', type: 'integer'),
    ],
)]
#[OA\Schema(
    schema: 'SignatoryRequest',
    description: 'At most one active signatory per role (422 on `is_active` otherwise). On update every field is optional.',
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255),
        new OA\Property(property: 'title', type: 'string', maxLength: 1000, nullable: true),
        new OA\Property(property: 'role', type: 'string', enum: ['allied_health_chief']),
        new OA\Property(property: 'is_active', type: 'boolean'),
        new OA\Property(property: 'sort_order', type: 'integer', minimum: 0),
    ],
)]
final class SignatoryDocs
{
    #[OA\Get(
        path: '/signatories',
        operationId: 'signatories.index',
        tags: ['Library'],
        summary: 'List signatories',
        description: '`?active=1` lists only the active ones.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean'))],
        responses: [
            new OA\Response(response: 200, description: 'Signatories', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Signatory')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/signatories',
        operationId: 'signatories.store',
        tags: ['Library'],
        summary: 'Add a signatory',
        description: 'Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/SignatoryRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created signatory', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Signatory'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/signatories/{signatory}',
        operationId: 'signatories.update',
        tags: ['Library'],
        summary: 'Edit, retire or reactivate a signatory',
        description: 'Partial update. Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'signatory', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/SignatoryRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated signatory', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Signatory'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/signatories/{signatory}',
        operationId: 'signatories.destroy',
        tags: ['Library'],
        summary: 'Delete a signatory (soft delete)',
        description: 'Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'signatory', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

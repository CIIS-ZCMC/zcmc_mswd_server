<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\RoleController (apiResource).
 * Every action requires the `roles.manage` permission.
 */
final class RoleDocs
{
    #[OA\Get(
        path: '/roles',
        operationId: 'roles.index',
        tags: ['Users & Roles'],
        summary: 'List roles',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/page'),
            new OA\Parameter(ref: '#/components/parameters/per_page'),
            new OA\Parameter(ref: '#/components/parameters/search'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Roles', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Role')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/roles',
        operationId: 'roles.store',
        tags: ['Users & Roles'],
        summary: 'Create a role',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/RoleStoreRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created role', content: new OA\JsonContent(ref: '#/components/schemas/Role')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/roles/{role}',
        operationId: 'roles.show',
        tags: ['Users & Roles'],
        summary: 'Show a role',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'role', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The role', content: new OA\JsonContent(ref: '#/components/schemas/Role')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/roles/{role}',
        operationId: 'roles.update',
        tags: ['Users & Roles'],
        summary: 'Update a role',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'role', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/RoleStoreRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated role', content: new OA\JsonContent(ref: '#/components/schemas/Role')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/roles/{role}',
        operationId: 'roles.destroy',
        tags: ['Users & Roles'],
        summary: 'Delete a role',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'role', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

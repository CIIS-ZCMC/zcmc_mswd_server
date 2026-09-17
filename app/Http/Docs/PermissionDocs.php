<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\PermissionController (apiResource).
 * Every action requires the `roles.manage` permission.
 */
final class PermissionDocs
{
    #[OA\Get(
        path: '/permissions',
        operationId: 'permissions.index',
        tags: ['Users & Roles'],
        summary: 'List permissions',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/page'),
            new OA\Parameter(ref: '#/components/parameters/per_page'),
            new OA\Parameter(ref: '#/components/parameters/search'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Permissions', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Permission')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/permissions',
        operationId: 'permissions.store',
        tags: ['Users & Roles'],
        summary: 'Create a permission',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PermissionStoreRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created permission', content: new OA\JsonContent(ref: '#/components/schemas/Permission')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/permissions/{permission}',
        operationId: 'permissions.show',
        tags: ['Users & Roles'],
        summary: 'Show a permission',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'permission', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The permission', content: new OA\JsonContent(ref: '#/components/schemas/Permission')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/permissions/{permission}',
        operationId: 'permissions.update',
        tags: ['Users & Roles'],
        summary: 'Update a permission',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'permission', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PermissionStoreRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated permission', content: new OA\JsonContent(ref: '#/components/schemas/Permission')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/permissions/{permission}',
        operationId: 'permissions.destroy',
        tags: ['Users & Roles'],
        summary: 'Delete a permission',
        description: 'Requires the `roles.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'permission', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

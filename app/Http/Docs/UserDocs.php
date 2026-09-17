<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\UserController (read-only) and
 * SyncUserRolesController.
 */
final class UserDocs
{
    #[OA\Get(
        path: '/users',
        operationId: 'users.index',
        tags: ['Users & Roles'],
        summary: 'List users',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/page'),
            new OA\Parameter(ref: '#/components/parameters/per_page'),
            new OA\Parameter(ref: '#/components/parameters/search'),
            new OA\Parameter(ref: '#/components/parameters/sort'),
            new OA\Parameter(ref: '#/components/parameters/direction'),
            new OA\Parameter(ref: '#/components/parameters/filter'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated users', content: new OA\JsonContent(ref: '#/components/schemas/UserCollection')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/users/{user}',
        operationId: 'users.show',
        tags: ['Users & Roles'],
        summary: 'Show a user',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'user', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The user', content: new OA\JsonContent(ref: '#/components/schemas/User')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/users/{user}/roles',
        operationId: 'users.roles.sync',
        tags: ['Users & Roles'],
        summary: 'Replace a user\'s roles',
        description: 'Requires the `users.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'user', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/SyncUserRolesRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated user', content: new OA\JsonContent(ref: '#/components/schemas/User')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function syncRoles(): void {}
}

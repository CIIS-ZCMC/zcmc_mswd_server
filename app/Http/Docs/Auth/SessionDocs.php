<?php

namespace App\Http\Docs\Auth;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the current-session endpoints:
 * App\Http\Controllers\MeController, LogoutController, and the GET /user closure.
 */
final class SessionDocs
{
    #[OA\Get(
        path: '/me',
        operationId: 'auth.me',
        tags: ['Auth'],
        summary: 'The user behind the current token',
        description: 'Returns the user with roles and effective permissions. Used by the client to rehydrate a session.',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'The current user', content: new OA\JsonContent(ref: '#/components/schemas/User')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function me(): void {}

    #[OA\Get(
        path: '/user',
        operationId: 'auth.user',
        tags: ['Auth'],
        summary: 'The raw authenticated user model',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'The current user', content: new OA\JsonContent(ref: '#/components/schemas/User')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function user(): void {}

    #[OA\Post(
        path: '/logout',
        operationId: 'auth.logout',
        tags: ['Auth'],
        summary: 'Revoke the current token',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function logout(): void {}
}

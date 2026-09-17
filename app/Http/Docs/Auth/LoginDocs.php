<?php

namespace App\Http\Docs\Auth;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\LoginController. */
final class LoginDocs
{
    #[OA\Post(
        path: '/login',
        operationId: 'auth.login',
        tags: ['Auth'],
        summary: 'Authenticate and issue a bearer token',
        description: 'Public, but rate-limited to 6 requests/minute. Returns the user and a Sanctum token.',
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/LoginRequest')),
        responses: [
            new OA\Response(response: 200, description: 'Authenticated', content: new OA\JsonContent(ref: '#/components/schemas/LoginResponse')),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
            new OA\Response(response: 429, description: 'Too many login attempts.'),
        ],
    )]
    public function login(): void {}
}

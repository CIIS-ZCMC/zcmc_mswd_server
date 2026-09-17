<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Shared response components referenced across every endpoint.
 *
 * Reference them from operations as, e.g.:
 *   #[OA\Response(response: 401, ref: '#/components/responses/Unauthenticated')]
 */
#[OA\Response(
    response: 'Unauthenticated',
    description: 'No valid Sanctum token was supplied.',
    content: new OA\JsonContent(
        properties: [
            new OA\Property(property: 'message', type: 'string', example: 'Unauthenticated.'),
        ],
    ),
)]
#[OA\Response(
    response: 'Forbidden',
    description: 'The token is valid but lacks the required permission.',
    content: new OA\JsonContent(
        properties: [
            new OA\Property(property: 'message', type: 'string', example: 'This action is unauthorized.'),
        ],
    ),
)]
#[OA\Response(
    response: 'NotFound',
    description: 'The requested resource does not exist.',
    content: new OA\JsonContent(
        properties: [
            new OA\Property(property: 'message', type: 'string', example: 'Record not found.'),
        ],
    ),
)]
#[OA\Response(
    response: 'ValidationError',
    description: 'The request body failed validation.',
    content: new OA\JsonContent(ref: '#/components/schemas/ValidationError'),
)]
#[OA\Response(
    response: 'NoContent',
    description: 'The action succeeded and returned no body.',
)]
final class CommonResponses
{
    //
}

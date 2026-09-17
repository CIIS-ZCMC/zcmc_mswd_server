<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Shared schema components: the pagination envelope and the validation-error
 * body. Concrete resource collections reference PaginationMeta / PaginationLinks
 * alongside their own `data` array.
 */
#[OA\Schema(
    schema: 'ValidationError',
    description: 'Laravel 422 validation error response.',
    properties: [
        new OA\Property(property: 'message', type: 'string', example: 'The given data was invalid.'),
        new OA\Property(
            property: 'errors',
            type: 'object',
            additionalProperties: new OA\AdditionalProperties(
                type: 'array',
                items: new OA\Items(type: 'string'),
            ),
            example: ['first_name' => ['The first name field is required.']],
        ),
    ],
)]
#[OA\Schema(
    schema: 'PaginationLinks',
    description: 'The `links` block of a paginated collection.',
    properties: [
        new OA\Property(property: 'first', type: 'string', nullable: true),
        new OA\Property(property: 'last', type: 'string', nullable: true),
        new OA\Property(property: 'prev', type: 'string', nullable: true),
        new OA\Property(property: 'next', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'PaginationMeta',
    description: 'The `meta` block of a paginated collection.',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', example: 1),
        new OA\Property(property: 'from', type: 'integer', nullable: true, example: 1),
        new OA\Property(property: 'last_page', type: 'integer', example: 5),
        new OA\Property(property: 'path', type: 'string', example: 'https://mswd.test/api/patients'),
        new OA\Property(property: 'per_page', type: 'integer', example: 15),
        new OA\Property(property: 'to', type: 'integer', nullable: true, example: 15),
        new OA\Property(property: 'total', type: 'integer', example: 73),
    ],
)]
final class CommonSchemas
{
    //
}

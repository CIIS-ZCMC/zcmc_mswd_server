<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Reusable query parameters for the standard list/table endpoints, mirroring
 * App\Support\ListQuery. Reference them from an operation as, e.g.:
 *   #[OA\Parameter(ref: '#/components/parameters/page')]
 */
#[OA\Parameter(
    parameter: 'page',
    name: 'page',
    in: 'query',
    required: false,
    description: 'Page number (1-based).',
    schema: new OA\Schema(type: 'integer', default: 1, minimum: 1),
)]
#[OA\Parameter(
    parameter: 'per_page',
    name: 'per_page',
    in: 'query',
    required: false,
    description: 'Rows per page (capped at 100).',
    schema: new OA\Schema(type: 'integer', default: 15, minimum: 1, maximum: 100),
)]
#[OA\Parameter(
    parameter: 'search',
    name: 'search',
    in: 'query',
    required: false,
    description: 'Free-text search over the repository-defined searchable columns.',
    schema: new OA\Schema(type: 'string'),
)]
#[OA\Parameter(
    parameter: 'sort',
    name: 'sort',
    in: 'query',
    required: false,
    description: 'Column to sort by (must be sortable for the resource).',
    schema: new OA\Schema(type: 'string'),
)]
#[OA\Parameter(
    parameter: 'direction',
    name: 'direction',
    in: 'query',
    required: false,
    description: 'Sort direction.',
    schema: new OA\Schema(type: 'string', default: 'asc', enum: ['asc', 'desc']),
)]
#[OA\Parameter(
    parameter: 'filter',
    name: 'filter',
    in: 'query',
    required: false,
    description: 'Column filters as filter[column]=value.',
    style: 'deepObject',
    explode: true,
    schema: new OA\Schema(type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'string')),
)]
#[OA\Parameter(
    parameter: 'trashed',
    name: 'trashed',
    in: 'query',
    required: false,
    description: 'Whether to include soft-deleted rows.',
    schema: new OA\Schema(type: 'string', default: 'without', enum: ['without', 'with', 'only']),
)]
final class CommonParameters
{
    //
}

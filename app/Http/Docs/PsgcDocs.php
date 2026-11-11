<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the PSGC address pickers
 * (App\Http\Controllers\Psgc\CitySearchController, CityBarangaysController).
 */
#[OA\Schema(
    schema: 'PsgcCity',
    description: 'A city, municipality or Manila district (SubMun) that has barangays.',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: '0931700000', description: '10-digit PSGC code'),
        new OA\Property(property: 'name', type: 'string', example: 'City of Zamboanga'),
        new OA\Property(property: 'label', type: 'string', example: 'City of Zamboanga', description: 'Names the city for a Manila district: "Tondo I/II, City of Manila"'),
        new OA\Property(property: 'kind', type: 'string', nullable: true, enum: ['City', 'Mun', 'SubMun', 'SGU']),
        new OA\Property(property: 'province', type: 'object', nullable: true, description: 'Null for independent cities and NCR', properties: [
            new OA\Property(property: 'code', type: 'string'),
            new OA\Property(property: 'name', type: 'string'),
        ]),
        new OA\Property(property: 'region', type: 'object', nullable: true, properties: [
            new OA\Property(property: 'code', type: 'string', example: '0900000000'),
            new OA\Property(property: 'name', type: 'string', example: 'Region IX (Zamboanga Peninsula)'),
        ]),
    ],
)]
#[OA\Schema(
    schema: 'PsgcBarangay',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: '0931700001'),
        new OA\Property(property: 'name', type: 'string', example: 'Arena Blanco'),
    ],
)]
final class PsgcDocs
{
    #[OA\Get(
        path: '/psgc/cities',
        operationId: 'psgc.cities',
        tags: ['Reference'],
        summary: 'Find a city or municipality for an address',
        description: 'At most 30 results. Matches the name of the city, its province or (for a Manila district) its city. Cities in `services.psgc.home_region` come first.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 100)),
            new OA\Parameter(name: 'code', in: 'query', required: false, description: 'Return just this city', schema: new OA\Schema(type: 'string', minLength: 10, maxLength: 10)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Matching cities', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PsgcCity')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function cities(): void {}

    #[OA\Get(
        path: '/psgc/cities/{city}/barangays',
        operationId: 'psgc.cities.barangays',
        tags: ['Reference'],
        summary: "List a city's barangays",
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'city', in: 'path', required: true, schema: new OA\Schema(type: 'string', pattern: '^[0-9]{10}$'))],
        responses: [
            new OA\Response(response: 200, description: 'Barangays, sorted by name', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PsgcBarangay')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function barangays(): void {}
}

<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\HospitalPatientController and
 * FindHospitalPatientController. All require the `patients.view` permission.
 */
final class HospitalPatientDocs
{
    #[OA\Get(
        path: '/hospital-patients',
        operationId: 'hospital-patients.index',
        tags: ['Hospital (HIS)'],
        summary: 'List / search HIS patients',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'HIS patients', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/HospitalPatient')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/hospital-patients/find',
        operationId: 'hospital-patients.find',
        tags: ['Hospital (HIS)'],
        summary: 'Find one HIS patient by name or hospital number',
        description: 'Requires the `patients.view` permission. Provide `name` or `hospital_number`.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'name', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
            new OA\Parameter(name: 'hospital_number', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The matched HIS patient', content: new OA\JsonContent(ref: '#/components/schemas/HospitalPatient')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function find(): void {}

    #[OA\Get(
        path: '/hospital-patients/{id}',
        operationId: 'hospital-patients.show',
        tags: ['Hospital (HIS)'],
        summary: 'Show one HIS patient (with personal data and transactions)',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'The HIS patient aggregate', content: new OA\JsonContent(ref: '#/components/schemas/HospitalPatient')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}
}

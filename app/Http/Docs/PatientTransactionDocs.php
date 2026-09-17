<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\PatientTransactionController,
 * FindPatientTransactionController and PatientGuarantorController.
 * All require the `patients.view` permission.
 */
final class PatientTransactionDocs
{
    #[OA\Get(
        path: '/patient-transactions',
        operationId: 'patient-transactions.index',
        tags: ['Hospital (HIS)'],
        summary: 'List / search HIS transactions',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
            new OA\Parameter(name: 'date', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'HIS transactions', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientTransaction')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function index(): void {}

    #[OA\Get(
        path: '/patient-transactions/find',
        operationId: 'patient-transactions.find',
        tags: ['Hospital (HIS)'],
        summary: 'Find one HIS transaction',
        description: 'Requires the `patients.view` permission. Provide `name` or `hospital_number`.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'name', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
            new OA\Parameter(name: 'hospital_number', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
            new OA\Parameter(name: 'date', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The matched transaction', content: new OA\JsonContent(ref: '#/components/schemas/PatientTransaction')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function find(): void {}

    #[OA\Get(
        path: '/patient-transactions/{id}',
        operationId: 'patient-transactions.show',
        tags: ['Hospital (HIS)'],
        summary: 'Show one HIS transaction',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'The transaction', content: new OA\JsonContent(ref: '#/components/schemas/PatientTransaction')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Get(
        path: '/patient-transactions/{id}/guarantors',
        operationId: 'patient-transactions.guarantors.index',
        tags: ['Hospital (HIS)'],
        summary: 'List a transaction\'s guarantors',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'Guarantors', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientGuarantor')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function guarantors(): void {}
}

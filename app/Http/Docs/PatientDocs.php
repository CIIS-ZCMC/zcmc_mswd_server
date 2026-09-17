<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI documentation for App\Http\Controllers\PatientController.
 *
 * Not routed or instantiated — swagger-php reads the attributes only.
 */
final class PatientDocs
{
    #[OA\Get(
        path: '/patients',
        operationId: 'patients.index',
        tags: ['Patients'],
        summary: 'List patients',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/page'),
            new OA\Parameter(ref: '#/components/parameters/per_page'),
            new OA\Parameter(ref: '#/components/parameters/search'),
            new OA\Parameter(ref: '#/components/parameters/sort'),
            new OA\Parameter(ref: '#/components/parameters/direction'),
            new OA\Parameter(ref: '#/components/parameters/filter'),
            new OA\Parameter(ref: '#/components/parameters/trashed'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated patients', content: new OA\JsonContent(ref: '#/components/schemas/PatientCollection')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/patients',
        operationId: 'patients.store',
        tags: ['Patients'],
        summary: 'Create a patient',
        description: 'Requires the `patients.create` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientStoreRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created patient', content: new OA\JsonContent(ref: '#/components/schemas/Patient')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/patients/{patient}',
        operationId: 'patients.show',
        tags: ['Patients'],
        summary: 'Show a patient',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The patient', content: new OA\JsonContent(ref: '#/components/schemas/Patient')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/patients/{patient}',
        operationId: 'patients.update',
        tags: ['Patients'],
        summary: 'Update a patient',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientStoreRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated patient', content: new OA\JsonContent(ref: '#/components/schemas/Patient')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/patients/{patient}',
        operationId: 'patients.destroy',
        tags: ['Patients'],
        summary: 'Archive a patient (soft delete)',
        description: 'Requires the `patients.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

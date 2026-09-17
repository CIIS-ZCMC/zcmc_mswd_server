<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the patient merge/unmerge/restore and merge-history endpoints:
 * MergePatientController, UnmergePatientController, RestorePatientController,
 * PatientMergesController.
 */
final class PatientMergeDocs
{
    #[OA\Post(
        path: '/patients/{patient}/merge',
        operationId: 'patients.merge',
        tags: ['Patients'],
        summary: 'Merge a patient into another',
        description: 'Moves the source patient\'s records into the target and archives the source. Requires the `patients.merge` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, description: 'The source patient.', schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/MergePatientRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The merge record', content: new OA\JsonContent(ref: '#/components/schemas/PatientMerge')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function merge(): void {}

    #[OA\Post(
        path: '/patients/{patient}/unmerge',
        operationId: 'patients.unmerge',
        tags: ['Patients'],
        summary: 'Reverse a patient merge',
        description: 'Requires the `patients.merge` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The reversed merge record', content: new OA\JsonContent(ref: '#/components/schemas/PatientMerge')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function unmerge(): void {}

    #[OA\Post(
        path: '/patients/{id}/restore',
        operationId: 'patients.restore',
        tags: ['Patients'],
        summary: 'Restore an archived patient',
        description: 'Requires the `patients.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The restored patient', content: new OA\JsonContent(ref: '#/components/schemas/Patient')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function restore(): void {}

    #[OA\Get(
        path: '/patients/{patient}/merges',
        operationId: 'patients.merges',
        tags: ['Patients'],
        summary: 'List a patient\'s merge history',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Merge records', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientMerge')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function merges(): void {}
}

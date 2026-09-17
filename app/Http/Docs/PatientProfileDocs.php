<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the read-only patient aggregate endpoints:
 * PatientProfileController, PatientHistoryController, PatientDuplicatesController.
 * All require the `patients.view` permission.
 */
final class PatientProfileDocs
{
    #[OA\Get(
        path: '/patients/{patient}/profile',
        operationId: 'patients.profile',
        tags: ['Patients'],
        summary: 'The patient profile aggregate',
        description: 'The patient with sector, IDs, family, watchers, caretakers, cases, documents and latest case/assessment eager-loaded. Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The patient profile', content: new OA\JsonContent(ref: '#/components/schemas/Patient')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function profile(): void {}

    #[OA\Get(
        path: '/patients/{patient}/history',
        operationId: 'patients.history',
        tags: ['Patients'],
        summary: 'The patient\'s activity history',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Activity entries', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Activity')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function history(): void {}

    #[OA\Get(
        path: '/patients/{patient}/duplicates',
        operationId: 'patients.duplicates',
        tags: ['Patients'],
        summary: 'Candidate duplicate patients',
        description: 'Returns patients that look like duplicates of this one. Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Candidate duplicates', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Patient')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function duplicates(): void {}
}

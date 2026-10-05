<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the patient-level Socio-Economic module
 * (PatientSocioeconomicController, SocioeconomicProfileController). Independent of cases.
 */
final class PatientSocioeconomicDocs
{
    #[OA\Get(
        path: '/patients/{patient}/socioeconomic',
        operationId: 'patients.socioeconomic',
        tags: ['Socio-Economic'],
        summary: 'The patient\'s socio-economic overview',
        description: 'The live household (family members + 1), the current profile (the newest dated record: income, living conditions, list of expenses with ANNEX B slots, total and expense-to-income ratio, `household_changed`) and up to 10 records as history. `current` is null and `history` empty when nothing was recorded. Requires the `socioeconomic.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The overview', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'patient', type: 'object'),
                    new OA\Property(property: 'household', type: 'object'),
                    new OA\Property(property: 'current', type: 'object', nullable: true),
                    new OA\Property(property: 'history', type: 'array', items: new OA\Items(type: 'object')),
                ], type: 'object'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function overview(): void {}

    #[OA\Get(
        path: '/socioeconomic-profiles/{profile}',
        operationId: 'socioeconomicProfiles.show',
        tags: ['Socio-Economic'],
        summary: 'One dated socio-economic record',
        description: 'Requires the `socioeconomic.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'profile', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The record', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'object')])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Post(
        path: '/patients/{patient}/socioeconomic-profiles',
        operationId: 'socioeconomicProfiles.store',
        tags: ['Socio-Economic'],
        summary: 'Record a new dated socio-economic profile',
        description: 'Creates a record with nested `expenses[]` (`expense_type`, `amount`). The household size is snapshotted from the family members at record time and `recorded_by` is the signed-in user. Requires the `socioeconomic.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(type: 'object')),
        responses: [
            new OA\Response(response: 201, description: 'The created record', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'object')])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/socioeconomic-profiles/{profile}',
        operationId: 'socioeconomicProfiles.update',
        tags: ['Socio-Economic'],
        summary: 'Correct a socio-economic record',
        description: 'Partial update. When `expenses[]` is sent it replaces every line. The household-size snapshot is kept — record a new profile when the household changed. Requires the `socioeconomic.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'profile', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(type: 'object')),
        responses: [
            new OA\Response(response: 200, description: 'The updated record', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'object')])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/socioeconomic-profiles/{profile}',
        operationId: 'socioeconomicProfiles.destroy',
        tags: ['Socio-Economic'],
        summary: 'Delete a socio-economic record (soft delete)',
        description: 'Requires the `socioeconomic.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'profile', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

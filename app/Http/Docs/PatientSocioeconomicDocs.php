<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the patient-level List of Expenses module
 * (PatientSocioeconomicController, SocioeconomicProfileController). Independent of cases.
 */
final class PatientSocioeconomicDocs
{
    #[OA\Get(
        path: '/patients/{patient}/socioeconomic',
        operationId: 'patients.socioeconomic',
        tags: ['List of Expenses'],
        summary: 'The patient\'s socio-economic overview',
        description: 'The current record (the newest dated one: house/lot tenure and rent amount, light and water sources, an amount per expense item, the total expenses, and `income`: the patient's income, the family members' income and the other family income that make up `total_family_income`, with `balance`, `expense_to_income_ratio` and `income_changed`), `live_income` (the patient's and family members' income today, which the form pre-fills with) and up to 10 records as history. `current` is null and `history` empty when nothing was recorded. Requires the `socioeconomic.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The overview', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'current', type: 'object', nullable: true),
                    new OA\Property(property: 'live_income', type: 'object'),
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
        tags: ['List of Expenses'],
        summary: 'One dated List of Expenses record',
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
        tags: ['List of Expenses'],
        summary: 'Record a new dated List of Expenses',
        description: 'Fields: `recorded_on`, `house_tenure` (owned|rented) with `house_rent_amount` (kept only when rented), `light_source[]`, `water_source[]`, the amounts `food`, `transport`, `medical`, `insurance`, `education`, `clothing`, `house_help`, `others` (+ `others_specify`), `other_income_sources[]` (`source`, `amount`) and `remarks`. `recorded_by` is the signed-in user; the patient's and family members' income is snapshotted from their records and `total_family_income` is computed by the server (neither is accepted from the body). Requires the `socioeconomic.create` permission.',
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
        tags: ['List of Expenses'],
        summary: 'Correct a List of Expenses record',
        description: 'Partial update. The rent amount is cleared unless the house is rented. The family-income snapshot is kept; `total_family_income` is recomputed when `other_income_sources` is sent, and `refresh_income: true` re-reads the patient's and family members' income first. Record a new dated entry when the situation changed. Requires the `socioeconomic.update` permission.',
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
        tags: ['List of Expenses'],
        summary: 'Delete a List of Expenses record (soft delete)',
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

<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for PatientSocioeconomicController. Requires `intake.view`.
 */
final class PatientSocioeconomicDocs
{
    #[OA\Get(
        path: '/patients/{patient}/socioeconomic',
        operationId: 'patients.socioeconomic',
        tags: ['Patients'],
        summary: 'The patient\'s socio-economic profile and living conditions',
        description: 'Household figures, the newest intake assessment\'s income, classification (with a `stale` flag when the household changed since it was calculated), living conditions, problems and list of expenses (lines, ANNEX B slots, total, expense-to-income ratio), and up to 10 intake assessments for the trend. `current` is null and `history` empty when the patient has no intake assessment; cases promoted to the social case study report are excluded. Requires the `intake.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The socio-economic profile', content: new OA\JsonContent(properties: [
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
    public function show(): void {}
}

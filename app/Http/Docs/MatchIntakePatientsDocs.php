<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\MatchIntakePatientsController. Requires `intake.view`. */
final class MatchIntakePatientsDocs
{
    #[OA\Post(
        path: '/intake-sheets/match-patients',
        operationId: 'intake-sheets.match-patients',
        tags: ['Intake Sheets'],
        summary: 'Find candidate matching patients for an intake',
        description: 'Requires the `intake.view` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            type: 'object',
            description: 'Patient identifiers to match on (name, birthdate, ids).',
            additionalProperties: true,
        )),
        responses: [
            new OA\Response(response: 200, description: 'Candidate patients', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Patient')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function match(): void {}
}

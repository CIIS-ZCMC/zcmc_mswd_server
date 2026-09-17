<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\IntakeSheetHistoryController. Requires `intake.view`. */
final class IntakeSheetHistoryDocs
{
    #[OA\Get(
        path: '/intake-sheets/{intakeSheet}/history',
        operationId: 'intake-sheets.history',
        tags: ['Intake Sheets'],
        summary: 'An intake sheet\'s activity history',
        description: 'Requires the `intake.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intakeSheet', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Activity entries', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Activity')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function history(): void {}
}

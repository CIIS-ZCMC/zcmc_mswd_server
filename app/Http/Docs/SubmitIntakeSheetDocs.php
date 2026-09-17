<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\SubmitIntakeSheetController and
 * FinalizeIntakeSheetController. Submit requires `intake.update`;
 * finalize requires `intake.finalize`.
 */
final class SubmitIntakeSheetDocs
{
    #[OA\Post(
        path: '/intake-sheets/{intakeSheet}/submit',
        operationId: 'intake-sheets.submit',
        tags: ['Intake Sheets'],
        summary: 'Submit an intake sheet',
        description: 'Requires the `intake.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intakeSheet', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The submitted intake sheet', content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheet')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function submit(): void {}

    #[OA\Post(
        path: '/intake-sheets/{intakeSheet}/finalize',
        operationId: 'intake-sheets.finalize',
        tags: ['Intake Sheets'],
        summary: 'Finalize an intake sheet',
        description: 'Creates the patient/case/assessment records. Requires the `intake.finalize` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intakeSheet', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The finalized intake sheet', content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheet')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function finalize(): void {}
}

<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\IntakeSheetPdfController. Requires `intake.view`. */
final class IntakeSheetPdfDocs
{
    #[OA\Get(
        path: '/intake-sheets/{intakeSheet}/pdf',
        operationId: 'intake-sheets.pdf',
        tags: ['Intake Sheets'],
        summary: 'Download the intake sheet PDF',
        description: 'Requires the `intake.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intakeSheet', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The intake sheet PDF', content: new OA\MediaType(
                mediaType: 'application/pdf',
                schema: new OA\Schema(type: 'string', format: 'binary'),
            )),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function pdf(): void {}
}

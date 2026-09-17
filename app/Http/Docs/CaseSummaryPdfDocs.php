<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\CaseSummaryPdfController. Requires `cases.view`. */
final class CaseSummaryPdfDocs
{
    #[OA\Get(
        path: '/cases/{case}/summary-pdf',
        operationId: 'cases.summary-pdf',
        tags: ['Cases'],
        summary: 'Download the case summary PDF',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The case summary PDF', content: new OA\MediaType(
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

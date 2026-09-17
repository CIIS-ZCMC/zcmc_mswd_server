<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\SocialCasePdfController. Requires `cases.view`. */
final class SocialCasePdfDocs
{
    #[OA\Get(
        path: '/cases/{case}/social-case/pdf',
        operationId: 'cases.social-case.pdf',
        tags: ['Case Clinical'],
        summary: 'Download the social case study PDF',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The SCSR PDF', content: new OA\MediaType(
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

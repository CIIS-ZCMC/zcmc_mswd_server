<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\FinalizeSocialCaseController. Requires `cases.finalize_social_case`. */
final class FinalizeSocialCaseDocs
{
    #[OA\Post(
        path: '/cases/{case}/social-case/finalize',
        operationId: 'cases.social-case.finalize',
        tags: ['Case Clinical'],
        summary: 'Note (finalize) the social case study',
        description: 'Section-head level. Requires the `cases.finalize_social_case` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The finalized SCSR', content: new OA\JsonContent(ref: '#/components/schemas/SocialCase')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function finalize(): void {}
}

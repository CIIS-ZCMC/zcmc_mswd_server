<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\AmendSocialCaseController. Requires `cases.finalize_social_case`. */
final class AmendSocialCaseDocs
{
    #[OA\Post(
        path: '/cases/{case}/social-case/amend',
        operationId: 'cases.social-case.amend',
        tags: ['Case Clinical'],
        summary: 'Amend a noted social case study',
        description: 'Section-head level. Requires the `cases.finalize_social_case` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: false, content: new OA\JsonContent(ref: '#/components/schemas/SocialCaseRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The amended SCSR', content: new OA\JsonContent(ref: '#/components/schemas/SocialCase')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function amend(): void {}
}

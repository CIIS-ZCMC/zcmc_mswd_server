<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\SubmitSocialCaseController. Requires `cases.update`. */
final class SubmitSocialCaseDocs
{
    #[OA\Post(
        path: '/cases/{case}/social-case/submit',
        operationId: 'cases.social-case.submit',
        tags: ['Case Clinical'],
        summary: 'Submit the social case study for noting',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The submitted SCSR', content: new OA\JsonContent(ref: '#/components/schemas/SocialCase')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function submit(): void {}
}

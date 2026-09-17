<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\PromoteAssessmentToSocialCaseController. Requires `cases.update`. */
final class PromoteAssessmentToSocialCaseDocs
{
    #[OA\Post(
        path: '/assessments/{assessment}/promote-to-social-case',
        operationId: 'assessments.promote-to-social-case',
        tags: ['Case Clinical'],
        summary: 'Promote an assessment to a social case study',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assessment', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The social case study', content: new OA\JsonContent(ref: '#/components/schemas/SocialCase')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function promote(): void {}
}

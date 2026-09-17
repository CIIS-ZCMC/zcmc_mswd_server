<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\MyCaseloadController and
 * MyFollowUpsController — the signed-in worker's own worklists.
 * Both require the `cases.view` permission.
 */
final class MyCaseloadDocs
{
    #[OA\Get(
        path: '/my-caseload',
        operationId: 'my-caseload',
        tags: ['Cases'],
        summary: 'The signed-in worker\'s caseload',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Cases assigned to the current user', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Case')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function caseload(): void {}

    #[OA\Get(
        path: '/my-follow-ups',
        operationId: 'my-follow-ups',
        tags: ['Cases'],
        summary: 'The signed-in worker\'s open follow-ups',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Open follow-up progress notes', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/CaseProgressNote')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function followUps(): void {}
}

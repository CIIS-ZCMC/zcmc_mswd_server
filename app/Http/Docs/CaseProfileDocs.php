<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the read-only case aggregate endpoints:
 * CaseProfileController, CaseHistoryController, CaseActivitiesController.
 * All require the `cases.view` permission.
 */
final class CaseProfileDocs
{
    #[OA\Get(
        path: '/cases/{case}/profile',
        operationId: 'cases.profile',
        tags: ['Cases'],
        summary: 'The case profile aggregate',
        description: 'The case with patient, assigned user, watchers, counts and watcher status. Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The case profile', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function profile(): void {}

    #[OA\Get(
        path: '/cases/{case}/history',
        operationId: 'cases.history',
        tags: ['Cases'],
        summary: 'The case\'s activity-log history',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Activity entries', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Activity')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function history(): void {}

    #[OA\Get(
        path: '/cases/{case}/activities',
        operationId: 'cases.activities',
        tags: ['Cases'],
        summary: 'The case\'s activity timeline',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Case activities', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/CaseActivity')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function activities(): void {}
}

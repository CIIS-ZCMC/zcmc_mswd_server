<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\AssistanceHistoryController and
 * PatientAssistanceLogController. Both require the `assistance.view` permission.
 */
final class AssistanceHistoryDocs
{
    #[OA\Get(
        path: '/assistances/{assistance}/history',
        operationId: 'assistances.history',
        tags: ['Assistance'],
        summary: 'An assistance\'s activity history',
        description: 'Requires the `assistance.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
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
        path: '/assistances/{assistance}/logs',
        operationId: 'assistances.logs.index',
        tags: ['Assistance'],
        summary: 'An assistance\'s lifecycle logs',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Lifecycle logs', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssistanceLog')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function logs(): void {}
}

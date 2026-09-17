<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the assistance lifecycle transitions:
 * ApproveAssistanceController, ReleaseAssistanceController, CancelAssistanceController.
 * Approve/release require `assistance.approve`; cancel requires `assistance.update`.
 */
final class ApproveAssistanceDocs
{
    #[OA\Post(
        path: '/assistances/{assistance}/approve',
        operationId: 'assistances.approve',
        tags: ['Assistance'],
        summary: 'Approve an assistance',
        description: 'Requires the `assistance.approve` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The approved assistance', content: new OA\JsonContent(ref: '#/components/schemas/Assistance')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function approve(): void {}

    #[OA\Post(
        path: '/assistances/{assistance}/release',
        operationId: 'assistances.release',
        tags: ['Assistance'],
        summary: 'Release an assistance',
        description: 'Requires the `assistance.approve` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The released assistance', content: new OA\JsonContent(ref: '#/components/schemas/Assistance')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function release(): void {}

    #[OA\Post(
        path: '/assistances/{assistance}/cancel',
        operationId: 'assistances.cancel',
        tags: ['Assistance'],
        summary: 'Cancel an assistance',
        description: 'Requires the `assistance.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The cancelled assistance', content: new OA\JsonContent(ref: '#/components/schemas/Assistance')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function cancel(): void {}
}

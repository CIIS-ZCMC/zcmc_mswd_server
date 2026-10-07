<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the Library lists assessments store by code:
 * App\Http\Controllers\ModeOfAssistanceController and FundSourceController.
 */
final class LibraryDocs
{
    #[OA\Get(
        path: '/mode-of-assistances',
        operationId: 'modeOfAssistances.index',
        tags: ['Library'],
        summary: 'List modes of assistance',
        description: 'Ordered by sort order, then name. `?active=1` hides retired rows.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean'))],
        responses: [
            new OA\Response(response: 200, description: 'Modes of assistance', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssessmentLookup')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function modeOfAssistancesIndex(): void {}

    #[OA\Get(
        path: '/mode-of-assistances/{modeOfAssistance}',
        operationId: 'modeOfAssistances.show',
        tags: ['Library'],
        summary: 'Show a mode of assistance',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'modeOfAssistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The mode of assistance', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssessmentLookup'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function modeOfAssistancesShow(): void {}

    #[OA\Post(
        path: '/mode-of-assistances',
        operationId: 'modeOfAssistances.store',
        tags: ['Library'],
        summary: 'Add a mode of assistance',
        description: 'Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentLookupRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created mode of assistance', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssessmentLookup'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function modeOfAssistancesStore(): void {}

    #[OA\Put(
        path: '/mode-of-assistances/{modeOfAssistance}',
        operationId: 'modeOfAssistances.update',
        tags: ['Library'],
        summary: 'Rename, reorder, retire or reactivate a mode of assistance',
        description: 'Partial update. The code cannot change once an assessment stores it. Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'modeOfAssistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentLookupRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated mode of assistance', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssessmentLookup'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function modeOfAssistancesUpdate(): void {}

    #[OA\Delete(
        path: '/mode-of-assistances/{modeOfAssistance}',
        operationId: 'modeOfAssistances.destroy',
        tags: ['Library'],
        summary: 'Delete a mode of assistance (soft delete)',
        description: 'Assessments that store the code keep printing its name; new assessments can no longer pick it. Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'modeOfAssistance', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function modeOfAssistancesDestroy(): void {}

    #[OA\Get(
        path: '/fund-sources',
        operationId: 'fundSources.index',
        tags: ['Library'],
        summary: 'List fund sources',
        description: 'Ordered by sort order, then name. `?active=1` hides retired rows.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean'))],
        responses: [
            new OA\Response(response: 200, description: 'Fund sources', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssessmentLookup')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function fundSourcesIndex(): void {}

    #[OA\Get(
        path: '/fund-sources/{fundSource}',
        operationId: 'fundSources.show',
        tags: ['Library'],
        summary: 'Show a fund source',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'fundSource', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The fund source', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssessmentLookup'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function fundSourcesShow(): void {}

    #[OA\Post(
        path: '/fund-sources',
        operationId: 'fundSources.store',
        tags: ['Library'],
        summary: 'Add a fund source',
        description: 'Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentLookupRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created fund source', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssessmentLookup'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function fundSourcesStore(): void {}

    #[OA\Put(
        path: '/fund-sources/{fundSource}',
        operationId: 'fundSources.update',
        tags: ['Library'],
        summary: 'Rename, reorder, retire or reactivate a fund source',
        description: 'Partial update. The code cannot change once an assessment stores it. Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'fundSource', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentLookupRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated fund source', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssessmentLookup'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function fundSourcesUpdate(): void {}

    #[OA\Delete(
        path: '/fund-sources/{fundSource}',
        operationId: 'fundSources.destroy',
        tags: ['Library'],
        summary: 'Delete a fund source (soft delete)',
        description: 'Assessments that store the code keep printing its name; new assessments can no longer pick it. Requires the `library.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'fundSource', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function fundSourcesDestroy(): void {}
}

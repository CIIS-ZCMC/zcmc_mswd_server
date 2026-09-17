<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\SocialCaseController (show/store/update).
 * Read requires `cases.view`; create `cases.create`; update `cases.update`.
 */
final class SocialCaseDocs
{
    #[OA\Get(
        path: '/cases/{case}/social-case',
        operationId: 'cases.social-case.show',
        tags: ['Case Clinical'],
        summary: 'Show the social case study report',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The SCSR', content: new OA\JsonContent(ref: '#/components/schemas/SocialCase')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Post(
        path: '/cases/{case}/social-case',
        operationId: 'cases.social-case.store',
        tags: ['Case Clinical'],
        summary: 'Start the social case study report',
        description: 'Requires the `cases.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: false, content: new OA\JsonContent(ref: '#/components/schemas/SocialCaseRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created SCSR', content: new OA\JsonContent(ref: '#/components/schemas/SocialCase')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/cases/{case}/social-case',
        operationId: 'cases.social-case.update',
        tags: ['Case Clinical'],
        summary: 'Update the social case study report',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/SocialCaseRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated SCSR', content: new OA\JsonContent(ref: '#/components/schemas/SocialCase')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}
}

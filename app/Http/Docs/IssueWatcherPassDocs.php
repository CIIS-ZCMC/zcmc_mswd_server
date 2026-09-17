<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\IssueWatcherPassController. Requires `cases.update`. */
final class IssueWatcherPassDocs
{
    #[OA\Post(
        path: '/case-watchers/{caseWatcher}/issue-pass',
        operationId: 'case-watchers.issue-pass',
        tags: ['Cases'],
        summary: 'Issue a watcher pass',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'caseWatcher', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: false, content: new OA\JsonContent(properties: [
            new OA\Property(property: 'pass_valid_until', type: 'string', format: 'date', nullable: true),
        ])),
        responses: [
            new OA\Response(response: 200, description: 'The case watcher with the issued pass', content: new OA\JsonContent(ref: '#/components/schemas/CaseWatcher')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function issuePass(): void {}
}

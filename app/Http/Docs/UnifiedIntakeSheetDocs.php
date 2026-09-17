<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\UnifiedIntakeSheetController (apiResource).
 * Per-action permissions: intake.view (index/show), intake.create (store),
 * intake.update (update), intake.delete (destroy).
 */
final class UnifiedIntakeSheetDocs
{
    #[OA\Get(
        path: '/intake-sheets',
        operationId: 'intake-sheets.index',
        tags: ['Intake Sheets'],
        summary: 'List intake sheets',
        description: 'Requires the `intake.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/page'),
            new OA\Parameter(ref: '#/components/parameters/per_page'),
            new OA\Parameter(ref: '#/components/parameters/search'),
            new OA\Parameter(ref: '#/components/parameters/sort'),
            new OA\Parameter(ref: '#/components/parameters/direction'),
            new OA\Parameter(ref: '#/components/parameters/filter'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Paginated intake sheets', content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheetCollection')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/intake-sheets',
        operationId: 'intake-sheets.store',
        tags: ['Intake Sheets'],
        summary: 'Create an intake sheet',
        description: 'Requires the `intake.create` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheetRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created intake sheet', content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheet')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/intake-sheets/{intakeSheet}',
        operationId: 'intake-sheets.show',
        tags: ['Intake Sheets'],
        summary: 'Show an intake sheet',
        description: 'Requires the `intake.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intakeSheet', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The intake sheet', content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheet')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/intake-sheets/{intakeSheet}',
        operationId: 'intake-sheets.update',
        tags: ['Intake Sheets'],
        summary: 'Update an intake sheet',
        description: 'Requires the `intake.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intakeSheet', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheetRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated intake sheet', content: new OA\JsonContent(ref: '#/components/schemas/IntakeSheet')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/intake-sheets/{intakeSheet}',
        operationId: 'intake-sheets.destroy',
        tags: ['Intake Sheets'],
        summary: 'Delete an intake sheet',
        description: 'Requires the `intake.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'intakeSheet', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}

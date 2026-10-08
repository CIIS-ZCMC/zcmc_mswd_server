<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\DarEntryController and DarExportController:
 * the signed-in worker's Daily Accomplishment Report. Every route needs `dar.manage`
 * and only ever reaches the caller's own lines.
 */
#[OA\Schema(
    schema: 'DarEntry',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'entry_date', type: 'string', format: 'date'),
        new OA\Property(property: 'served_time', type: 'string', nullable: true, example: '09:30'),
        new OA\Property(property: 'activity', type: 'string', enum: ['interview', 'assessment', 'counseling', 'guarantee_assistance', 'referral', 'follow_up', 'home_ward_visit', 'documentation', 'other']),
        new OA\Property(property: 'activity_label', type: 'string'),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
        new OA\Property(property: 'patient', type: 'object', nullable: true, properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'name', type: 'string', example: 'Dela Cruz, Maria S.'),
            new OA\Property(property: 'hospital_id', type: 'integer', nullable: true),
            new OA\Property(property: 'mswd_id', type: 'string', nullable: true),
            new OA\Property(property: 'age', type: 'integer', nullable: true, description: 'As of the entry date.'),
            new OA\Property(property: 'sex', type: 'string', nullable: true),
            new OA\Property(property: 'address', type: 'string', nullable: true),
        ]),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ],
)]
#[OA\Schema(
    schema: 'DarEntryRequest',
    description: 'A registry patient (not deleted), a date no later than today, and an activity key. On update every field is optional.',
    properties: [
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'entry_date', type: 'string', format: 'date'),
        new OA\Property(property: 'served_time', type: 'string', nullable: true, example: '09:30'),
        new OA\Property(property: 'activity', type: 'string'),
        new OA\Property(property: 'remarks', type: 'string', maxLength: 500, nullable: true),
    ],
)]
final class DarDocs
{
    #[OA\Get(
        path: '/dar',
        operationId: 'dar.index',
        tags: ['DAR'],
        summary: "One day of the caller's Daily Accomplishment Report",
        description: 'Lines in the order served (untimed last), the day\'s totals, and the activity choices. Requires the `dar.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'date', in: 'query', required: false, description: 'Defaults to today.', schema: new OA\Schema(type: 'string', format: 'date'))],
        responses: [
            new OA\Response(response: 200, description: 'The day', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'date', type: 'string', format: 'date'),
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/DarEntry')),
                new OA\Property(property: 'summary', type: 'object', properties: [
                    new OA\Property(property: 'patients_served', type: 'integer'),
                    new OA\Property(property: 'entries', type: 'integer'),
                    new OA\Property(property: 'by_activity', type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'integer')),
                ]),
                new OA\Property(property: 'activities', type: 'object', description: 'key => label', additionalProperties: new OA\AdditionalProperties(type: 'string')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/dar-entries',
        operationId: 'dar-entries.store',
        tags: ['DAR'],
        summary: "Add a line to the caller's DAR",
        description: 'Requires the `dar.manage` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/DarEntryRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created line', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/DarEntry'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Patch(
        path: '/dar-entries/{entry}',
        operationId: 'dar-entries.update',
        tags: ['DAR'],
        summary: 'Edit a DAR line',
        description: 'Partial update. The owner only (403 otherwise). Requires the `dar.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'entry', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/DarEntryRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated line', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/DarEntry'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/dar-entries/{entry}',
        operationId: 'dar-entries.destroy',
        tags: ['DAR'],
        summary: 'Delete a DAR line (soft delete)',
        description: 'The owner only (403 otherwise). Requires the `dar.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'entry', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}

    #[OA\Get(
        path: '/dar/export',
        operationId: 'dar.export',
        tags: ['DAR'],
        summary: "Print or export one day of the caller's DAR",
        description: 'An A4 PDF with a Prepared-by block (default), or a CSV with `format=csv`. Requires the `dar.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'date', in: 'query', required: false, description: 'Defaults to today.', schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'format', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['pdf', 'csv'])),
            new OA\Parameter(name: 'download', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The DAR', content: [
                new OA\MediaType(mediaType: 'application/pdf', schema: new OA\Schema(type: 'string', format: 'binary')),
                new OA\MediaType(mediaType: 'text/csv', schema: new OA\Schema(type: 'string')),
            ]),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function export(): void {}
}

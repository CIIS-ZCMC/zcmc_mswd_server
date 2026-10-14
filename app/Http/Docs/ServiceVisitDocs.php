<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\ServiceVisitController: turnaround timing of
 * MSWD visits per HIS encounter. Every route needs `queue.manage`; every stamp comes
 * from the server clock.
 */
#[OA\Schema(
    schema: 'ServiceVisit',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'patient_id', type: 'integer'),
        new OA\Property(property: 'his_transaction_id', type: 'integer'),
        new OA\Property(property: 'status', type: 'string', enum: ['waiting', 'in_progress', 'completed', 'cancelled']),
        new OA\Property(property: 'purpose', type: 'string', nullable: true),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
        new OA\Property(property: 'arrived_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'started_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'completed_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'cancelled_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'cancel_reason', type: 'string', nullable: true),
        new OA\Property(property: 'waiting_minutes', type: 'integer', nullable: true, description: 'Arrival to start; counts up to now while waiting.'),
        new OA\Property(property: 'processing_minutes', type: 'integer', nullable: true, description: 'Start to completion; counts up to now while in progress.'),
        new OA\Property(property: 'total_minutes', type: 'integer', nullable: true, description: 'Arrival to completion (the turnaround time); null when cancelled.'),
        new OA\Property(
            property: 'within_target',
            type: 'object',
            properties: [
                new OA\Property(property: 'waiting', type: 'boolean', nullable: true),
                new OA\Property(property: 'processing', type: 'boolean', nullable: true),
                new OA\Property(property: 'total', type: 'boolean', nullable: true),
            ],
            description: 'Whether stage durations meet the Citizen\'s Charter targets. Null when cancelled or target is inactive.',
        ),
        new OA\Property(property: 'received_by', ref: '#/components/schemas/ServiceVisitUser', nullable: true),
        new OA\Property(property: 'served_by', ref: '#/components/schemas/ServiceVisitUser', nullable: true),
        new OA\Property(property: 'completed_by', ref: '#/components/schemas/ServiceVisitUser', nullable: true),
        new OA\Property(property: 'cancelled_by', ref: '#/components/schemas/ServiceVisitUser', nullable: true),
        new OA\Property(property: 'patient', type: 'object', nullable: true, description: 'Same shape as the DAR patient.'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ],
)]
#[OA\Schema(
    schema: 'ServiceVisitUser',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string', nullable: true),
    ],
)]
final class ServiceVisitDocs
{
    #[OA\Get(
        path: '/service-visits/queue',
        operationId: 'service-visits.queue',
        tags: ['Queue'],
        summary: "The day's queue board",
        description: 'Every open visit (waiting, in progress) whatever day it arrived, oldest first, and the visits completed on the day, newest first. Requires the `queue.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'date', in: 'query', required: false, description: 'Defaults to today.', schema: new OA\Schema(type: 'string', format: 'date'))],
        responses: [
            new OA\Response(response: 200, description: 'The board', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'date', type: 'string', format: 'date'),
                new OA\Property(property: 'waiting', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServiceVisit')),
                new OA\Property(property: 'in_progress', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServiceVisit')),
                new OA\Property(property: 'completed', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServiceVisit')),
                new OA\Property(property: 'summary', type: 'object', properties: [
                    new OA\Property(property: 'waiting', type: 'integer'),
                    new OA\Property(property: 'in_progress', type: 'integer'),
                    new OA\Property(property: 'completed', type: 'integer'),
                ]),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function queue(): void {}

    #[OA\Get(
        path: '/patients/{patient}/service-visits',
        operationId: 'service-visits.index',
        tags: ['Queue'],
        summary: "A patient's timed visits",
        description: 'Newest first. `?his_transaction_id=` narrows to one encounter. Requires the `queue.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'his_transaction_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The visits', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServiceVisit')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/patients/{patient}/service-visits',
        operationId: 'service-visits.store',
        tags: ['Queue'],
        summary: 'Time a patient in for a HIS encounter',
        description: 'Opens a waiting visit stamped now, received by the caller. 422 when the encounter already has an open visit. Requires the `queue.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['his_transaction_id'],
            properties: [
                new OA\Property(property: 'his_transaction_id', type: 'integer'),
                new OA\Property(property: 'purpose', type: 'string', maxLength: 120, nullable: true),
                new OA\Property(property: 'remarks', type: 'string', maxLength: 500, nullable: true),
            ],
        )),
        responses: [
            new OA\Response(response: 201, description: 'The waiting visit', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/ServiceVisit'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Post(
        path: '/service-visits/{visit}/start',
        operationId: 'service-visits.start',
        tags: ['Queue'],
        summary: 'Start serving a waiting patient',
        description: 'waiting → in_progress; the caller becomes `served_by`. 422 from any other status. Requires the `queue.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'visit', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The visit', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/ServiceVisit'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function start(): void {}

    #[OA\Post(
        path: '/service-visits/{visit}/complete',
        operationId: 'service-visits.complete',
        tags: ['Queue'],
        summary: 'Complete a visit in progress',
        description: 'in_progress → completed; stops the turnaround clock. 422 from any other status. Requires the `queue.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'visit', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: false, content: new OA\JsonContent(properties: [
            new OA\Property(property: 'remarks', type: 'string', maxLength: 500, nullable: true),
        ])),
        responses: [
            new OA\Response(response: 200, description: 'The visit', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/ServiceVisit'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function complete(): void {}

    #[OA\Post(
        path: '/service-visits/{visit}/cancel',
        operationId: 'service-visits.cancel',
        tags: ['Queue'],
        summary: 'Cancel an open visit',
        description: 'waiting or in_progress → cancelled, with a reason. Cancelled visits are left out of turnaround figures. Requires the `queue.manage` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'visit', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(
            required: ['cancel_reason'],
            properties: [new OA\Property(property: 'cancel_reason', type: 'string', maxLength: 255)],
        )),
        responses: [
            new OA\Response(response: 200, description: 'The visit', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/ServiceVisit'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function cancel(): void {}
}

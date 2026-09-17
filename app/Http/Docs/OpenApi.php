<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * Root OpenAPI metadata for the MSWD System API.
 *
 * This class is never instantiated or routed. It exists only so swagger-php
 * can scan its attributes. All per-endpoint documentation lives in the
 * `*Docs` classes in this namespace; the reusable request/response shapes
 * live under `App\Http\Docs\Schemas`.
 */
#[OA\Info(
    version: '1.0.0',
    title: 'MSWD System API',
    description: 'API documentation for the ZCMC MSWD System. All endpoints are '.
        'JSON and, except for login, require a Sanctum bearer token.',
)]
#[OA\Server(
    url: '/api',
    description: 'MSWD API',
)]
#[OA\SecurityScheme(
    securityScheme: 'sanctum',
    type: 'http',
    scheme: 'bearer',
    description: 'Sanctum personal access token, sent as `Authorization: Bearer <token>`.',
)]
#[OA\Tag(name: 'Auth', description: 'Authentication and the current session.')]
#[OA\Tag(name: 'Patients', description: 'Patient master records.')]
#[OA\Tag(name: 'Patient Records', description: 'Sub-records hanging off a patient (IDs, family, watchers, caretakers, documents).')]
#[OA\Tag(name: 'Hospital (HIS)', description: 'Read-only lookups against the hospital information system.')]
#[OA\Tag(name: 'Cases', description: 'Case management and lifecycle.')]
#[OA\Tag(name: 'Case Clinical', description: 'Assessments, social case studies, diagnostics, interventions and progress notes.')]
#[OA\Tag(name: 'Assistance', description: 'Case-scoped financial assistance and its lifecycle.')]
#[OA\Tag(name: 'Intake Sheets', description: 'Unified intake sheet workflow.')]
#[OA\Tag(name: 'Reference', description: 'Read-only reference lookups backing select inputs.')]
#[OA\Tag(name: 'Users & Roles', description: 'Users, roles and permissions.')]
#[OA\Tag(name: 'Reports', description: 'Reporting and exports.')]
#[OA\Tag(name: 'Audit', description: 'Activity log.')]
final class OpenApi
{
    //
}

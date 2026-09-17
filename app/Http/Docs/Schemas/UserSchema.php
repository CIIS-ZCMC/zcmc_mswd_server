<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * User, role and permission response shapes, plus the login request/response,
 * mirroring App\Http\Resources\{User,Role,Permission}Resource and LoginController.
 */
#[OA\Schema(
    schema: 'User',
    description: 'A system user (mirrored from the HR employee directory).',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'employee_id', type: 'integer', nullable: true),
        new OA\Property(property: 'employee_number', type: 'integer', example: 12345),
        new OA\Property(property: 'employee_name', type: 'string', example: 'Dela Cruz, Juan'),
        new OA\Property(property: 'email', type: 'string', format: 'email', nullable: true),
        new OA\Property(property: 'role', type: 'string', nullable: true),
        new OA\Property(property: 'roles', type: 'array', items: new OA\Items(type: 'string'), description: 'Role names (when loaded).'),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'Effective permission names (when roles/permissions loaded).'),
        new OA\Property(property: 'is_active', type: 'boolean', example: true),
        new OA\Property(property: 'synced_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'UserCollection',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/User')),
        new OA\Property(property: 'links', ref: '#/components/schemas/PaginationLinks'),
        new OA\Property(property: 'meta', ref: '#/components/schemas/PaginationMeta'),
    ],
)]
#[OA\Schema(
    schema: 'Role',
    description: 'A spatie role.',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'case-manager'),
        new OA\Property(property: 'guard_name', type: 'string', example: 'web'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'Permission names (when loaded).'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'Permission',
    description: 'A spatie permission.',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'patients.view'),
        new OA\Property(property: 'guard_name', type: 'string', example: 'web'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'LoginRequest',
    required: ['employee_number', 'password'],
    properties: [
        new OA\Property(property: 'employee_number', type: 'integer', example: 12345),
        new OA\Property(property: 'password', type: 'string', format: 'password', example: 'secret'),
        new OA\Property(property: 'device_name', type: 'string', maxLength: 255, example: 'web', description: 'Optional token label.'),
    ],
)]
#[OA\Schema(
    schema: 'LoginResponse',
    description: 'The authenticated user plus the issued bearer token.',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/User'),
        new OA\Property(property: 'token', type: 'string', example: '1|abcdef...'),
        new OA\Property(property: 'token_type', type: 'string', example: 'Bearer'),
    ],
)]
#[OA\Schema(
    schema: 'RoleStoreRequest',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255, example: 'case-manager'),
        new OA\Property(property: 'description', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'Permission names to assign.'),
    ],
)]
#[OA\Schema(
    schema: 'PermissionStoreRequest',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', maxLength: 255, example: 'patients.view'),
        new OA\Property(property: 'description', type: 'string', maxLength: 255, nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'SyncUserRolesRequest',
    required: ['roles'],
    properties: [
        new OA\Property(property: 'roles', type: 'array', items: new OA\Items(type: 'string'), description: 'The complete set of role names for the user.'),
    ],
)]
final class UserSchema
{
    //
}

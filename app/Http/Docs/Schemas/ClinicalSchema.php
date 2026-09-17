<?php

namespace App\Http\Docs\Schemas;

use OpenApi\Attributes as OA;

/**
 * Response and request shapes for the case clinical records: assessments and
 * their expenses, the social case study, diagnostics and reports, interventions
 * and progress notes.
 */
#[OA\Schema(
    schema: 'Assessment',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'parent_assessment_id', type: 'integer', nullable: true),
        new OA\Property(property: 'reassessment_reason', type: 'string', nullable: true),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true),
        new OA\Property(property: 'total_family_income', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'net_per_capita_income', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'calculated_classification', type: 'string', nullable: true),
        new OA\Property(property: 'classification', type: 'string', nullable: true),
        new OA\Property(property: 'classification_override_reason', type: 'string', nullable: true),
        new OA\Property(property: 'calculated_discount_rate', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'has_override', type: 'boolean'),
        new OA\Property(property: 'housing_type', type: 'string', nullable: true),
        new OA\Property(property: 'utilities_access', type: 'string', nullable: true),
        new OA\Property(property: 'social_case_status', type: 'string', nullable: true),
        new OA\Property(property: 'presenting_problem', type: 'string', nullable: true),
        new OA\Property(property: 'family_background', type: 'string', nullable: true),
        new OA\Property(property: 'social_functioning', type: 'string', nullable: true),
        new OA\Property(property: 'assessment_notes', type: 'string', nullable: true),
        new OA\Property(property: 'intervention_plan', type: 'string', nullable: true),
        new OA\Property(property: 'expenses', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssessmentExpense')),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssessmentRequest',
    properties: [
        new OA\Property(property: 'parent_assessment_id', type: 'integer', nullable: true),
        new OA\Property(property: 'reassessment_reason', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'classification', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'classification_override_reason', type: 'string', nullable: true),
        new OA\Property(property: 'total_family_income', type: 'number', format: 'float', minimum: 0, nullable: true),
        new OA\Property(property: 'housing_type', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'utilities_access', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'presenting_problem', type: 'string', nullable: true),
        new OA\Property(property: 'family_background', type: 'string', nullable: true),
        new OA\Property(property: 'social_functioning', type: 'string', nullable: true),
        new OA\Property(property: 'assessment_notes', type: 'string', nullable: true),
        new OA\Property(property: 'intervention_plan', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssessmentExpense',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'assessment_id', type: 'integer'),
        new OA\Property(property: 'expense_type', type: 'string'),
        new OA\Property(property: 'amount', type: 'number', format: 'float'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'AssessmentExpenseRequest',
    required: ['expense_type', 'amount'],
    properties: [
        new OA\Property(property: 'expense_type', type: 'string', maxLength: 255),
        new OA\Property(property: 'amount', type: 'number', format: 'float', minimum: 0),
    ],
)]
#[OA\Schema(
    schema: 'SocialCase',
    description: 'The Social Case Study Report (SCSR).',
    type: 'object',
    additionalProperties: true,
)]
#[OA\Schema(
    schema: 'SocialCaseRequest',
    description: 'Every narrative field is optional; the report is written over time.',
    properties: [
        new OA\Property(property: 'assessment_id', type: 'integer', nullable: true),
        new OA\Property(property: 'classification', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'total_family_income', type: 'number', format: 'float', minimum: 0, nullable: true),
        new OA\Property(property: 'housing_type', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'utilities_access', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'referral_source', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'reason_for_referral', type: 'string', nullable: true),
        new OA\Property(property: 'presenting_problem', type: 'string', nullable: true),
        new OA\Property(property: 'family_background', type: 'string', nullable: true),
        new OA\Property(property: 'medical_history', type: 'string', nullable: true),
        new OA\Property(property: 'social_functioning', type: 'string', nullable: true),
        new OA\Property(property: 'assessment_notes', type: 'string', nullable: true),
        new OA\Property(property: 'recommendation', type: 'string', nullable: true),
        new OA\Property(property: 'recommended_assistance', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'recommended_amount', type: 'number', format: 'float', minimum: 0, nullable: true),
        new OA\Property(property: 'intervention_plan', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'Diagnostic',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true),
        new OA\Property(property: 'diagnosis_name', type: 'string'),
        new OA\Property(property: 'diagnosis_description', type: 'string', nullable: true),
        new OA\Property(property: 'diagnosis_date', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'attending_physician', type: 'string', nullable: true),
        new OA\Property(property: 'facility_name', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'DiagnosticRequest',
    required: ['diagnosis_name'],
    properties: [
        new OA\Property(property: 'diagnosis_name', type: 'string', maxLength: 255),
        new OA\Property(property: 'diagnosis_description', type: 'string', nullable: true),
        new OA\Property(property: 'diagnosis_date', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'attending_physician', type: 'string', maxLength: 255, nullable: true),
        new OA\Property(property: 'facility_name', type: 'string', maxLength: 255, nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'DiagnosticReport',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'uploaded_by', type: 'integer', nullable: true),
        new OA\Property(property: 'diagnostic_id', type: 'integer'),
        new OA\Property(property: 'report_type', type: 'string'),
        new OA\Property(property: 'file_name', type: 'string'),
        new OA\Property(property: 'file_path', type: 'string'),
        new OA\Property(property: 'file_type', type: 'string'),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'DiagnosticReportRequest',
    description: 'Multipart upload.',
    required: ['report_type', 'file'],
    properties: [
        new OA\Property(property: 'report_type', type: 'string', maxLength: 255),
        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Max 10 MB.'),
        new OA\Property(property: 'remarks', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'Intervention',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true),
        new OA\Property(property: 'intervention_type_id', type: 'integer'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'date_given', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'outcome', type: 'string', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'InterventionRequest',
    required: ['intervention_type_id'],
    properties: [
        new OA\Property(property: 'intervention_type_id', type: 'integer'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'date_given', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'outcome', type: 'string', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'CaseProgressNote',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'case_id', type: 'integer'),
        new OA\Property(property: 'assessment_id', type: 'integer', nullable: true),
        new OA\Property(property: 'note_type', type: 'string', nullable: true),
        new OA\Property(property: 'note_date', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'narrative', type: 'string'),
        new OA\Property(property: 'follow_up_on', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'follow_up_done_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'has_open_follow_up', type: 'boolean'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'CaseProgressNoteRequest',
    required: ['narrative'],
    properties: [
        new OA\Property(property: 'note_type', type: 'string', nullable: true),
        new OA\Property(property: 'note_date', type: 'string', format: 'date', nullable: true),
        new OA\Property(property: 'narrative', type: 'string'),
        new OA\Property(property: 'follow_up_on', type: 'string', format: 'date', nullable: true),
    ],
)]
#[OA\Schema(
    schema: 'CaseDocumentRequest',
    description: 'Multipart upload.',
    required: ['document_type', 'file'],
    properties: [
        new OA\Property(property: 'document_type', type: 'string', maxLength: 255),
        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Max 10 MB.'),
    ],
)]
final class ClinicalSchema
{
    //
}

/**
 * Types for the Library Settings module (Lookups management).
 */

export interface LookupUsage {
  assessments?: number
  guarantee_lines?: number
  assistance_records?: number
}

export interface ApiAssessmentLookup {
  id: number
  name: string
  code: string
  is_active: boolean
  sort_order: number
  requires_specify?: boolean
  code_locked?: boolean
  usage_count?: number
  usage?: LookupUsage
  created_at?: string
  updated_at?: string
}

export interface AssessmentLookup {
  id: number
  name: string
  code: string
  isActive: boolean
  sortOrder: number
  requiresSpecify?: boolean
  codeLocked?: boolean
  usageCount: number
  usage?: {
    assessments?: number
    guaranteeLines?: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface ApiSaveAssessmentLookupPayload {
  name: string
  code: string
  requires_specify?: boolean
  is_active?: boolean
  sort_order?: number
}

export interface SaveAssessmentLookupInput {
  name: string
  code: string
  requiresSpecify?: boolean
  isActive?: boolean
  sortOrder?: number
}

export interface ApiAssistantType {
  id: number
  name: string
  code: string
  category: string
  category_label?: string
  description?: string | null
  is_active: boolean
  usage_count?: number
  usage?: {
    assistance_records?: number
    guarantee_lines?: number
  }
  created_at?: string
  updated_at?: string
}

export interface AssistantType {
  id: number
  name: string
  code: string
  category: string
  categoryLabel: string
  description: string | null
  isActive: boolean
  usageCount: number
  usage?: {
    assistanceRecords?: number
    guaranteeLines?: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface ApiSaveAssistantTypePayload {
  name: string
  code: string
  category: string
  description?: string | null
  is_active?: boolean
}

export interface SaveAssistantTypeInput {
  name: string
  code: string
  category: string
  description?: string | null
  isActive?: boolean
}

export interface ApiGuarantor {
  id: number
  name: string
  address?: string | null
  is_active: boolean
  usage_count?: number
  created_at?: string
  updated_at?: string
}

export interface Guarantor {
  id: number
  name: string
  address: string | null
  isActive: boolean
  usageCount: number
  createdAt?: string
  updatedAt?: string
}

export interface ApiSaveGuarantorPayload {
  name: string
  address?: string | null
  is_active?: boolean
}

export interface SaveGuarantorInput {
  name: string
  address?: string | null
  isActive?: boolean
}

export interface LookupOption {
  id?: number
  value: string
  label: string
  isActive?: boolean
  requiresSpecify?: boolean
}

export interface ApiDocumentType {
  id: number
  name: string
  is_active: boolean
  sort_order: number
  usage_count?: number
  created_at?: string
  updated_at?: string
}

/** A kind of patient document, picked on upload. */
export interface DocumentType {
  id: number
  name: string
  isActive: boolean
  sortOrder: number
  usageCount: number
  createdAt?: string
  updatedAt?: string
}

export interface ApiSaveDocumentTypePayload {
  name: string
  is_active?: boolean
  sort_order?: number
}

export interface SaveDocumentTypeInput {
  name: string
  isActive?: boolean
  sortOrder?: number
}

export type LibraryTabKey =
  | "guarantors"
  | "assistance-types"
  | "mode-of-assistance"
  | "fund-sources"
  | "document-types"
  | "signatories"
  | "turnaround-targets"

export interface ApiSignatory {
  id: number
  name: string
  title: string | null
  license_no?: string | null
  role: string
  role_label?: string
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

/** An officer printed on MSWD forms (e.g. the Acknowledgement Slip approver). */
export interface Signatory {
  id: number
  name: string
  title: string | null
  licenseNo: string | null
  role: string
  roleLabel: string
  isActive: boolean
  sortOrder: number
}

export interface ApiSaveSignatoryPayload {
  name: string
  title?: string | null
  license_no?: string | null
  role: string
  is_active?: boolean
}

export interface SaveSignatoryInput {
  name: string
  title?: string | null
  licenseNo?: string | null
  role: string
  isActive?: boolean
}

export interface ApiTurnaroundTarget {
  id: number
  stage: "waiting" | "processing" | "total" | string
  label: string
  description: string
  minutes: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface TurnaroundTarget {
  id: number
  stage: "waiting" | "processing" | "total" | string
  label: string
  description: string
  minutes: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ApiSaveTurnaroundTargetPayload {
  minutes?: number
  is_active?: boolean
}

export interface SaveTurnaroundTargetInput {
  minutes?: number
  isActive?: boolean
}

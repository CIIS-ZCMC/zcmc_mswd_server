import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  importHospitalPatient,
  type ImportHospitalPatientPayload,
} from "../api/hospital-patient-api"
import { PATIENTS_LIST_QUERY_KEY } from "@/features/patients/hooks/use-patients"
import { HOSPITAL_PATIENT_SEARCH_KEY } from "./use-hospital-patient-search"
import { patientDetailKeys } from "@/features/patients/hooks/use-patient-detail"
import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api-client"
import type { ApiPatient } from "@/features/patients/types/api.types"

export interface ImportHospitalPatientMutationParams {
  id: number | string
  payload?: ImportHospitalPatientPayload
}

export function useImportHospitalPatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: ImportHospitalPatientMutationParams) =>
      importHospitalPatient(id, payload),
    onSuccess: (patient: ApiPatient) => {
      // Invalidate sidebar patient list
      queryClient.invalidateQueries({ queryKey: PATIENTS_LIST_QUERY_KEY })
      // Invalidate all general patient queries
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      // Invalidate HIS search results so the row changes to "Registered"
      queryClient.invalidateQueries({ queryKey: HOSPITAL_PATIENT_SEARCH_KEY })
      // Invalidate the new patient's profile detail key
      queryClient.invalidateQueries({
        queryKey: patientDetailKeys(patient.id).profile,
      })

      const fullName = [patient.last_name, patient.first_name]
        .filter(Boolean)
        .join(", ")
      const mswdIdLabel = patient.mswd_id
        ? `MSWD ID: ${patient.mswd_id}`
        : `ID: ${patient.id}`

      toast.add({
        title: "Patient Imported",
        description: `Imported ${fullName} (${mswdIdLabel}) into MSWD registry.`,
        type: "success",
      })
    },
    onError: (error: Error) => {
      // A 422 (e.g. the HIS record has no hospital number) carries its reason
      // in the validation errors, not the generic message.
      const reason =
        error instanceof ApiError ? error.firstValidationMessage : undefined

      toast.add({
        title: "Import Failed",
        description:
          reason ||
          error.message ||
          "Failed to import patient from Hospital Information System.",
        type: "error",
      })
    },
  })
}

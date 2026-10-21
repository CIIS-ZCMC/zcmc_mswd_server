import type { PatientRecord } from "@/features/patients/types"
import type { Assessment } from "../types/assessment.types"

/** One row of the sheet's §II family table. */
export interface UisSheetPerson {
  key: string
  name: string
  relationship: string | null
  age: number | null
  sex: string | null
  civilStatus: string | null
  educationalAttainment: string | null
  occupation: string | null
  monthlyIncome: number | null
}

/** Sections I and II of the sheet, whatever they were read from. */
export interface UisSheetData {
  /** true when these are the values the intake froze, not today's record. */
  frozen: boolean
  fullName: string | null
  hospitalNo: string | null
  mswdNo: string | null
  age: number | null
  sex: string | null
  civilStatus: string | null
  birthDate: string | null
  placeOfBirth: string | null
  philHealthNo: string | null
  educationalAttainment: string | null
  occupation: string | null
  contactNo: string | null
  permanentAddress: string | null
  familyMembers: UisSheetPerson[]
  householdSize: number
}

function blankToNull(value: string | null | undefined): string | null {
  return value === null || value === undefined || value === "" ? null : value
}

/**
 * The patient side of the sheet, as the printed form reads it: the copy the
 * intake froze when there is one, today's patient record otherwise (a case with
 * no intake, or a row from before snapshots existed).
 *
 * Mirrors UisSnapshotService::sheetData() on the server, so this sheet and the
 * PDF cannot disagree — the same reason the expense slots are computed in one
 * place. See docs/UIS_SNAPSHOT_PLAN.md.
 */
export function uisSheetData(
  assessment: Assessment | null,
  patient: PatientRecord,
  liveHouseholdSize: number
): UisSheetData {
  const snapshot = assessment?.uisSnapshot

  if (snapshot) {
    const p = snapshot.patient

    return {
      frozen: true,
      fullName: p.fullName,
      hospitalNo: p.hospitalId === null ? null : String(p.hospitalId),
      mswdNo: p.mswdId,
      age: p.age,
      sex: p.sex,
      civilStatus: p.civilStatus,
      birthDate: p.birthdate,
      placeOfBirth: p.placeOfBirth,
      philHealthNo: p.philhealthNo,
      educationalAttainment: p.educationalAttainment,
      occupation: p.occupation,
      contactNo: p.contactNumber,
      permanentAddress: p.permanentAddress ?? p.presentAddress,
      familyMembers: snapshot.familyMembers.map((member, index) => ({
        // The frozen rows carry no id: a member deleted since would have none.
        key: `frozen-${index}`,
        name: member.name ?? "—",
        relationship: member.relationship,
        age: member.age,
        sex: member.sex,
        civilStatus: member.civilStatus,
        educationalAttainment: member.educationalAttainment,
        occupation: member.occupation,
        monthlyIncome: member.monthlyIncome,
      })),
      householdSize: snapshot.householdSize,
    }
  }

  return {
    frozen: false,
    fullName: blankToNull(patient.fullName),
    hospitalNo: blankToNull(patient.hospitalNo),
    mswdNo: blankToNull(patient.mswdNo),
    age: patient.age ?? null,
    sex: blankToNull(patient.gender),
    civilStatus: blankToNull(patient.civilStatus),
    birthDate: blankToNull(patient.birthDate),
    placeOfBirth: blankToNull(patient.placeOfBirth),
    philHealthNo: blankToNull(patient.philHealthNo),
    educationalAttainment: blankToNull(patient.educationalAttainment),
    occupation: blankToNull(patient.occupation),
    contactNo: blankToNull(patient.contactNo),
    permanentAddress:
      blankToNull(patient.permanentAddress) ?? blankToNull(patient.address),
    familyMembers: (patient.familyMembers ?? []).map((member) => ({
      key: member.id,
      name: member.fullName,
      relationship: blankToNull(member.relationship),
      age: member.age ?? null,
      sex: blankToNull(member.sex),
      civilStatus: blankToNull(member.civilStatus),
      educationalAttainment: blankToNull(member.educationalAttainment),
      occupation: blankToNull(member.occupation),
      monthlyIncome: member.monthlyIncome ?? null,
    })),
    householdSize: liveHouseholdSize,
  }
}

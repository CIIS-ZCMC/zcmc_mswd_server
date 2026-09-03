<?php

namespace App\DTOs;

class PatientDto
{
    public function __construct(
        public readonly ?int $sector_id = null,
        public readonly ?int $hospital_id = null,
        public readonly ?int $mswd_id = null,
        public readonly ?string $first_name = null,
        public readonly ?string $last_name = null,
        public readonly ?string $middle_name = null,
        public readonly ?string $extension_name = null,
        public readonly ?string $birthdate = null,
        public readonly ?int $estimated_age = null,
        public readonly ?string $sex = null,
        public readonly ?string $civil_status = null,
        public readonly ?string $address = null,
        public readonly ?string $barangay = null,
        public readonly ?string $municipality = null,
        public readonly ?string $province = null,
        public readonly ?string $contact_number = null,
        public readonly ?string $religion = null,
        public readonly ?string $nationality = null,
        public readonly ?string $place_of_birth = null,
        public readonly ?string $permanent_address = null,
        public readonly ?string $present_address = null,
        public readonly ?string $educational_attainment = null,
        public readonly ?string $occupation = null,
        public readonly ?string $employer = null,
        public readonly ?float $monthly_income = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            sector_id: $data['sector_id'] ?? null,
            hospital_id: $data['hospital_id'] ?? null,
            mswd_id: $data['mswd_id'] ?? null,
            first_name: $data['first_name'] ?? null,
            last_name: $data['last_name'] ?? null,
            middle_name: $data['middle_name'] ?? null,
            extension_name: $data['extension_name'] ?? null,
            birthdate: $data['birthdate'] ?? null,
            estimated_age: $data['estimated_age'] ?? null,
            sex: $data['sex'] ?? null,
            civil_status: $data['civil_status'] ?? null,
            address: $data['address'] ?? null,
            barangay: $data['barangay'] ?? null,
            municipality: $data['municipality'] ?? null,
            province: $data['province'] ?? null,
            contact_number: $data['contact_number'] ?? null,
            religion: $data['religion'] ?? null,
            nationality: $data['nationality'] ?? null,
            place_of_birth: $data['place_of_birth'] ?? null,
            permanent_address: $data['permanent_address'] ?? null,
            present_address: $data['present_address'] ?? null,
            educational_attainment: $data['educational_attainment'] ?? null,
            occupation: $data['occupation'] ?? null,
            employer: $data['employer'] ?? null,
            monthly_income: $data['monthly_income'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'sector_id' => $this->sector_id,
            'hospital_id' => $this->hospital_id,
            'mswd_id' => $this->mswd_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'middle_name' => $this->middle_name,
            'extension_name' => $this->extension_name,
            'birthdate' => $this->birthdate,
            'estimated_age' => $this->estimated_age,
            'sex' => $this->sex,
            'civil_status' => $this->civil_status,
            'address' => $this->address,
            'barangay' => $this->barangay,
            'municipality' => $this->municipality,
            'province' => $this->province,
            'contact_number' => $this->contact_number,
            'religion' => $this->religion,
            'nationality' => $this->nationality,
            'place_of_birth' => $this->place_of_birth,
            'permanent_address' => $this->permanent_address,
            'present_address' => $this->present_address,
            'educational_attainment' => $this->educational_attainment,
            'occupation' => $this->occupation,
            'employer' => $this->employer,
            'monthly_income' => $this->monthly_income,
        ], fn ($value) => $value !== null);
    }
}

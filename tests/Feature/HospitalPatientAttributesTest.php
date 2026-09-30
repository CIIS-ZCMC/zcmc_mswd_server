<?php

use App\Models\Bizbox\HospitalPatient;
use App\Models\Bizbox\PatientPersonalData;

function fakeHospitalPatient(int $key = 5, int $patid = 777): HospitalPatient
{
    $personal = (new PatientPersonalData)->forceFill([
        'firstname' => 'Pedro', 'lastname' => 'Santos', 'middlename' => 'M',
        'gender' => 'Male', 'birthdate' => '1975-03-02', 'civilstatus' => 'S',
    ]);

    $hp = (new HospitalPatient)->forceFill(['PK_emdPatients' => $key, 'patid' => $patid]);
    $hp->setRelation('personalData', $personal);

    return $hp;
}

it('maps a HIS record onto patient attributes', function () {
    expect(fakeHospitalPatient()->toPatientAttributes())->toMatchArray([
        'hospital_id' => 777,
        'first_name' => 'Pedro',
        'last_name' => 'Santos',
        'middle_name' => 'M',
        'sex' => 'male',
        'birthdate' => '1975-03-02',
        'civil_status' => 'Single',
    ]);
});

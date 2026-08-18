<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class PatientRegister extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'psPatRegisters';

    protected $primaryKey = 'PK_psPatRegisters';

    public $timestamps = false;

    public function patient()
    {
        return $this->belongsTo(HospitalPatient::class, 'FK_emdPatients');
    }
}

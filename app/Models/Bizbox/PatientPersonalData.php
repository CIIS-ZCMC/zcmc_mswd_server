<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class PatientPersonalData extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'psPersonaldata';

    protected $primaryKey = 'PK_psPersonalData';

    public $timestamps = false;

    public function patient()
    {
        return $this->belongsTo(HospitalPatient::class, 'PK_emdPatients');
    }
}

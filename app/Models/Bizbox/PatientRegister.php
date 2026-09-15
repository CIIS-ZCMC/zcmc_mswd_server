<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class PatientRegister extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'psPatRegisters';

    protected $primaryKey = 'PK_psPatRegisters';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];


    public function patient()
    {
        return $this->belongsTo(HospitalPatient::class, 'FK_emdPatients');
    }

    public function guarantors()
    {
        return $this->hasMany(PatientGuarantors::class, 'FK_psPatRegisters');
    }
}

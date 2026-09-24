<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class PatientTransaction extends Model
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

    /**
     * The lookup vocabularies a transaction points at, eager-loaded by the
     * repository. The eight FK column names are verified against the live Bizbox
     * schema (see docs/TRANSACTION_MODULE_PLAN.md §C), so the repository loads
     * these relations with a plain with() — no column guard needed.
     *
     * @var list<string>
     */
    public const LOOKUPS = [
        'hospitalPlan',
        'discount',
        'serviceType',
        'caseType',
        'membership',
        'transactionType',
        'admissionResult',
    ];

    public function patient()
    {
        return $this->belongsTo(HospitalPatient::class, 'FK_emdPatients');
    }

    public function guarantors()
    {
        return $this->hasMany(PatientGuarantors::class, 'FK_psPatRegisters');
    }

    public function hospitalPlan()
    {
        return $this->belongsTo(HospitalPlan::class, 'FK_mscHospPlan', 'PK_mscHospPlan');
    }

    public function discount()
    {
        return $this->belongsTo(Discount::class, 'FK_mscDiscounts', 'PK_mscDiscounts');
    }

    public function serviceType()
    {
        return $this->belongsTo(ServiceType::class, 'FK_mscServiceType', 'PK_mscServiceType');
    }

    public function caseType()
    {
        return $this->belongsTo(HospitalCaseType::class, 'FK_mscHospCaseTypes', 'PK_mscHospCaseTypes');
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class, 'FK_mscPHICMemberships', 'PK_mscPHICMemberships');
    }

    /**
     * The kind of encounter this is. Named transactionType(), not transaction():
     * on a class already called PatientTransaction the bare name would read as
     * "the transaction of this transaction", and PatientGuarantors::transaction()
     * already uses that word for the encounter itself.
     */
    public function transactionType()
    {
        return $this->belongsTo(TransactionType::class, 'FK_mscHospTranTypes', 'PK_mscHospTranTypes');
    }

    public function admissionResult()
    {
        return $this->belongsTo(AdmissionResult::class, 'FK_mscAdmResults', 'PK_mscAdmResults');
    }
}

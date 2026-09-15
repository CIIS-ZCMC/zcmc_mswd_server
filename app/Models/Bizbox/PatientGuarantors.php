<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only view of the hospital's guarantor ledger (psGntrLedgers). A row ties
 * one registration to the psDataCenter entity standing as its guarantor; the
 * guarantor's name lives on that entity, not here.
 */
class PatientGuarantors extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'psGntrLedgers';

    protected $primaryKey = 'PK_TRXNO';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];

    /**
     * The psDataCenter entity standing as guarantor on this ledger row.
     */
    public function account()
    {
        return $this->belongsTo(DataCenter::class, 'FK_faCustomers', 'PK_psDatacenter');
    }

    public function transaction()
    {
        return $this->belongsTo(PatientTransaction::class, 'FK_psPatRegisters', 'PK_psPatRegisters');
    }
}

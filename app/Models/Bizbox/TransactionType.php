<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class TransactionType extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'mscHospTranTypes';

    protected $primaryKey = 'PK_mscHospTranTypes';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}

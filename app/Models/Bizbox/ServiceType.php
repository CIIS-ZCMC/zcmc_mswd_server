<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class ServiceType extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'mscServiceType';

    protected $primaryKey = 'PK_mscServiceType';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}

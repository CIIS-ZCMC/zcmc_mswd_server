<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class Membership extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'mscPHICMemberships';

    protected $primaryKey = 'PK_mscPHICMemberships';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only view of a patient record living in the hospital's SQL Server
 * database (the HIS). This app never writes to it — only `get` and `find`.
 *
 * Adjust $table, $primaryKey and the Resource mapping to match the actual
 * HIS schema; the defaults below are placeholders.
 */
class HospitalPatient extends Model
{
    /**
     * Resolve against the SQL Server connection defined in config/database.php.
     */
    protected $connection = 'sqlsrv';

    protected $table = 'patients';

    protected $primaryKey = 'id';

    /**
     * The HIS table is not managed by this app's migrations.
     */
    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}

<?php

namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;

interface PatientRepositoryInterface extends RepositoryInterface
{
    /**
     * Find potential duplicate patients by identity (name + birthdate),
     * using the [last_name, first_name, birthdate] index.
     */
    public function matchByIdentity(string $lastName, string $firstName, ?string $birthdate = null): Collection;
}

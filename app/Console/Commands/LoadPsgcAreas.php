<?php

namespace App\Console\Commands;

use App\Services\PsgcCatalogService;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * Loads the PSGC data file into `psgc_areas`. Needs no internet, so it runs on
 * every deploy after `migrate`. docs/PSGC_ADDRESS_PLAN.md.
 */
class LoadPsgcAreas extends Command
{
    protected $signature = 'psgc:load {--file= : A PSGC data file other than database/data/psgc.json.gz}';

    protected $description = 'Load the Philippine Standard Geographic Code areas into the database';

    public function handle(PsgcCatalogService $psgc): int
    {
        try {
            $result = $psgc->load($this->option('file') ?: null);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Loaded {$result['loaded']} PSGC areas; retired {$result['retired']} no longer listed.");

        return self::SUCCESS;
    }
}

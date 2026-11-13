<?php

namespace App\Console\Commands;

use App\Services\PsgcCatalogService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Refreshes database/data/psgc.json.gz from PSGC Cloud and loads it. Run by
 * hand, where the internet is reachable, when PSA publishes an update; commit
 * the new file so every server gets it through `psgc:load`.
 */
class SyncPsgcAreas extends Command
{
    protected $signature = 'psgc:sync
        {--no-load : Only rewrite the data file}
        {--delay=550 : Milliseconds between barangay requests (PSGC Cloud allows 120 a minute)}';

    protected $description = 'Fetch the Philippine Standard Geographic Code from PSGC Cloud into the data file, then load it';

    public function handle(PsgcCatalogService $psgc): int
    {
        $this->info('Fetching from '.config('services.psgc.base_url').' (about 1,700 requests, roughly 15 minutes)…');

        try {
            $rows = $psgc->fetch(
                fn (string $step) => $this->output->isVerbose() ? $this->line($step) : null,
                (int) $this->option('delay'),
            );
        } catch (Throwable $e) {
            $this->error('PSGC Cloud could not be read: '.$e->getMessage());

            return self::FAILURE;
        }

        $psgc->write($rows);
        $this->info('Wrote '.count($rows).' areas to '.PsgcCatalogService::defaultPath().'.');

        if (! $this->option('no-load')) {
            $result = $psgc->load();
            $this->info("Loaded {$result['loaded']} areas; retired {$result['retired']}.");
        }

        return self::SUCCESS;
    }
}

<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The 422 a guarded transition throws when a case's watcher requirement is
 * unmet. Carries the same watcher_status shape GET /cases/{case}/profile
 * and GET /cases/{case}/watcher-status expose, so the client can key its
 * banner off one shape everywhere. See docs/WATCHER_LOGIC_PLAN.md §5.
 */
class WatcherRequirementNotSatisfiedException extends RuntimeException
{
    /**
     * @param  array{requirement: string, has_primary: bool, satisfied: bool, blocking: bool}  $watcherStatus
     */
    public function __construct(string $action, protected array $watcherStatus)
    {
        parent::__construct("This case requires a registered watcher before it can {$action}.");
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'errors' => [
                'watcher' => [$this->getMessage()],
            ],
            'watcher_status' => $this->watcherStatus,
        ], 422);
    }
}
